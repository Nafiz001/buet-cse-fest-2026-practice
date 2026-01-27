const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const validationRequestTotal = new client.Counter({
  name: 'validation_requests_total',
  help: 'Total number of validation requests',
  labelNames: ['result', 'city']
});

const validationDuration = new client.Histogram({
  name: 'validation_duration_seconds',
  help: 'Time taken to complete validation',
  buckets: [0.1, 0.5, 1, 2, 5]
});

const downstreamServiceErrors = new client.Counter({
  name: 'downstream_service_errors_total',
  help: 'Errors from downstream services',
  labelNames: ['service']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(validationRequestTotal);
register.registerMetric(validationDuration);
register.registerMetric(downstreamServiceErrors);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  validationRequestTotal,
  validationDuration,
  downstreamServiceErrors
};
