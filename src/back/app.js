import { LoggingWinston } from '@google-cloud/logging-winston';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import expressWinston from 'express-winston';
import helmet from 'helmet';
import winston from 'winston';
import { authenticate, getToken } from './api/security.js';
import { getApprove, getLogin, getRegister, getReject } from './api/user.js';
import validate from './api/validation.js';
import {
  approveUser,
  getUser,
  isExistingUser,
  loginSchema,
  registerSchema,
  registerUser,
  rejectUser,
  updateUser,
} from './services/user_management.js';

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

if (process.env.ENVIRONMENT !== 'development' && process.env.ENVIRONMENT !== 'test') {
  app.use(
    expressWinston.logger({
      transports: [new LoggingWinston()],
      metaField: null, //this causes the metadata to be stored at the root of the log entry
      responseField: null, // this prevents the response from being included in the metadata (including body and status code)
      requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query', 'body'],
      responseWhitelist: ['body'], // this populates the `res.body` so we can get the response size (not required)
      format: winston.format.json(),
      ignoreRoute: (request) => request?.route?.path === '/user/login',
      dynamicMeta: (req, res) => {
        const httpRequest = {};
        const meta = {};
        if (req) {
          meta.httpRequest = httpRequest;
          httpRequest.requestMethod = req.method;
          httpRequest.requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          httpRequest.remoteIp = req.ip.indexOf(':') >= 0 ? req.ip.substring(req.ip.lastIndexOf(':') + 1) : req.ip; // just ipv4
          httpRequest.requestSize = req.socket.bytesRead;
          httpRequest.userAgent = req.get('User-Agent');
          httpRequest.referrer = req.get('Referrer');
        }

        if (res) {
          meta.httpRequest = httpRequest;
          httpRequest.status = res.statusCode;
          httpRequest.latency = {
            seconds: Math.floor(res.responseTime / 1000),
            nanos: (res.responseTime % 1000) * 1000000,
          };
          if (res.body) {
            if (typeof res.body === 'object') {
              httpRequest.responseSize = JSON.stringify(res.body).length;
            } else if (typeof res.body === 'string') {
              httpRequest.responseSize = res.body.length;
            }
          }
        }
        return meta;
      },
      meta: true,
    })
  );
}

function handleAsyncErrors(callback) {
  // could be replaced with https://www.npmjs.com/package/express-async-errors
  // this will be done by default at express 5.0
  return (request, response, next) => {
    callback(request, response, next).catch(next);
    // passing an error to next returns an HTML error page, maybe not ideal
  };
}

// user management
app.post('/user/token', handleAsyncErrors(getToken));
app.post(
  '/user/register',
  handleAsyncErrors(authenticate),
  validate(registerSchema),
  handleAsyncErrors(getRegister(isExistingUser, registerUser, getUser))
);
app.post(
  '/user/login',
  handleAsyncErrors(authenticate),
  validate(loginSchema),
  handleAsyncErrors(getLogin(getUser, updateUser))
);
// app.post('/user/logout', // TODO)
app.get('/user/approval/:guid/:role', handleAsyncErrors(getApprove(approveUser)));
app.get('/user/reject/:guid', handleAsyncErrors(getReject(rejectUser)));
// app.delete('/user/delete/:email/:auth_provider', handleAsyncErrors(del)); // TODO for facebook delete requirements

app.use(
  expressWinston.errorLogger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(winston.format.colorize(), winston.format.json()),
  })
);

export default app;
