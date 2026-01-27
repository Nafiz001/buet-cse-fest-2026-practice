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

const emergencyRequestTotal = new client.Counter({
  name: 'emergency_requests_total',
  help: 'Total number of emergency requests',
  labelNames: ['status', 'city']
});

const emergencyRequestDuration = new client.Histogram({
  name: 'emergency_request_duration_seconds',
  help: 'Time to process emergency request',
  buckets: [0.5, 1, 2, 5, 10]
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(emergencyRequestTotal);
register.registerMetric(emergencyRequestDuration);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  emergencyRequestTotal,
  emergencyRequestDuration
};
