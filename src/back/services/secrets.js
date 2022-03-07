import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const testSecrets = {
  'client-id': 'client-id',
  'database-password': 'blah',
  'sendgrid-api-key': 'SG.hello',
};

const basePath =
  process.env.ENVIRONMENT === 'development' ? `${dirname(fileURLToPath(import.meta.url))}/../secrets` : '/secrets';

const secrets = process.env.JEST_WORKER_ID ? testSecrets : {};

export default function getSecret(secretName) {
  if (!secrets[secretName]) {
    const value = fs.readFileSync(`${basePath}/${secretName}`, 'utf8');

    secrets[secretName] = value.trim();
  }

  if (!secrets[secretName]) {
    throw new Error(`Secret: ${secretName} not found!`);
  }

  return secrets[secretName];
}
