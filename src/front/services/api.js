import commonConfig from 'common/config';
import ky from 'ky';
import * as Sentry from 'sentry-expo';
import useAuth from '../auth/context';
import config from '../services/config';

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
    const options = {
      headers: {
        Authorization: await getBearerToken(),
        [commonConfig.versionHeaderName]: commonConfig.apiVersion,
      },
      timeout: config.API_REQUEST_TIMEOUT, // give cloud run time to spin up especially in dev project
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
      responseJson = await ky(`${config.API}/${route}`, options).json();
    } catch (error) {
      Sentry.Native.captureException(error);
      throw error;
    }

    if (responseJson.error) {
      throw new Error(responseJson.error);
    } else {
      return responseJson;
    }
  }

  async function post(route, data, isFormData = false) {
    return await makeRequest('POST', route, data, isFormData);
  }

  async function get(route, data) {
    return await makeRequest('GET', route, data);
  }

  async function postReport(submitValues, reportType) {
    const formData = getFormData(submitValues);

    return await post(`reports/${reportType}`, formData, true);
  }

  async function postRoute(submitValues) {
    return await post('routes/route', submitValues, false);
  }

  async function deleteAccount() {
    return await makeRequest('DELETE', 'user/delete', null);
  }

  return { post, get, postReport, postRoute, deleteAccount };
}
