import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import sgMail from '@sendgrid/mail';
import knex from 'knex';
import getSecret from './secrets.js';

sgMail.setApiKey(getSecret('sendgrid-api-key'));

export const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DATABASE_HOST,
    user: 'api',
    password: getSecret('database-password'),
    database: 'app',
  },
});

// no auth needed if running via cloud run or if you have a local emulator running
export const firestore = new Firestore();

export const mail = sgMail;

export const storage = new Storage();
