const ambulanceService = require('../services/ambulanceService');

class AmbulanceController {
  /**
   * POST /ambulances - Create a new ambulance
   */
  async createAmbulance(req, res, next) {
    try {
      const { vehicleId, city, capacity, status } = req.body;

      // Input validation
      if (!vehicleId || !city || capacity === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required fields: vehicleId, city, capacity',
            statusCode: 400
          }
        });
      }

      // Validate status enum if provided
      if (status && !['AVAILABLE', 'BUSY'].includes(status)) {
        return res.status(400).json({
          error: {
            message: 'Status must be either AVAILABLE or BUSY',
            statusCode: 400
          }
        });
      }

      const ambulance = await ambulanceService.createAmbulance({
        vehicleId,
        city,
        capacity: parseInt(capacity),
        status
      });

      res.status(201).json({
        success: true,
        data: ambulance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ambulances - Retrieve all ambulances
   * Query params: ?city=<city>&status=<AVAILABLE|BUSY>
   */
  async getAmbulances(req, res, next) {
    try {
      const { city, status } = req.query;

      // Validate status if provided
      if (status && !['AVAILABLE', 'BUSY'].includes(status)) {
        return res.status(400).json({
          error: {
            message: 'Status must be either AVAILABLE or BUSY',
            statusCode: 400
          }
        });
      }

      const ambulances = await ambulanceService.getAmbulances(city, status);

      res.status(200).json({
        success: true,
        count: ambulances.length,
        data: ambulances
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ambulances/allocate - Allocate ambulance capacity
   */
  async allocateCapacity(req, res, next) {
    try {
      const { city, capacity } = req.body;

      if (!city || capacity === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required fields: city, capacity',
            statusCode: 400
          }
        });
      }

      const result = await ambulanceService.allocateCapacity(city, parseInt(capacity));

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AmbulanceController();
