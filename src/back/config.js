export default {
  GCP_BUCKET_PHOTOS: `gs://${process.env.PROJECT_ID || process.env.ENVIRONMENT}-photos`,
  GCP_BUCKET_ID_IMAGES: `gs://${process.env.PROJECT_ID || process.env.ENVIRONMENT}-identification-images`,
};
