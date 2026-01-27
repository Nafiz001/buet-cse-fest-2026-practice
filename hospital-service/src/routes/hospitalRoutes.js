const express = require('express');
const hospitalController = require('../controllers/hospitalController');

const router = express.Router();

/**
 * Hospital Routes
 * Simple CRUD operations for hospital management
 */

// POST /hospitals - Create new hospital
router.post('/', (req, res, next) => hospitalController.createHospital(req, res, next));

// GET /hospitals - Get all hospitals (with optional ?city= query param)
router.get('/', (req, res, next) => hospitalController.getHospitals(req, res, next));

// POST /hospitals/allocate - Allocate ICU beds
router.post('/allocate', (req, res, next) => hospitalController.allocateIcuBeds(req, res, next));

module.exports = router;
