import mime from 'mime';
import { v4 as uuid } from 'uuid';
import config from '../config.js';
import { storage } from './clients.js';

const bucket = storage.bucket(config.GCP_BUCKET);
export async function upload(file, userId) {
  const path = `${userId}/${uuid()}.${mime.getExtension(file.mimetype)}`;

  const blob = bucket.file(path);

  await blob.save(file.buffer);

  return path;
}
