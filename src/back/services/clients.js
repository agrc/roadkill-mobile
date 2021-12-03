import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import sgMail from '@sendgrid/mail';
import knex from 'knex';
import knexPostgis from 'knex-postgis';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DATABASE_HOST,
    user: 'api',
    password: process.env.DATABASE_PASSWORD,
    database: 'app',
  },
});

export const st = knexPostgis(db);

// no auth needed if running via cloud run or if you have a local emulator running
export const firestore = new Firestore();

export const mail = sgMail;

export const storage = new Storage();
