const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
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