import commonConfig from 'common/config.js';
import sharp from 'sharp';

export function getGetPhotoHandler(thumb, getPhoto) {
  return async function getPhotoHandler(request, response) {
    const { photoId } = request.params;
    const file = await getPhoto(photoId);

    if (file) {
      const [metadata] = await file.getMetadata();
      response.set('Cache-Control', `public, max-age=${60 * 60 * 6}`); // 6 hours
      const stream = file.createReadStream({
        validation: process.env.ENVIRONMENT === 'development' ? false : 'crc32c',
      });

      if (thumb) {
        stream.pipe(sharp().resize(commonConfig.reportPhotoThumbnailSize, commonConfig.reportPhotoThumbnailSize).png());
        response.type('image/png');
      } else {
        response.type(metadata.contentType);
      }

      response.writeHead(200);

      return stream.pipe(response);
    }

    return response.status(404).send(`no photo found for id: ${photoId}`);
  };
}
