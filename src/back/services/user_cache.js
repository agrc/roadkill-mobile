import commonConfig from 'common/config.js';
import jwt_decode from 'jwt-decode';
import { firestore } from './clients.js';

// datastore doc shape:
/*
path: <token.sub>
value: {
  userId: string
  token: string
  exp: <token.exp>
  refreshToken: string (only for apple provider)
}
*/
export async function getCachedUser(token, authProvider) {
  const decodedInputToken = jwt_decode(token);

  const document = await firestore.doc(`${authProvider}_users/${decodedInputToken.sub}`).get();
  const data = document.data();

  if (!data || token !== data.token) return null;

  // return null if expired
  if (data.exp * 1000 < new Date().getTime()) {
    if (authProvider === commonConfig.authProviderNames.utahid) {
      return null;
    }
  }

  return data;
}

export async function cacheAppleTokens(sub, idToken, refreshToken) {
  await firestore.doc(`${commonConfig.authProviderNames.apple}_users/${sub}`).set({
    token: idToken,
    refreshToken,
  });
}

export async function getCachedAppleRefreshToken(sub) {
  const document = await firestore.doc(`${commonConfig.authProviderNames.apple}_users/${sub}`).get();
  const data = document.data();

  if (!data) return null;

  return data.refreshToken;
}

export async function setCachedUser(token, authProvider, userId) {
  const decodedToken = jwt_decode(token);
  const ref = firestore.doc(`${authProvider}_users/${decodedToken.sub}`);
  const document = await ref.get();
  const data = document.data();

  const newData = {
    ...data,
    token,
    userId: userId,
    exp: decodedToken.exp,
  };

  await ref.set(newData);
}

export async function deleteCachedUser(token, authProvider) {
  const decodedToken = jwt_decode(token);
  const document = firestore.doc(`${authProvider}_users/${decodedToken.sub}`);

  await document.delete();
}

export function shouldCacheUser(authProvider) {
  return [commonConfig.authProviderNames.apple, commonConfig.authProviderNames.utahid].includes(authProvider);
}
