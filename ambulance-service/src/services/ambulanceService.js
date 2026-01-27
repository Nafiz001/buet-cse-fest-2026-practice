const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { ambulanceCreationTotal, ambulanceStatusGauge } = require('../utils/metrics');

const prisma = new PrismaClient();

/**
 * Business logic for ambulance fleet management
 * Tracks ambulance availability by status and location
 */
class AmbulanceService {
  /**
   * Create a new ambulance
   * @param {Object} ambulanceData - Ambulance information
   * @returns {Promise<Object>} Created ambulance
   */
  async createAmbulance(ambulanceData) {
    const { vehicleId, city, capacity, status } = ambulanceData;

    // Validation
    if (capacity <= 0) {
      const error = new Error('Capacity must be positive');
      error.statusCode = 400;
      throw error;
    }

    // Check for duplicate vehicle ID
    const existing = await prisma.ambulance.findUnique({
      where: { vehicleId }
    });

    if (existing) {
      const error = new Error(`Ambulance with vehicleId ${vehicleId} already exists`);
      error.statusCode = 409;
      throw error;
    }

    try {
      const ambulance = await prisma.ambulance.create({
        data: {
          vehicleId,
          city: city.toLowerCase(),
          capacity: parseInt(capacity),
          status: status || 'AVAILABLE'
        }
      });

      ambulanceCreationTotal.inc();
      
      // Update status gauge
      await this.updateStatusMetrics();

      logger.info({ 
        ambulanceId: ambulance.id, 
        vehicleId: ambulance.vehicleId,
        city: ambulance.city 
      }, 'Ambulance created');

      return ambulance;
    } catch (error) {
      logger.error({ error, ambulanceData }, 'Failed to create ambulance');
      throw error;
    }
  }

  /**
   * Get all ambulances, optionally filtered by city and/or status
   * @param {string} city - Optional city filter
   * @param {string} status - Optional status filter (AVAILABLE or BUSY)
   * @returns {Promise<Array>} List of ambulances
   */
  async getAmbulances(city, status) {
    try {
      const where = {};
      if (city) where.city = city.toLowerCase();
      if (status) where.status = status;

      const ambulances = await prisma.ambulance.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      logger.info({ 
        count: ambulances.length, 
        city, 
        status 
      }, 'Ambulances retrieved');

      return ambulances;
    } catch (error) {
      logger.error({ error, city, status }, 'Failed to retrieve ambulances');
      throw error;
    }
  }

  /**
   * Update Prometheus metrics for ambulance status
   * Used for real-time monitoring of fleet availability
   */
  async updateStatusMetrics() {
    try {
      const ambulances = await prisma.ambulance.findMany();
      
      // Group by city and status
      const grouped = {};
      ambulances.forEach(amb => {
        const key = `${amb.city}:${amb.status}`;
        grouped[key] = (grouped[key] || 0) + 1;
      });

      // Reset and update gauge
      ambulanceStatusGauge.reset();
      Object.entries(grouped).forEach(([key, count]) => {
        const [city, status] = key.split(':');
        ambulanceStatusGauge.set({ city, status }, count);
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update status metrics');
    }
  }

  /**
   * Health check
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
   * Allocate ambulance capacity from available ambulances in a city
   * Reduces available capacity or marks ambulances as BUSY
   * 
   * @param {string} city - City name
   * @param {number} capacity - Total capacity needed
   * @returns {Promise<Object>} Allocation result
   */
  async allocateCapacity(city, capacity) {
    try {
      // Get all available ambulances in the city with capacity
      const ambulances = await prisma.ambulance.findMany({
        where: { 
          city: city.toLowerCase(),
          status: 'AVAILABLE',
          capacity: { gt: 0 }
        },
        orderBy: { capacity: 'desc' }
      });

      if (ambulances.length === 0) {
        const error = new Error('No available ambulances in this city');
        error.statusCode = 404;
        throw error;
      }

      // Calculate total available capacity
      const totalAvailable = ambulances.reduce((sum, a) => sum + a.capacity, 0);

      if (totalAvailable < capacity) {
        const error = new Error(`Insufficient ambulance capacity. Required: ${capacity}, Available: ${totalAvailable}`);
        error.statusCode = 400;
        throw error;
      }

      // Allocate capacity from ambulances
      let remaining = capacity;
      const allocations = [];

      for (const ambulance of ambulances) {
        if (remaining === 0) break;

        // Allocate from this ambulance (up to its available capacity)
        const toAllocate = Math.min(ambulance.capacity, remaining);
        const newCapacity = ambulance.capacity - toAllocate;
        
        // Mark as BUSY if capacity drops to 0
        const newStatus = newCapacity === 0 ? 'BUSY' : 'AVAILABLE';

        await prisma.ambulance.update({
          where: { id: ambulance.id },
          data: { 
            capacity: newCapacity,
            status: newStatus
          }
        });

        allocations.push({
          ambulanceId: ambulance.id,
          vehicleId: ambulance.vehicleId,
          allocated: toAllocate,
          remainingCapacity: newCapacity,
          status: newStatus
        });

        remaining -= toAllocate;
      }

      // Update metrics
      await this.updateStatusMetrics();

      logger.info({ 
        city, 
        requestedCapacity: capacity, 
        allocations 
      }, 'Ambulance capacity allocated');

      return {
        city,
        totalAllocated: capacity,
        allocations
      };

    } catch (error) {
      logger.error({ error, city, capacity }, 'Failed to allocate ambulance capacity');
      throw error;
    }
  }
}

module.exports = new AmbulanceService();
