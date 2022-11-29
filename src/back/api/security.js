import commonConfig from 'common/config.js';
import got from 'got';
import appleSignIn from '../services/apple_sign_in.js';
import getSecret from '../services/secrets.js';
import {
  cacheAppleTokens,
  deleteCachedUser,
  getCachedAppleRefreshToken,
  getCachedUser,
  setCachedUser,
} from '../services/user_cache.js';
import { getUser as getAppUser } from '../services/user_management.js';

export async function getToken(request, response) {
  const accessTokenName = 'authorization_code';
  const grantTypes = [accessTokenName, 'refresh_token'];
  if (request.body.client_id !== getSecret('client-id')) {
    return response.status(400).send('invalid client_id');
  } else if (!grantTypes.includes(request.body.grant_type)) {
    return response.status(400).json({
      error_description: `invalid grant_type: ${request.body.grant_type}, must be one of ${grantTypes.join(', ')}`,
      error: 'invalid_request',
    });
  }

  const passed_through_params =
    request.body.grant_type === accessTokenName
      ? ['client_id', 'code_verifier', 'code_challenge', 'redirect_uri', 'code']
      : ['client_id', 'refresh_token'];
  const body = { grant_type: request.body.grant_type };
  try {
    passed_through_params.forEach((name) => {
      const param = request.body[name];
      if (param) {
        body[name] = param;
      } else {
        const error = new Error(`${name} is required`);
        error.status = 400;

        throw error;
      }
    });
  } catch (error) {
    return response.status(400).json({ error_description: error.message, error: 'invalid_request' });
  }

  try {
    const tokenRequest = await got.post('https://login.dts.utah.gov:443/sso/oauth2/access_token', {
      form: body,
      responseType: 'json',
      headers: {
        authorization: request.headers.authorization,
        accept: request.headers.accept,
      },
    });

    return response.send(tokenRequest.body);
  } catch (error) {
    const errorMessage = error.body || error.message || error;

    return response.status(500).json({ error_description: errorMessage, error: 'server_error' });
  }
}

export async function verifyAppleTokenAndCode(request, response) {
  const { authorizationCode, identityToken } = request.body;

  const sub = await appleSignIn.verifyIdToken(identityToken);

  // check for cached refresh token and use that rather than getTokens
  let refreshToken = await getCachedAppleRefreshToken(sub);

  let newIdToken;
  if (refreshToken) {
    newIdToken = await appleSignIn.validateRefreshToken(refreshToken);
  } else {
    try {
      const tokens = await appleSignIn.getTokens(authorizationCode);
      refreshToken = tokens.refreshToken;
      newIdToken = tokens.identityToken;
    } catch (error) {
      return response.status(401).json({ error_description: error.message, error: 'invalid_request' });
    }
  }

  await cacheAppleTokens(sub, newIdToken ?? identityToken, refreshToken);

  return response.status(200).json({ identityToken: newIdToken });
}

export async function logout(request, response) {
  const { token, authProvider } = getTokenFromHeader(request.headers.authorization);

  if (!token) {
    return response.status(401).send('empty token');
  }

  if (shouldCacheUser(authProvider)) {
    await deleteCachedUser(token);
  }

  return response.status(200).send('user logged out successfully');
}

function shouldCacheUser(authProvider) {
  return [commonConfig.authProviderNames.apple, commonConfig.authProviderNames.utahid].includes(authProvider);
}

export function getTokenFromHeader(authorization) {
  const [authProvider, authToken] = authorization.split(':');

  let token;
  if (authToken) {
    token = authToken.split(' ').pop();
  }

  return { token, authProvider, authToken };
}

export async function authenticate(request, response, next) {
  if (request.headers.authorization) {
    const { token, authProvider, authToken } = getTokenFromHeader(request.headers.authorization);

    if (!token) {
      return response.status(401).send('empty token');
    }

    response.locals.authProvider = authProvider;

    if (shouldCacheUser(authProvider)) {
      const cachedUser = await getCachedUser(token, authProvider);
      if (cachedUser?.userId) {
        response.locals.userId = cachedUser.userId;

        return next();
      } else if (authProvider === commonConfig.authProviderNames.apple) {
        // might be cached refresh token for apple...
        const sub = await appleSignIn.verifyIdToken(token);

        if (cachedUser?.refreshToken) {
          await appleSignIn.validateRefreshToken(cachedUser.refreshToken);

          const user = await getAppUser(sub, authProvider);
          if (user?.id) {
            response.locals.userId = user.id;
          }

          // don't cache until we have the user in the app database
          if (shouldCacheUser(authProvider) && user?.id) {
            setCachedUser(token, authProvider, user.id);
          }

          return next();
        } else {
          return response.status(401).send('no cached refresh token');
        }
      }
    }

    const userInfos = {
      utahid: 'https://login.dts.utah.gov/sso/oauth2/userinfo',
      google: 'https://openidconnect.googleapis.com/v1/userinfo',
      facebook: `https://graph.facebook.com/me?access_token=${token}`,
    };

    let userResponse;
    try {
      userResponse = await got(userInfos[authProvider], {
        responseType: 'json',
        headers: {
          Authorization: authToken,
        },
        retry: {
          limit: 5,
        },
        throwHttpErrors: false,
      });
    } catch (error) {
      const errorMessage = error.body || error.message || error;

      return response.status(500).json({ error_description: errorMessage, error: 'server_error' });
    }

    if (userResponse.statusCode === 200 && userResponse.body) {
      // facebook returns `id`, utahid and google return `sub`
      const authId = userResponse.body.sub || userResponse.body.id;
      const user = await getAppUser(authId, authProvider);
      if (user.id) {
        response.locals.userId = user.id;
      }

      // don't cache until we have the user in the app database
      if (shouldCacheUser(authProvider) && user.id) {
        setCachedUser(token, authProvider, user.id);
      }

      return next();
    }

    return response.status(userResponse.statusCode).json(userResponse.body);
  }

  return response.status(400).send('authorization header is required');
}
