import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { handleToken, secure } from './security.js';

// app setup
const app = express();

// gzip
app.use(compression());

// enable x-www-form-urlencoded body format
app.use(express.urlencoded({ extended: true }));

// security best practices
app.use(helmet());

function handleAsyncErrors(callback) {
  // this will be done by default at express 5.0
  return (request, response, next) => {
    callback(request, response, next).catch(next);
    // passing an error to next returns an HTML error page, maybe not ideal
  };
}

app.post('/token', handleAsyncErrors(handleToken));
// app.post('/invalidate_token', // TODO)

app.get('/secure', handleAsyncErrors(secure), (_, response) => {
  response.send(`ok: ${response.locals.user.name}`);
});

export default app;
