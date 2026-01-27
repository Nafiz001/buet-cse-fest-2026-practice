require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3003;

const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    env: process.env.NODE_ENV,
    service: 'validation-service',
    hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL,
    ambulanceServiceUrl: process.env.AMBULANCE_SERVICE_URL
  }, 'Validation Service started successfully');
});

function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
