require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

/**
 * Start the Hospital Service
 * Handles graceful shutdown on SIGTERM/SIGINT
 */
const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    env: process.env.NODE_ENV,
    service: 'hospital-service'
  }, 'Hospital Service started successfully');
});

// Graceful shutdown handler
// Important for container orchestration (Docker, Kubernetes)
function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
