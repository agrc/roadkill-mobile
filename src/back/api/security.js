import commonConfig from 'common/config.js';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { jwtDecode } from 'jwt-decode';
import ky from 'ky';
import appleSignIn from '../services/apple_sign_in.js';
import getSecret from '../services/secrets.js';
import {
  cacheAppleTokens,
  deleteCachedUser,
  getCachedAppleRefreshToken,
  getCachedUser,
  setCachedUser,
  shouldCacheUser,
} from '../services/user_cache.js';
import { getUser as getAppUser } from '../services/user_management.js';

const facebookJwksClient = jwksClient({
  jwksUri: 'https://www.facebook.com/.well-known/oauth/openid/jwks/',
});
const authProviders = new Set(Object.values(commonConfig.authProviderNames));

function isInvalidCredentialError(error) {
  return (
    [
      'JsonWebTokenError',
      'TokenExpiredError',
      'NotBeforeError',
      'InvalidTokenError',
      'SigningKeyNotFoundError',
    ].includes(error?.name) ||
    [400, 401, 403].includes(error?.status) ||
    ['invalid_grant', 'invalid_token'].includes(error?.code)
  );
}

function invalidToken(response, description = 'The access token is invalid') {
  return response.status(401).json({
    error: 'invalid_token',
    error_description: description,
  });
}

function serverError(response, error) {
  return response.status(502).json({
    error: 'server_error',
    error_description: error?.message || String(error),
  });
}

function isEmptyToken(token) {
  return (
    !token ||
    ['bearer', 'null', 'undefined'].includes(token.trim().toLowerCase())
  );
}

export async function getToken(request, response) {
  const accessTokenName = 'authorization_code';
  const grantTypes = [accessTokenName, 'refresh_token'];
  if (request.body.client_id !== getSecret('client-id')) {
    return response.status(400).send('invalid client_id');
  } else if (!grantTypes.includes(request.body.grant_type)) {
    return response.status(400).json({
      error_description: `invalid grant_type: ${
        request.body.grant_type
      }, must be one of ${grantTypes.join(', ')}`,
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
    return response
      .status(400)
      .json({ error_description: error.message, error: 'invalid_request' });
  }

  try {
    const tokenResponse = await ky
      .post('https://login.dts.utah.gov:443/sso/oauth2/access_token', {
        searchParams: body,
        headers: {
          authorization: request.headers.authorization,
          accept: request.headers.accept,
        },
      })
      .json();

    return response.send(tokenResponse);
  } catch (error) {
    const upstreamResponse = error?.response;
    if (!upstreamResponse) {
      return response.status(502).json({
        error_description: 'Identity provider request failed',
        error: 'server_error',
      });
    }

    let providerError;
    try {
      providerError = await upstreamResponse.clone().json();
    } catch {
      providerError = null;
    }

    const status = upstreamResponse.status;
    const credentialError = providerError?.error;
    if (
      status >= 400 &&
      status < 500 &&
      ['invalid_grant', 'invalid_token'].includes(credentialError)
    ) {
      return response.status(status).json({
        error: credentialError,
        error_description: 'The authorization credentials are invalid or expired',
      });
    }

    if (status >= 500) {
      return response.status(502).json({
        error_description: 'Identity provider is unavailable',
        error: 'server_error',
      });
    }

    return response.status(status).json({
      error_description: 'Identity provider rejected the request',
      error: 'server_error',
    });
  }
}

export async function verifyAppleTokenAndCode(request, response) {
  const { authorizationCode, identityToken } = request.body;

  let sub;
  try {
    sub = await appleSignIn.verifyIdToken(identityToken);
  } catch (error) {
    if (isInvalidCredentialError(error)) {
      return invalidToken(response, error.message);
    }

    return serverError(response, error);
  }

  // check for cached refresh token and use that rather than getTokens
  let refreshToken = await getCachedAppleRefreshToken(sub);

  let newIdToken;
  if (refreshToken) {
    try {
      newIdToken = await appleSignIn.validateRefreshToken(refreshToken);
    } catch (error) {
      if (authorizationCode && isInvalidCredentialError(error)) {
        console.warn(
          `refresh token failed with error: ${error}. Attempting to get new tokens...`,
        );

        try {
          const tokens = await appleSignIn.getTokens(authorizationCode);
          refreshToken = tokens.refreshToken;
          newIdToken = tokens.identityToken;
        } catch (tokenError) {
          if (isInvalidCredentialError(tokenError)) {
            return invalidToken(response, tokenError.message);
          }

          return serverError(response, tokenError);
        }
      } else {
        if (isInvalidCredentialError(error)) {
          return invalidToken(response, error.message);
        }

        return serverError(response, error);
      }
    }
  } else {
    try {
      const tokens = await appleSignIn.getTokens(authorizationCode);
      refreshToken = tokens.refreshToken;
      newIdToken = tokens.identityToken;
    } catch (error) {
      if (isInvalidCredentialError(error)) {
        return invalidToken(response, error.message);
      }

      return serverError(response, error);
    }
  }

  const verifiedIdentityToken = newIdToken ?? identityToken;
  let verifiedSub;
  try {
    verifiedSub = await appleSignIn.verifyIdToken(verifiedIdentityToken);
  } catch (error) {
    if (isInvalidCredentialError(error)) {
      return invalidToken(response, error.message);
    }

    return serverError(response, error);
  }

  if (verifiedSub !== sub) {
    return invalidToken(response, 'Apple identity does not match the session');
  }

  await cacheAppleTokens(sub, verifiedIdentityToken, refreshToken);

  return response.status(200).json({ identityToken: verifiedIdentityToken });
}

export async function logout(request, response) {
  const { token, authProvider } = getTokenFromHeader(
    request.headers.authorization,
  );

  if (isEmptyToken(token) || !authProviders.has(authProvider)) {
    return invalidToken(response, 'Authorization token is missing or invalid');
  }

  if (shouldCacheUser(authProvider)) {
    try {
      await deleteCachedUser(token, authProvider);
    } catch (error) {
      if (isInvalidCredentialError(error)) {
        return invalidToken(response, error.message);
      }

      throw error;
    }
  }

  return response.status(200).send('user logged out successfully');
}

export function getTokenFromHeader(authorization) {
  if (typeof authorization !== 'string') {
    return {};
  }

  const separator = authorization.indexOf(':');
  if (separator < 1) {
    return {};
  }

  const authProvider = authorization.slice(0, separator);
  const authToken = authorization.slice(separator + 1);

  let token;
  if (authToken.trim()) {
    token = authToken.trim().split(/\s+/).pop();
  }

  return { token, authProvider, authToken };
}

function isJwt(token) {
  return typeof token === 'string' && token.split('.').length === 3;
}

export async function authenticate(request, response, next) {
  const { token, authProvider, authToken } = getTokenFromHeader(
    request.headers.authorization,
  );

  if (isEmptyToken(token)) {
    return invalidToken(response, 'Authorization token is missing or empty');
  }

  if (!authProviders.has(authProvider)) {
    return invalidToken(response, 'Authorization provider is not supported');
  }

  response.locals.authProvider = authProvider;

  let authId;
  let cachedUser;
  try {
    if (shouldCacheUser(authProvider)) {
      try {
        cachedUser = await getCachedUser(token, authProvider);
      } catch (error) {
        if (isInvalidCredentialError(error)) {
          return invalidToken(response, error.message);
        }

        throw error;
      }
    }

    if (cachedUser?.userId) {
      // Cached sessions were verified before being stored; resolve the current
      // app-user mapping below rather than trusting the cached database id.
      authId = jwtDecode(token).sub;
    } else if (authProvider === commonConfig.authProviderNames.apple) {
      authId = await appleSignIn.verifyIdToken(token);

      if (cachedUser) {
        if (!cachedUser.refreshToken) {
          return invalidToken(response, 'Apple session has no refresh token');
        }

        let refreshedIdentityToken;
        try {
          refreshedIdentityToken = await appleSignIn.validateRefreshToken(
            cachedUser.refreshToken,
          );
        } catch (error) {
          if (
            !request.body?.authorizationCode ||
            !isInvalidCredentialError(error)
          ) {
            if (isInvalidCredentialError(error)) {
              return invalidToken(response, error.message);
            }

            throw error;
          }

          try {
            const tokens = await appleSignIn.getTokens(
              request.body.authorizationCode,
            );
            refreshedIdentityToken = tokens.identityToken;
          } catch (tokenError) {
            if (isInvalidCredentialError(tokenError)) {
              return invalidToken(response, tokenError.message);
            }

            throw tokenError;
          }
        }

        const refreshedSub = await appleSignIn.verifyIdToken(
          refreshedIdentityToken,
        );
        if (refreshedSub !== authId) {
          return invalidToken(response, 'Apple identity does not match the session');
        }
      }
    } else if (
      authProvider === commonConfig.authProviderNames.facebook &&
      isJwt(token)
    ) {
      // Facebook limited-login tokens are used by the iOS app.
      const header = jwtDecode(token, { header: true });
      const key = await facebookJwksClient.getSigningKey(header.kid);
      const decoded = jwt.verify(token, key.getPublicKey(), {
        algorithms: ['RS256'],
        audience: getSecret('facebook-oauth-client-id'),
        issuer: 'https://www.facebook.com',
      });
      authId = decoded.sub;
    } else {
      const userInfos = {
        utahid: 'https://login.dts.utah.gov/sso/oauth2/userinfo',
        google: 'https://openidconnect.googleapis.com/v1/userinfo',
        facebook: `https://graph.facebook.com/me?access_token=${token}`,
      };

      let userResponse;
      try {
        userResponse = await ky(userInfos[authProvider], {
          responseType: 'json',
          headers: { Authorization: authToken },
          retry: { limit: 5 },
          throwHttpErrors: false,
        });
      } catch (error) {
        return serverError(response, error);
      }

      if (userResponse.status !== 200) {
        let providerError;
        try {
          providerError = await userResponse.json();
        } catch {
          providerError = null;
        }

        const description =
          providerError?.error_description ||
          providerError?.error ||
          `Identity provider returned HTTP ${userResponse.status}`;
        if ([400, 401, 403].includes(userResponse.status)) {
          return invalidToken(response, description);
        }

        return serverError(response, description);
      }

      let body;
      try {
        body = await userResponse.json();
      } catch (error) {
        return serverError(response, error);
      }

      // Facebook returns `id`; UtahID and Google return `sub`.
      authId = body.sub || body.id;
    }
  } catch (error) {
    if (isInvalidCredentialError(error)) {
      return invalidToken(response, error.message);
    }

    return serverError(response, error);
  }

  if (typeof authId !== 'string' || !authId.trim()) {
    return invalidToken(response, 'Provider did not return an identity');
  }

  response.locals.authId = authId;
  const user = await getAppUser(authId, authProvider);
  if (user?.id) {
    response.locals.userId = user.id;

    if (shouldCacheUser(authProvider)) {
      await setCachedUser(token, authProvider, user.id);
    }
  }

  return next();
}

export async function requireRegisteredUser(request, response, next) {
  const { authId, authProvider } = response.locals;
  if (!authId || !authProvider) {
    return invalidToken(response, 'Verified provider identity is missing');
  }

  const user = await getAppUser(authId, authProvider);
  if (!user?.id) {
    return response.status(403).json({
      error: 'registration_required',
      error_description: 'Register this identity before accessing this resource',
    });
  }

  response.locals.userId = user.id;
  return next();
}
