const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  logger.error({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack
  }, 'Unhandled error');

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    requestId: req.requestId
  });
};
