const validate = (
  schema,
  { location = 'body', statusCode = 422 } = {}
) => (req, res, next) => {
  const dataToValidate = req[location] || {};

  const { error, value } = schema.validate(dataToValidate, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));

    return res.status(statusCode).json({
      success: false,
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  if (location === 'query') {
    Object.defineProperty(req, 'query', {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } else {
    req[location] = value;
  }

  return next();
};

export { validate };