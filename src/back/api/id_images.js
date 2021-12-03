import commonConfig from 'common/config.js';
import sharp from 'sharp';

export function getGetIDImageHandler(getIDImage) {
  return async function getIDImageHandler(request, response) {
    const { key, pixelRatio } = request.params;
    const file = await getIDImage(key);
    const size = pixelRatio * commonConfig.searchListImageSize;

    if (file) {
      const [metadata] = await file.getMetadata();
      response.set('Cache-Control', `public, max-age=${60 * 60 * 24}`); // 24 hours
      const stream = file.createReadStream({
        validation: process.env.ENVIRONMENT === 'development' ? false : 'crc32c',
      });

      stream.pipe(sharp().resize(size, size));

      response.type(metadata.contentType);
      response.writeHead(200);

      stream.on('data', (data) => response.write(data));
      stream.on('error', console.error);

      return stream.on('end', () => response.end());
    }

    return response.status(404).send(`no image found for key: ${key}`);
  };
}
