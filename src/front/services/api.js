import * as Sentry from '@sentry/react-native';
import commonConfig from 'common/config';
import useAuth from '../auth/context';
import config from '../services/config';
import myFetch from './fetch';

// this FormData class is NOT the same class as in the browser
// ref: https://github.com/facebook/react-native/blob/main/Libraries/Network/FormData.js
export function getFormData(submitValues) {
  const formData = new FormData();

  for (let key in submitValues) {
    const value = submitValues[key];

    formData.append(key, value);
  }

  return formData;
}

export function useAPI() {
  const { getBearerToken } = useAuth();

  async function makeRequest(method, route, data, isFormData = false) {
    let token;
    try {
      token = await getBearerToken();
    } catch (error) {
      Sentry.captureException(error);
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
      Sentry.captureException(error);
      throw error;
    }

    if (responseJson.error) {
      throw new Error(responseJson.error);
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

  async function postReport(submitValues, reportType) {
    const formData = getFormData(submitValues);

    return await post(`reports/${reportType}`, formData, true, 1000 * 60);
  }

  async function postRoute(submitValues) {
    return await post('routes/route', submitValues, false, 1000 * 60 * 5);
  }

  async function deleteAccount() {
    return await makeRequest('DELETE', 'user/delete', null);
  }

  return { post, get, postReport, postRoute, deleteAccount };
}
