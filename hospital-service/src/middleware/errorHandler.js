const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 * Ensures consistent error responses across all endpoints
 */
function errorHandler(err, req, res, next) {
  // Log the error with request context
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      requestId: req.id
    }
  }, 'Request error');

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Don't leak internal errors to client in production
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'An error occurred';

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      requestId: req.id,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

module.exports = errorHandler;
