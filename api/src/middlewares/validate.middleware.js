const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // Return all errors, not just the first one
    stripUnknown: true, // Remove unknown fields that are not defined in the schema
    convert: true, // Attempt to convert values to the required types (e.g., strings to numbers)
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));

    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  req.body = value;
  return next();
};

export { validate };