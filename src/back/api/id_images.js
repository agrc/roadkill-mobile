import commonConfig from 'common/config.js';
import sharp from 'sharp';

export function getGetIDImageHandler(getIDImage) {
  return async function getIDImageHandler(request, response) {
    const { key, pixelRatio } = request.params;
    const file = await getIDImage(key);
    const size = Math.round(pixelRatio * commonConfig.searchListImageSize);

    if (file) {
      const [metadata] = await file.getMetadata();
      response.set('Cache-Control', `public, max-age=${60 * 60 * 24}`); // 24 hours
      const stream = file.createReadStream({
        validation: process.env.ENVIRONMENT === 'development' ? false : 'crc32c',
      });

      response.type(metadata.contentType);
      response.writeHead(200);

      return stream.pipe(sharp().resize(size, size)).pipe(response);
    }

    return response.status(404).send(`no image found for key: ${key}`);
  };
}
