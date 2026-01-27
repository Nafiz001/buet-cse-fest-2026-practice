const orchestrationService = require('../services/orchestrationService');
const logger = require('../utils/logger');

exports.orchestrateEmergency = async (req, res, next) => {
  try {
    const { city, requiredIcuBeds, requiredAmbulanceCapacity } = req.body;

    // Validate input
    if (!city || requiredIcuBeds === undefined || requiredAmbulanceCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: city, requiredIcuBeds, requiredAmbulanceCapacity',
        requestId: req.requestId
      });
    }

    logger.info({ 
      requestId: req.requestId, 
      city, 
      requiredIcuBeds, 
      requiredAmbulanceCapacity 
    }, 'Starting emergency orchestration');

    // Execute orchestration workflow
    const result = await orchestrationService.orchestrateEmergency({
      city,
      requiredIcuBeds: Number(requiredIcuBeds),
      requiredAmbulanceCapacity: Number(requiredAmbulanceCapacity),
      requestId: req.requestId
    });

    if (result.success) {
      logger.info({ 
        requestId: req.requestId, 
        emergencyRequestId: result.emergencyRequestId 
      }, 'Emergency orchestration completed successfully');
      
      return res.status(201).json(result);
    } else {
      logger.warn({ 
        requestId: req.requestId, 
        reason: result.reason 
      }, 'Emergency orchestration rejected');
      
      return res.status(400).json(result);
    }

  } catch (error) {
    logger.error({ 
      requestId: req.requestId, 
      error: error.message 
    }, 'Emergency orchestration failed');
    next(error);
  }
};
