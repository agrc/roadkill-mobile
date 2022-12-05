// this is for dev only, staging and prod get their variables from GHA secrets
require('dotenv').config();

const client = 'postgresql';
const connection = {
  host: '127.0.0.1',
  user: 'admin',
  password: process.env.DATABASE_ADMIN_PASSWORD,
  database: 'app',
};

module.exports = {
  development: {
    client,
    connection,
  },
  // this needs to match the GitHub environment name
  Staging: {
    client,
    connection,
  },
  // this needs to match the GitHub environment name
  Production: {
    client,
    connection,
  },
};
