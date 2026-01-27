const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const orchestrationRoutes = require('./routes/orchestrationRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { register, collectDefaultMetrics } = require('prom-client');

collectDefaultMetrics();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const requestId = Math.floor(Math.random() * 100000);
  req.requestId = requestId;
  logger.info({
    requestId,
    method: req.method,
    path: req.path
  }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'orchestrator-service',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.use('/orchestrate', orchestrationRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
