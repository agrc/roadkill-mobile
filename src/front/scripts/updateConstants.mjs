import { getConstants } from 'common/constants.js';
import fs from 'fs';
import knex from 'knex';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// __dirname is not a thing for es modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DATABASE_HOST,
    user: 'api',
    password: process.env.DATABASE_PASSWORD,
    database: 'app',
    port: process.env.DATABASE_PORT,
  },
});

const constants = await getConstants(db);

const jsonFilePath = resolve(`${__dirname}/../services/constants.json.lazy`);

fs.writeFileSync(jsonFilePath, JSON.stringify(constants, null, 2));

console.log(`${jsonFilePath} has been successfully updated`);

process.exit();
