const express = require('express');
const router = express.Router();
const orchestrationController = require('../controllers/orchestrationController');

// Main orchestration endpoint
router.post('/emergency', orchestrationController.orchestrateEmergency);

module.exports = router;
