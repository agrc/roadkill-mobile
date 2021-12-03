import config from '../config.js';
import { storage } from './clients.js';

const bucket = storage.bucket(config.GCP_BUCKET_ID_IMAGES);

export async function getIDImage(key) {
  const file = bucket.file(`${key}.jpg`);
  const [exists] = await file.exists();

  return exists ? file : null;
}
