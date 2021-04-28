import express from 'express';
import got from 'got';

const app = express();
const port = process.env.PORT || 3000;

// enable x-www-form-urlencoded body format
app.use(express.urlencoded({ extended: true }))

app.post('/token', async (request, response) => {
  const body = {
    ...request.body,
    // TODO: don't spread everything, get specific ones that I need
    // if they aren't there, then don't proxy, return bad request
    // validate clientid
    client_secret: process.env.CLIENT_SECRET
  };

  try {
    const tokenRequest = await got.post('https://login.dts.utah.gov:443/sso/oauth2/access_token', {
      body: (new URLSearchParams(body)).toString(),
      responseType: 'json',
      headers: {
        authorization: request.headers.authorization,
        'content-type': request.headers['content-type'], // not sure that I need this because of express.urlencoded
        accept: request.headers.accept
      }
    });

    console.log(tokenRequest.body);
    response.send(tokenRequest.body);
  } catch (error) {
    console.error(error.body || error.message || error);
    // TODO: return error
    response.send(error);
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

app.listen(port, () => {
  console.log(`wvc api is running on port: ${port}`);
});
