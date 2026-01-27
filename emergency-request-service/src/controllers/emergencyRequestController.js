const emergencyRequestService = require('../services/emergencyRequestService');

class EmergencyRequestController {
  /**
   * POST /requests - Create new emergency request
   */
  async createRequest(req, res, next) {
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

      const request = await emergencyRequestService.createEmergencyRequest({
        city,
        requiredIcuBeds: parseInt(requiredIcuBeds),
        requiredAmbulanceCapacity: parseInt(requiredAmbulanceCapacity)
      });

      // Return appropriate status code based on request status
      const statusCode = request.status === 'APPROVED' ? 201 : 200;

      res.status(statusCode).json({
        success: true,
        data: request
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /requests/:id - Get request by ID
   */
  async getRequestById(req, res, next) {
    try {
      const { id } = req.params;

      const request = await emergencyRequestService.getRequestById(id);

      res.status(200).json({
        success: true,
        data: request
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /requests - Get all requests with optional filters
   */
  async getRequests(req, res, next) {
    try {
      const { city, status, limit } = req.query;

      // Validate status if provided
      if (status && !['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          error: {
            message: 'Status must be either APPROVED or REJECTED',
            statusCode: 400
          }
        });
      }

      const requests = await emergencyRequestService.getRequests({
        city,
        status,
        limit
      });

      res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmergencyRequestController();
