const ok = (res, data, message = 'OK') =>
  res.status(200).json({ success: true, data, message });

const created = (res, data, message = 'Created') =>
  res.status(201).json({ success: true, data, message });

const noContent = (res) =>
  res.status(204).send();

const badRequest = (res, message = 'Bad request', code = 'BAD_REQUEST') =>
  res.status(400).json({ success: false, code, message });

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, code: 'UNAUTHORIZED', message });

const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, code: 'FORBIDDEN', message });

const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, code: 'NOT_FOUND', message });

const conflict = (res, message = 'Conflict', code = 'CONFLICT') =>
  res.status(409).json({ success: false, code, message });

const unprocessable = (res, errors = [], message = 'Validation failed') =>
  res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message, errors });

const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message });

export {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,
};