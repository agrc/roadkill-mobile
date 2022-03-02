import commonConfig from 'common/config.js';
import sharp from 'sharp';

const resizer = sharp().resize(commonConfig.reportPhotoThumbnailSize, commonConfig.reportPhotoThumbnailSize).png();
export function getGetPhotoHandler(thumb, getPhoto) {
  return async function getPhotoHandler(request, response) {
    const { photoId } = request.params;
    const file = await getPhoto(photoId);

    if (file) {
      const [metadata] = await file.getMetadata();
      response.set('Cache-Control', `public, max-age=${60 * 60 * 6}`); // 6 hours
      let stream = file.createReadStream({
        validation: process.env.ENVIRONMENT === 'development' ? false : 'crc32c',
      });

      if (thumb) {
        stream = stream.pipe(resizer);
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
