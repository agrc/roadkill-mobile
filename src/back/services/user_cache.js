import { Firestore } from '@google-cloud/firestore';
import jwt_decode from 'jwt-decode';

// no auth needed if running via cloud run or if you have a local emulator running
const firestore = new Firestore();

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
