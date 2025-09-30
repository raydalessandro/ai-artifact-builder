const { logger } = require('../utils/logger');

/**
 * Error handler middleware
 * Must be the last middleware in the chain
 */
function errorHandler(err, req, res, next) {
  // Log error
  logger.error('Error caught by error handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    details = err.errors;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    status = 409;
    message = 'Resource already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    status = 400;
    message = 'Referenced resource does not exist';
  } else if (err.code === 'ECONNREFUSED') {
    status = 503;
    message = 'Service unavailable - database connection failed';
  }

  // Don't leak error details in production
  const response = {
    error: message,
    status
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = details || err.message;
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
};
