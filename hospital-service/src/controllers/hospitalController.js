const hospitalService = require('../services/hospitalService');
const logger = require('../utils/logger');

/**
 * Controller layer - handles HTTP request/response
 * Delegates business logic to service layer
 */
class HospitalController {
  /**
   * POST /hospitals - Create a new hospital
   */
  async createHospital(req, res, next) {
    try {
      const { name, city, icuBeds, ventilators } = req.body;

      // Input validation
      if (!name || !city || icuBeds === undefined || ventilators === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required fields: name, city, icuBeds, ventilators',
            statusCode: 400
          }
        });
      }

      const hospital = await hospitalService.createHospital({
        name,
        city,
        icuBeds: parseInt(icuBeds),
        ventilators: parseInt(ventilators)
      });

      res.status(201).json({
        success: true,
        data: hospital
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /hospitals - Retrieve all hospitals (with optional city filter)
   */
  async getHospitals(req, res, next) {
    try {
      const { city } = req.query;
      const hospitals = await hospitalService.getHospitals(city);

      res.status(200).json({
        success: true,
        count: hospitals.length,
        data: hospitals
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /hospitals/allocate - Allocate ICU beds
   */
  async allocateIcuBeds(req, res, next) {
    try {
      const { city, icuBeds } = req.body;

      if (!city || icuBeds === undefined) {
        return res.status(400).json({
          error: {
            message: 'Missing required fields: city, icuBeds',
            statusCode: 400
          }
        });
      }

      const result = await hospitalService.allocateIcuBeds(city, parseInt(icuBeds));

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HospitalController();
