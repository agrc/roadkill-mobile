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
