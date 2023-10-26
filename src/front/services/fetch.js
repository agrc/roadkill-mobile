/**
 * Inspired by ky. I would be using ky but it doesn't support react-native.
 *
 * Ref: https://github.com/sindresorhus/ky/issues/502#issuecomment-1518702885
 */

/**
 * myFetch
 * @param {string} url The URL to fetch
 * @param {object} options The options to pass to the fetch call
 * @param {boolean} parseJson Set to true if you want the response to be parsed as json
 * @returns object
 */
export default async function myFetch(url, options, parseJson) {
  class HTTPError extends Error {}

  const fetchOptions = { ...options };
  if (options.json) {
    fetchOptions.body = JSON.stringify(options.json);
    fetchOptions.headers = {
      ...fetchOptions.headers,
      'content-type': 'application/json',
    };
    delete fetchOptions.json;
  }

  if (options.searchParams) {
    url += `?${new URLSearchParams(options.searchParams)}`;
    delete fetchOptions.searchParams;
  }

  const response = await fetch(url, fetchOptions);
  console.log('response', JSON.stringify(response, null, 2));

  if (!response.ok) {
    let errorText;
    try {
      errorText = await response.text();
    } catch {
      errorText = response.statusText;
    }
    throw new HTTPError(`Fetch error: status code: ${response.status} text: ${errorText}`);
  }

  if (parseJson) {
    return await response.json();
  }

  return response;
}
