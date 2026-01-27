const express = require('express');
const validationController = require('../controllers/validationController');

const router = express.Router();

/**
 * Validation Routes
 * Core business logic endpoint
 */

// POST /validate - Validate emergency request feasibility
router.post('/', (req, res, next) => validationController.validateRequest(req, res, next));

module.exports = router;
