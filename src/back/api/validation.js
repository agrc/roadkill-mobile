export default function validate(schema) {
  return (request, response, next) => {
    try {
      schema.validateSync(request.body);
      next();
    } catch (error) {
      return response.status(400).json({
        errors: error.errors,
      });
    }
  };
}

// Remove after cached submissions created before the mobile input limit have retried.
export function truncateOverlongComments(request, _, next) {
  const { comments } = request.body;
  if (typeof comments === 'string' && comments.length > 512) {
    console.warn('truncating overlong report comments', {
      originalLength: comments.length,
      url: request.originalUrl,
    });
    request.body.comments = comments.slice(0, 512);
  }

  next();
}
