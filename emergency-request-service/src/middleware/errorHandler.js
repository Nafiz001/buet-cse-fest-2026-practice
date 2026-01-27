const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      requestId: req.id
    }
  }, 'Request error');

  const statusCode = err.statusCode || err.status || 500;
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
