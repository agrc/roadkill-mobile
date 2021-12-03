import mime from 'mime';
import { v4 as uuid } from 'uuid';
import config from '../config.js';
import { db, storage } from './clients.js';

const bucket = storage.bucket(config.GCP_BUCKET_PHOTOS);

export async function upload(file, userId) {
  const path = `${userId}/${uuid()}.${mime.getExtension(file.mimetype)}`;

  const blob = bucket.file(path);

  await blob.save(file.buffer);

  return path;
}

export async function getPhoto(photoId) {
  const row = await db('photos').select('bucket_path').where({ id: photoId }).first();
  const file = bucket.file(row.bucket_path);

  const [exists] = await file.exists();

  return exists ? file : null;
}
