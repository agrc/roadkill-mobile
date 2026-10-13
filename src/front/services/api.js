import * as Sentry from '@sentry/react-native';
import commonConfig from 'common/config';
import { File } from 'expo-file-system';
import useAuth from '../auth/context';
import config from '../services/config';
import myFetch from './fetch';

// this FormData class is NOT the same class as in the browser
// ref: https://github.com/facebook/react-native/blob/main/Libraries/Network/FormData.js
export function getFormData(submitValues) {
  const formData = new FormData();

  for (let key in submitValues) {
    const value = submitValues[key];

    // expo/fetch (the global fetch since expo sdk 56) cannot encode react
    // native's { uri, type, name } file parts, so send the file itself
    if (value && typeof value === 'object' && typeof value.uri === 'string') {
      formData.append(key, new File(value.uri));
    } else {
      formData.append(key, value);
    }
  }

  return formData;
}

const isExpectedAuthError = (error) =>
  ['AUTH_REQUIRED', 'AUTH_CANCELLED', 'SESSION_CHANGED', 'OWNER_MISMATCH'].includes(
    error?.code,
  ) ||
  (error?.status === 401 && error?.data?.error === 'invalid_token') ||
  (error?.status === 403 &&
    error?.data?.error === 'registration_required');

const captureUnexpectedError = (error) => {
  if (isExpectedAuthError(error) || error.__sentryCaptured) return;

  error.__sentryCaptured = true;
  Sentry.captureException(error);
};

export function useAPI() {
  const {
    getBearerToken,
    getSessionSnapshot,
    isSessionCurrent,
    handleAPIError,
  } = useAuth();

  async function makeRequest(
    method,
    route,
    data,
    isFormData = false,
    expectedSession = null,
  ) {
    let token;
    let sessionSnapshot;
    try {
      sessionSnapshot = expectedSession ?? getSessionSnapshot();
      token = await getBearerToken(sessionSnapshot);
      if (typeof token !== 'string' || !/\bBearer\s+\S+$/i.test(token.trim())) {
        const error = new Error('A usable authorization token is required.');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }

      if (
        !sessionSnapshot ||
        !isSessionCurrent(sessionSnapshot) ||
        (expectedSession && !isSessionCurrent(expectedSession))
      ) {
        const error = new Error('The sign-in session changed before the request.');
        error.code = 'SESSION_CHANGED';
        throw error;
      }
    } catch (error) {
      captureUnexpectedError(error);
      throw error;
    }

    const options = {
      headers: {
        Authorization: token,
        [commonConfig.versionHeaderName]: commonConfig.apiVersion,
      },
      method,
    };
    if (data) {
      if (isFormData) {
        options.body = data;
      } else {
        options.json = data;
      }
    }

    let responseJson;
    try {
      responseJson = await myFetch(`${config.API}/${route}`, options, true);
    } catch (error) {
      const isRecoveryResponse =
        (error?.status === 401 && error?.data?.error === 'invalid_token') ||
        (error?.status === 403 &&
          error?.data?.error === 'registration_required');
      if (isRecoveryResponse) handleAPIError(error, sessionSnapshot);
      captureUnexpectedError(error);
      throw error;
    }

    if (responseJson.error) {
      const error = new Error(responseJson.error);
      error.data = responseJson;
      throw error;
    } else {
      return responseJson;
    }
  }

  async function post(route, data, isFormData = false, timeout) {
    return await makeRequest('POST', route, data, isFormData, timeout);
  }

  async function get(route, data) {
    return await makeRequest('GET', route, data);
  }

  async function postReport(submitValues, reportType, expectedSession = null) {
    const formData = getFormData(submitValues);

    return await makeRequest(
      'POST',
      `reports/${reportType}`,
      formData,
      true,
      expectedSession,
    );
  }

  async function postRoute(submitValues, expectedSession = null) {
    return await makeRequest(
      'POST',
      'routes/route',
      submitValues,
      false,
      expectedSession,
    );
  }

  async function deleteAccount() {
    return await makeRequest('DELETE', 'user/delete', null);
  }

  return { post, get, postReport, postRoute, deleteAccount };
}
