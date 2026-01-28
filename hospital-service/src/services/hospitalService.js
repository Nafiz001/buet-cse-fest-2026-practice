const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { hospitalCreationTotal } = require('../utils/metrics');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty'
});

// Connect to database and handle connection errors
prisma.$connect()
  .then(() => {
    logger.info('Database connected successfully');
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to connect to database');
  });

/**
 * Business logic layer for hospital operations
 * Separates data access from controller logic
 */
class HospitalService {
  /**
   * Create a new hospital
   * @param {Object} hospitalData - Hospital information
   * @returns {Promise<Object>} Created hospital
   */
  async createHospital(hospitalData) {
    const { name, city, icuBeds, ventilators } = hospitalData;

    // Validation: ensure positive resource counts
    if (icuBeds < 0 || ventilators < 0) {
      const error = new Error('ICU beds and ventilators must be non-negative');
      error.statusCode = 400;
      throw error;
    }

    try {
      const hospital = await prisma.hospital.create({
        data: {
          name,
          city: city.toLowerCase(), // Normalize city names for consistent querying
          icuBeds,
          ventilators
        }
      });

      hospitalCreationTotal.inc();
      logger.info({ hospitalId: hospital.id, city: hospital.city }, 'Hospital created');

      return hospital;
    } catch (error) {
      logger.error({ error, hospitalData }, 'Failed to create hospital');
      throw error;
    }
  }

  /**
   * Get all hospitals, optionally filtered by city
   * @param {string} city - Optional city filter
   * @returns {Promise<Array>} List of hospitals
   */
  async getHospitals(city) {
    try {
      // Check database connection first
      await prisma.$queryRaw`SELECT 1`;
      
      const where = city ? { city: city.toLowerCase() } : {};
      
      const hospitals = await prisma.hospital.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      logger.info({ count: hospitals.length, city }, 'Hospitals retrieved');
      return hospitals;
    } catch (error) {
      logger.error({ error, city }, 'Failed to retrieve hospitals');
      
      // Create a more informative error
      const err = new Error(`Database error: ${error.message}`);
      err.statusCode = 500;
      err.originalError = error;
      throw err;
    }
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected' };
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
  }

  /**
   * Allocate ICU beds from hospitals in a city
   * Reduces available ICU beds proportionally across hospitals
   * 
   * @param {string} city - City name
   * @param {number} icuBeds - Number of ICU beds to allocate
   * @returns {Promise<Object>} Allocation result
   */
  async allocateIcuBeds(city, icuBeds) {
    try {
      // Get all hospitals in the city with available ICU beds
      const hospitals = await prisma.hospital.findMany({
        where: { 
          city: city.toLowerCase(),
          icuBeds: { gt: 0 }
        },
        orderBy: { icuBeds: 'desc' }
      });

      if (hospitals.length === 0) {
        const error = new Error('No hospitals with available ICU beds in this city');
        error.statusCode = 404;
        throw error;
      }

      // Calculate total available ICU beds
      const totalAvailable = hospitals.reduce((sum, h) => sum + h.icuBeds, 0);

      if (totalAvailable < icuBeds) {
        const error = new Error(`Insufficient ICU beds. Required: ${icuBeds}, Available: ${totalAvailable}`);
        error.statusCode = 400;
        throw error;
      }

      // Allocate beds proportionally from each hospital
      let remaining = icuBeds;
      const allocations = [];

      for (const hospital of hospitals) {
        if (remaining === 0) break;

        // Allocate from this hospital (up to its available beds)
        const toAllocate = Math.min(hospital.icuBeds, remaining);
        
        await prisma.hospital.update({
          where: { id: hospital.id },
          data: { icuBeds: hospital.icuBeds - toAllocate }
        });

        allocations.push({
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          allocated: toAllocate
        });

        remaining -= toAllocate;
      }

      logger.info({ 
        city, 
        requestedBeds: icuBeds, 
        allocations 
      }, 'ICU beds allocated');

      return {
        city,
        totalAllocated: icuBeds,
        allocations
      };

    } catch (error) {
      logger.error({ error, city, icuBeds }, 'Failed to allocate ICU beds');
      throw error;
    }
  }
}

module.exports = new HospitalService();
