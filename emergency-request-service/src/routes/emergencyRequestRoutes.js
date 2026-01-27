const express = require('express');
const emergencyRequestController = require('../controllers/emergencyRequestController');

const router = express.Router();

/**
 * Emergency Request Routes
 * Main entry point for emergency request processing
 */

// POST /requests - Create new emergency request
router.post('/', (req, res, next) => emergencyRequestController.createRequest(req, res, next));

// GET /requests/:id - Get specific request
router.get('/:id', (req, res, next) => emergencyRequestController.getRequestById(req, res, next));

// GET /requests - Get all requests (with optional filters)
router.get('/', (req, res, next) => emergencyRequestController.getRequests(req, res, next));

module.exports = router;
