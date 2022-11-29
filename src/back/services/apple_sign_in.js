import appleSignIn from 'apple-signin-auth';
import commonConfig from 'common/config.js';
import getSecret from './secrets.js';

const clientID = commonConfig.bundleIds[process.env.ENVIRONMENT];
const appleSignInProps = JSON.parse(getSecret('apple-sign-in-props'));

function getClientSecret() {
  return appleSignIn.getClientSecret({
    clientID,
    ...appleSignInProps,
  });
}

async function revokeToken(refreshToken) {
  // revoke refresh token
  const response = await appleSignIn.revokeAuthorizationToken(refreshToken, {
    clientID,
    clientSecret: getClientSecret(),
    tokenTypeHint: 'refresh_token',
  });

  return response;
}

async function verifyIdToken(identityToken) {
  const verifyResult = await appleSignIn.verifyIdToken(identityToken, {
    // Optional Options for further verification - Full list can be found here https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
    audience: clientID,
  });

  return verifyResult.sub;
}

async function getTokens(authorizationCode) {
  // exchange authorization code for tokens
  // this is really just to validate the authorization code
  const tokenResponse = await appleSignIn.getAuthorizationToken(authorizationCode, {
    clientID,
    clientSecret: getClientSecret(),
  });

  // response looks like this
  // {
  //   access_token: 'ACCESS_TOKEN', // A token used to access allowed data.
  //   token_type: 'Bearer', // It will always be Bearer.
  //   expires_in: 300, // The amount of time, in seconds, before the access token expires.
  //   refresh_token: 'REFRESH_TOKEN', // used to regenerate new access tokens. Store this token securely on your server.
  //   id_token: 'ID_TOKEN' // A JSON Web Token that contains the user’s identity information.
  // }
  console.log('tokenResponse', tokenResponse);

  if (tokenResponse.error) {
    throw new Error(`${tokenResponse.error}: ${tokenResponse.error_description}`);
  }

  return {
    identityToken: tokenResponse.id_token,
    refreshToken: tokenResponse.refresh_token,
  };
}

async function validateRefreshToken(refreshToken) {
  // this is really just validating the refresh token
  const response = await appleSignIn.refreshAuthorizationToken(refreshToken, {
    clientID,
    clientSecret: getClientSecret(),
  });
  console.log('refreshAuthorizationToken response', response);

  return response.id_token;
}

export default { verifyIdToken, validateRefreshToken, getTokens, revokeToken };
