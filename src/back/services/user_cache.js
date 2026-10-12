import commonConfig from 'common/config.js';
import { jwtDecode } from 'jwt-decode';
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
  const decodedInputToken = jwtDecode(token);
  if (
    typeof decodedInputToken.sub !== 'string' ||
    !decodedInputToken.sub.trim() ||
    !Number.isFinite(decodedInputToken.exp)
  ) {
    return null;
  }

  const document = await firestore
    .doc(`${authProvider}_users/${decodedInputToken.sub}`)
    .get();
  const data = document.data();

  if (
    !data ||
    token !== data.token ||
    !Number.isFinite(data.exp) ||
    data.exp !== decodedInputToken.exp ||
    data.exp * 1000 <= Date.now()
  ) {
    return null;
  }

  return data;
}

export async function cacheAppleTokens(sub, idToken, refreshToken) {
  const decodedToken = jwtDecode(idToken);
  if (decodedToken.sub !== sub || !Number.isFinite(decodedToken.exp)) {
    throw new Error('Apple identity token subject or expiration is invalid');
  }

  const reference = firestore.doc(
    `${commonConfig.authProviderNames.apple}_users/${sub}`,
  );
  await firestore.runTransaction(async (transaction) => {
    const document = await transaction.get(reference);
    transaction.set(reference, {
      ...document.data(),
      token: idToken,
      exp: decodedToken.exp,
      refreshToken,
    });
  });
}

export async function getCachedAppleRefreshToken(sub) {
  const document = await firestore
    .doc(`${commonConfig.authProviderNames.apple}_users/${sub}`)
    .get();
  const data = document.data();

  if (!data) return null;

  return data.refreshToken;
}

export async function setCachedUser(token, authProvider, userId) {
  const decodedToken = jwtDecode(token);
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
  const decodedToken = jwtDecode(token);
  if (
    typeof decodedToken.sub !== 'string' ||
    !decodedToken.sub.trim() ||
    !Number.isFinite(decodedToken.exp)
  ) {
    const error = new Error('Authorization token is malformed');
    error.name = 'InvalidTokenError';
    throw error;
  }

  const document = firestore.doc(
    `${authProvider}_users/${decodedToken.sub}`,
  );
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(document);
    if (snapshot.data()?.token === token) {
      transaction.delete(document);
    }
  });
}

export function shouldCacheUser(authProvider) {
  return [
    commonConfig.authProviderNames.apple,
    commonConfig.authProviderNames.utahid,
  ].includes(authProvider);
}
