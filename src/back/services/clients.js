import {
  AuthTypes,
  Connector,
  IpAddressTypes,
} from '@google-cloud/cloud-sql-connector';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import sgMail from '@sendgrid/mail';
import knex from 'knex';
import getSecret from './secrets.js';

sgMail.setApiKey(getSecret('sendgrid-api-key'));

const isTestOrLocalDev =
  process.env.ENVIRONMENT === 'test' ||
  process.env.ENVIRONMENT === 'development';
const clientOpts = isTestOrLocalDev
  ? {
      host: '127.0.0.1',
    }
  : await new Connector().getOptions({
      instanceConnectionName: process.env.CLOUDSQL_INSTANCE,
      ipType: IpAddressTypes.PUBLIC,
      authType: AuthTypes.PASSWORD,
    });
console.log('clientOpts', JSON.stringify(clientOpts, null, 2));
export const db = knex({
  client: 'pg',
  connection: {
    ...clientOpts,
    user: 'api',
    password: getSecret('database-password'),
    database: 'app',
  },
});

// no auth needed if running via cloud run or if you have a local emulator running
export const firestore = new Firestore();

export const mail = sgMail;

export const storage = new Storage();
