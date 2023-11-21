// this should really be an eslint plugin...
import fs from 'fs';
import glob from 'glob';
import lodash from 'lodash';
import { basename, join } from 'path';

const rootFolder = process.cwd();

// Load the JSON file
const data = JSON.parse(
  fs.readFileSync(join(rootFolder, 'services', 'translations.json'), 'utf8'),
);

// Get the English and Spanish dictionaries
const enDict = data['en'];
const esDict = data['es'];

// Recursive function to check for missing keys in nested objects
function checkMissingKeys(enObj, esObj, path = '') {
  const missingKeys = [];
  for (const key in enObj) {
    if (typeof enObj[key] === 'object' && enObj[key] !== null) {
      // If the key is an object, check for missing keys in the nested object
      missingKeys.push(
        ...checkMissingKeys(enObj[key], esObj[key] || {}, path + key + '.'),
      );
    } else if (!(key in esObj)) {
      // If the key is missing in the Spanish dictionary, add it to the list
      missingKeys.push(path + key);
    }
  }
  return missingKeys;
}

// Check if all keys in the English dictionary are in the Spanish dictionary
const missingKeys = checkMissingKeys(enDict, esDict);

// Print the missing keys
if (missingKeys.length) {
  throw new Error(
    `The following keys are missing in the Spanish translations: "${missingKeys.join(
      '", "',
    )}"`,
  );
}

console.log(
  'All keys in the English translations are present in the Spanish translations.',
);

// Read .gitignore file
const ignore = [
  'node_modules/**',
  '.expo/**',
  '.expo-shared/**',
  '.storybook/**',
  'assets/**',
  'dev-clients/**',
  'dist/**',
  'node_modules/**',
  'scripts/**',
  'store-assets/**',
].map((line) => join(rootFolder, line));

// Search for instances of t('key') in the code in src/front and validate that the key is present in the translations.json file
const files = glob.sync(join(rootFolder, '**/*.js'), { ignore });

const missingKeysInCode = [];
const regex = /\bt\('([^']+)',?.|\s*\)/g;
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(regex);
  for (const match of matches) {
    const key = match[1];
    if (!key) continue;
    if (!lodash.get(enDict, key)) {
      missingKeysInCode.push(
        `Invalid translation key: "${key}" in ${basename(file)}.`,
      );
    }
  }
});

if (missingKeysInCode.length > 0) {
  throw new Error(missingKeysInCode.join('\n'));
}

console.log(
  'All translation keys used in the source code are present in the English translations.',
);
