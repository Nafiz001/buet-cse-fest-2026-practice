const { httpRequestDuration, httpRequestTotal } = require('../utils/metrics');

/**
 * Middleware to track HTTP request metrics
 * Records duration and count of requests for observability
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
}

module.exports = metricsMiddleware;
