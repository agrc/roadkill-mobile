import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { authenticate, getToken } from './api/security.js';
import { login, register } from './api/user.js';
import validate from './api/validation.js';
import { loginSchema, registerSchema } from './services/user_management.js';

// app setup
const app = express();

// gzip
app.use(compression());

// enable x-www-form-urlencoded body format
app.use(express.urlencoded({ extended: true }));

// parse application/json
app.use(express.json());

// security best practices
app.use(helmet());

app.use(cors());

function handleAsyncErrors(callback) {
  // could be replaced with https://www.npmjs.com/package/express-async-errors
  // this will be done by default at express 5.0
  return (request, response, next) => {
    callback(request, response, next).catch(next);
    // passing an error to next returns an HTML error page, maybe not ideal
  };
}

app.post('/token', handleAsyncErrors(getToken));
// app.post('/invalidate_token', // TODO)

app.post('/register', handleAsyncErrors(authenticate), validate(registerSchema), handleAsyncErrors(register));
app.post('/login', handleAsyncErrors(authenticate), validate(loginSchema), handleAsyncErrors(login));

export default app;
