const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');
const { register } = require('./utils/metrics');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const errorHandler = require('./middleware/errorHandler');
const hospitalRoutes = require('./routes/hospitalRoutes');
const hospitalService = require('./services/hospitalService');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging with Pino
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics tracking
app.use(metricsMiddleware);

// Health check endpoint - critical for container orchestration
app.get('/health', async (req, res) => {
  const health = await hospitalService.healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API routes
app.use('/hospitals', hospitalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.path
    }
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
