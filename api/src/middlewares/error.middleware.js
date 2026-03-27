import { env } from '../config/env.js';

const errorMiddleware = (err, req, res, next) => {
  // console.error(`[${req.method} ${req.path}]`, err);

  if (res.headersSent) return next(err);

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred'
      : err.message;

  return res.status(statusCode).json({
    success: false,
    code,
    message,
  });
};

export { errorMiddleware };