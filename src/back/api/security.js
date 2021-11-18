import got from 'got';
import { deleteUser, getUser, setUser } from '../services/user_cache.js';
import { getUser as getAppUser } from '../services/user_management.js';

export async function getToken(request, response) {
  const accessTokenName = 'authorization_code';
  const grantTypes = [accessTokenName, 'refresh_token'];
  if (request.body.client_id !== process.env.CLIENT_ID) {
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

export async function logout(request, response) {
  const { token, isJWTToken } = getTokenFromHeader(request.headers.authorization);

  if (!token) {
    return response.status(401).send('empty token');
  }

  if (isJWTToken) {
    await deleteUser(token);
  }

  return response.status(200).send('user logged out successfully');
}

function getTokenFromHeader(authorization) {
  const [authProvider, authToken] = authorization.split(':');

  let token;
  let isJWTToken;
  if (authToken) {
    token = authToken.split(' ').pop();
    isJWTToken = authProvider === 'utahid';
  }

  return { token, isJWTToken, authProvider, authToken };
}

export async function authenticate(request, response, next) {
  if (request.headers.authorization) {
    const { token, isJWTToken, authProvider, authToken } = getTokenFromHeader(request.headers.authorization);

    if (!token) {
      return response.status(401).send('empty token');
    }

    response.locals.authProvider = authProvider;

    if (isJWTToken) {
      const cachedUser = await getUser(token);
      if (cachedUser) {
        response.locals.user = cachedUser;

        return next();
      }
    }

    let userResponse;
    const userInfos = {
      utahid: 'https://login.dts.utah.gov/sso/oauth2/userinfo',
      google: 'https://openidconnect.googleapis.com/v1/userinfo',
      facebook: `https://graph.facebook.com/me?access_token=${token}`,
    };

    try {
      userResponse = await got(userInfos[authProvider], {
        responseType: 'json',
        headers: {
          Authorization: authToken,
        },
        retry: 5,
        throwHttpErrors: false,
      });
    } catch (error) {
      const errorMessage = error.body || error.message || error;

      return response.status(500).json({ error_description: errorMessage, error: 'server_error' });
    }

    if (userResponse.statusCode === 200 && userResponse.body) {
      response.locals.user = userResponse.body;

      const appUser = await getAppUser(userResponse.body.sub, authProvider);
      response.locals.user.appUser = appUser;

      if (isJWTToken) {
        setUser(token, {
          ...userResponse.body,
          appUser,
        });
      }

      return next();
    }

    return response.status(userResponse.statusCode).json(userResponse.body);
  }

  return response.status(400).send('authorization header is required');
}
