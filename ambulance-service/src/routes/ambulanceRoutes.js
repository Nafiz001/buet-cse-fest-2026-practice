const express = require('express');
const ambulanceController = require('../controllers/ambulanceController');

const router = express.Router();

/**
 * Ambulance Routes
 * CRUD operations for ambulance fleet management
 */

// POST /ambulances - Create new ambulance
router.post('/', (req, res, next) => ambulanceController.createAmbulance(req, res, next));

// GET /ambulances - Get all ambulances (with optional filters)
router.get('/', (req, res, next) => ambulanceController.getAmbulances(req, res, next));

// POST /ambulances/allocate - Allocate ambulance capacity
router.post('/allocate', (req, res, next) => ambulanceController.allocateCapacity(req, res, next));

module.exports = router;
