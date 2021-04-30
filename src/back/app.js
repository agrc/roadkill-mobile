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
  return (request, response, next) => {
    callback(request, response, next).catch(next);
    // pass an error to next returns an HTML error page, maybe not ideal
  };
}

app.post('/token', handleAsyncErrors(handleToken));

app.get('/secure', handleAsyncErrors(secure), (_, response) => {
  response.send('ok');
});

export default app;
