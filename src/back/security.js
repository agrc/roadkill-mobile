import got from 'got';

export async function handleToken(request, response) {
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

export async function secure(request, response, next) {
  if (request.headers.authorization) {
    let userResponse;
    try {
      // TODO: add cache, redis or in_memory
      userResponse = await got('https://login.dts.utah.gov/sso/oauth2/userinfo', {
        responseType: 'json',
        headers: {
          Authorization: request.headers.authorization,
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

      return next();
    }

    response.status(userResponse.statusCode).json(userResponse.body);
  }

  return response.status(401).send('Access denied');
}
