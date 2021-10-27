import sharp from 'sharp';

export function getGetPhotoHandler(thumb, getPhoto) {
  return async function getPhotoHandler(request, response) {
    const { photoId } = request.params;
    const file = await getPhoto(photoId);

    if (file) {
      const metadata = await file.getMetadata();
      response.set('Cache-Control', `public, max-age=${60 * 60 * 6}`);
      const stream = file.createReadStream({
        validation: process.env.ENVIRONMENT === 'development' ? false : 'crc32c',
      });

      if (thumb) {
        stream.pipe(sharp().resize(75, 75).png());
        response.type('image/png');
      } else {
        response.type(metadata.contentType);
      }

      response.writeHead(200);
      stream.on('data', (data) => response.write(data));
      stream.on('error', console.error);

      return stream.on('end', () => response.end());
    }

    return response.status(404).send(`no photo found for id: ${photoId}`);
  };
}
