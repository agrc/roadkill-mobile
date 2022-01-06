import ky from 'ky';
import * as Sentry from 'sentry-expo';
import useAuth from '../auth/context';
import config from '../services/config';

export function useAPI() {
  const { getBearerToken } = useAuth();

  async function makeRequest(method, route, data, isFormData = false) {
    const options = {
      headers: {
        Authorization: await getBearerToken(),
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
    // TODO: cache data for later submission if request fails
    return await makeRequest('POST', route, data, isFormData);
  }

  async function get(route, data) {
    return await makeRequest('GET', route, data);
  }

  return { post, get };
}
