const validationService = require('../services/validationService');

class ValidationController {
  /**
   * POST /validate - Validate emergency request
   * 
   * This is the core endpoint of the entire system.
   * It determines whether an emergency request can be fulfilled.
   */
  async validateRequest(req, res, next) {
    try {
      const { city, requiredIcuBeds, requiredAmbulanceCapacity } = req.body;

      // Input validation
      if (!city || requiredIcuBeds === undefined || requiredAmbulanceCapacity === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required fields: city, requiredIcuBeds, requiredAmbulanceCapacity',
            statusCode: 400
          }
        });
      }

      // Validate positive numbers
      if (requiredIcuBeds < 0 || requiredAmbulanceCapacity < 0) {
        return res.status(400).json({
          error: {
            message: 'Required resources must be non-negative',
            statusCode: 400
          }
        });
      }

      // Perform validation
      const result = await validationService.validateEmergencyRequest({
        city,
        requiredIcuBeds: parseInt(requiredIcuBeds),
        requiredAmbulanceCapacity: parseInt(requiredAmbulanceCapacity)
      });

      // Return appropriate status code
      // 200: Validation completed (whether approved or rejected)
      // The client checks the 'approved' field to determine outcome
      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ValidationController();
