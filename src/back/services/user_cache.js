import jwt_decode from 'jwt-decode';
import { firestore } from './clients.js';

// datastore doc shape:
/*
path: <token.sub>
value: {
  user: userData,
  exp: <token.exp>
}
*/
const DOC_TYPE = 'users';
export async function getUser(token) {
  const decodedInputToken = jwt_decode(token);

  const cachedUserRef = await firestore.doc(`${DOC_TYPE}/${decodedInputToken.sub}`).get();
  const cachedUser = cachedUserRef.data();

  // return null if expired
  if (!cachedUser || cachedUser.exp * 1000 < new Date().getTime()) return null;

  return cachedUser.user;
}

export async function setUser(token, user) {
  const decodedToken = jwt_decode(token);
  const document = firestore.doc(`${DOC_TYPE}/${decodedToken.sub}`);

  await document.set({
    exp: decodedToken.exp,
    user,
  });
}
