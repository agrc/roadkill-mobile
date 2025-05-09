import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const testSecrets = {
  'client-id': 'client-id',
  'database-password': 'blah',
  'sendgrid-api-key': 'SG.hello',
  'apple-sign-in-props': `
    {
      "teamID": "test-team-id",
      "privateKey": "-----BEGIN PRIVATE KEY-----\\nblah\\nblah\\nblah\\nblah\\n-----END PRIVATE KEY-----",
      "keyIdentifier": "key-id"
    }
  `,
};

const basePath =
  process.env.ENVIRONMENT === 'development' ? `${dirname(fileURLToPath(import.meta.url))}/../secrets` : '/secrets';

const secrets = process.env.VITEST ? testSecrets : {};

export default function getSecret(secretName) {
  if (!secrets[secretName]) {
    const value = fs.readFileSync(`${basePath}/${secretName.replace(/-/g, '_')}/value`, 'utf8');

    secrets[secretName] = value.trim();
  }

  if (!secrets[secretName]) {
    throw new Error(`Secret: ${secretName} not found!`);
  }

  return secrets[secretName];
}
