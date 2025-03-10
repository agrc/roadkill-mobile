import { LoggingWinston } from '@google-cloud/logging-winston';
import { getConstants } from 'common/constants.js';
import { pickup as pickupSchema, report as reportSchema } from 'common/validation/reports.js';
import { route as routeSchema } from 'common/validation/routes.js';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import expressWinston from 'express-winston';
import helmet from 'helmet';
import Multer from 'multer';
import winston from 'winston';
import { getGetIDImageHandler } from './api/id_images.js';
import { getGetPhotoHandler } from './api/photos.js';
import { getGetReportHandler, getNewPickupHandler, getNewReportHandler } from './api/reports.js';
import { getGetRouteHandler, getNewRouteHandler } from './api/routes.js';
import { authenticate, getToken, logout, verifyAppleTokenAndCode } from './api/security.js';
import { getGetAllHandler } from './api/submissions.js';
import {
  getApprove,
  getDeleteUser,
  getGetProfile,
  getLogin,
  getRegister,
  getReject,
  getUpdateProfile,
} from './api/user.js';
import validate from './api/validation.js';
import getVersionFromHeader from './api/versioning.js';
import { getIDImage } from './services/id_images.js';
import sendReportNotification from './services/notifications.js';
import { getPhoto, upload } from './services/photos.js';
import { createPickup, createReport, getReport } from './services/report_management.js';
import { createRoute, getRoute } from './services/route_management.js';
import { getMySubmissions } from './services/submissions.js';
import {
  approveUser,
  deleteUser,
  getProfile,
  getUser,
  isExistingUser,
  loginSchema,
  registerSchema,
  registerUser,
  rejectUser,
  updateProfile,
  updateUser,
} from './services/user_management.js';

// app setup
const app = express();

// gzip
app.use(compression());

// enable x-www-form-urlencoded body format
app.use(express.urlencoded({ extended: true }));

// parse application/json
app.use(
  express.json({
    limit: '50mb',
  })
);

// accept files
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 40 * 1024 * 1024, // mb
  },
});

// security best practices
app.use(helmet());

app.use(getVersionFromHeader);

app.use(cors());

if (process.env.ENVIRONMENT === 'development') {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      format: winston.format.cli(),
      meta: true,
      msg: 'HTTP {{req.method}} {{req.url}}',
      expressFormat: true,
      colorize: true,
    })
  );
} else if (process.env.ENVIRONMENT !== 'development' && process.env.ENVIRONMENT !== 'test') {
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
app.post('/user/apple-token', handleAsyncErrors(verifyAppleTokenAndCode));
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
  handleAsyncErrors(getLogin(getUser, updateUser, getConstants))
);
app.post('/user/logout', handleAsyncErrors(logout));
app.get('/user/approval/:guid/:role', handleAsyncErrors(getApprove(approveUser)));
app.get('/user/reject/:guid', handleAsyncErrors(getReject(rejectUser)));

app.get('/user/profile', handleAsyncErrors(authenticate), handleAsyncErrors(getGetProfile(getProfile)));
app.post('/user/profile/update', handleAsyncErrors(authenticate), handleAsyncErrors(getUpdateProfile(updateProfile)));
app.delete('/user/delete', handleAsyncErrors(authenticate), handleAsyncErrors(getDeleteUser(deleteUser)));

// data submission
app.post(
  '/reports/report',
  handleAsyncErrors(authenticate),
  multer.single('photo'),
  validate(reportSchema.omit(['photo'])),
  handleAsyncErrors(getNewReportHandler(upload, createReport, sendReportNotification))
);
app.post(
  '/reports/pickup',
  handleAsyncErrors(authenticate),
  multer.single('photo'),
  validate(pickupSchema.omit(['photo'])),
  handleAsyncErrors(getNewPickupHandler(upload, createPickup))
);
app.post(
  '/routes/route',
  handleAsyncErrors(authenticate),
  validate(routeSchema),
  handleAsyncErrors(getNewRouteHandler(createRoute))
);

// data retrieval
app.get('/submissions', handleAsyncErrors(authenticate), handleAsyncErrors(getGetAllHandler(getMySubmissions)));
app.get(
  '/reports/report/:reportId',
  handleAsyncErrors(authenticate),
  handleAsyncErrors(getGetReportHandler(getReport))
);
app.get('/routes/route/:routeId', handleAsyncErrors(authenticate), handleAsyncErrors(getGetRouteHandler(getRoute)));

// these endpoints are unsecured to support report notification emails
app.get('/photos/thumb/:photoId', handleAsyncErrors(getGetPhotoHandler(true, getPhoto)));
app.get('/photos/:photoId', handleAsyncErrors(getGetPhotoHandler(false, getPhoto)));

// I don't see any reason to secure this endpoint and am worried that it will just slow it down
app.get('/reports/id_image/:key/:pixelRatio', handleAsyncErrors(getGetIDImageHandler(getIDImage)));

export default app;
