import express from 'express';
import got from 'got';
import helmet from 'helmet';

const app = express();

// enable x-www-form-urlencoded body format
app.use(express.urlencoded({ extended: true }));

app.use(helmet());

app.post('/token', async (request, response) => {
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
      body: new URLSearchParams(body).toString(),
      responseType: 'json',
      headers: {
        authorization: request.headers.authorization,
        'content-type': request.headers['content-type'],
        accept: request.headers.accept,
      },
    });

    console.log(tokenRequest.body);
    return response.send(tokenRequest.body);
  } catch (error) {
    console.error(error.body || error.message || error);
    // TODO: return error
    return response.send(error);
  }
});

function restrict(request, response, next) {
  if (request.headers.authorization) {
    const token = request.headers.authorization.slice(8);
    // hit introspect and validate something from the response
    // add cache, redis or in_memory
    next();
  } else {
    // req.session.error = 'Access denied!';
    response.send('not OK');
  }
}

app.get('/secure', restrict, (request, response) => {
  response.send('ok');
});

export default app;
