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

const ambulanceCreationTotal = new client.Counter({
  name: 'ambulance_creations_total',
  help: 'Total number of ambulances created'
});

const ambulanceStatusGauge = new client.Gauge({
  name: 'ambulance_status_total',
  help: 'Number of ambulances by status',
  labelNames: ['status', 'city']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(ambulanceCreationTotal);
register.registerMetric(ambulanceStatusGauge);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  ambulanceCreationTotal,
  ambulanceStatusGauge
};
