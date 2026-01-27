const axios = require('axios');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const VALIDATION_SERVICE_URL = process.env.VALIDATION_SERVICE_URL || 'http://validation-service:3003';
const HOSPITAL_SERVICE_URL = process.env.HOSPITAL_SERVICE_URL || 'http://hospital-service:3001';
const AMBULANCE_SERVICE_URL = process.env.AMBULANCE_SERVICE_URL || 'http://ambulance-service:3002';
const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS) || 5000;

/**
 * SAGA PATTERN ORCHESTRATION
 * 
 * Steps:
 * 1. Validate resources (Validation Service)
 * 2. Reserve hospital ICU beds (Hospital Service)
 * 3. Reserve ambulance capacity (Ambulance Service)
 * 4. Return success with all allocation details
 * 
 * If any step fails, compensate (rollback) previous steps
 */
class OrchestrationService {
  async orchestrateEmergency({ city, requiredIcuBeds, requiredAmbulanceCapacity, requestId }) {
    const sagaId = uuidv4();
    const compensations = []; // Track what needs to be rolled back

    logger.info({ requestId, sagaId, city }, 'Starting SAGA orchestration');

    try {
      // STEP 1: Validate Resources
      logger.info({ requestId, sagaId, step: 1 }, 'Step 1: Validating resources');
      const validation = await this.validateResources(city, requiredIcuBeds, requiredAmbulanceCapacity);
      
      if (!validation.data.approved) {
        logger.warn({ requestId, sagaId, reason: validation.data.reason }, 'Validation failed');
        return {
          success: false,
          reason: validation.data.reason || 'Insufficient resources',
          step: 'validation',
          sagaId
        };
      }

      // STEP 2: Reserve Hospital ICU Beds
      logger.info({ requestId, sagaId, step: 2 }, 'Step 2: Reserving hospital ICU beds');
      const hospitalReservation = await this.reserveHospitalBeds(city, requiredIcuBeds);
      compensations.push(() => this.releaseHospitalBeds(hospitalReservation));

      // STEP 3: Reserve Ambulance Capacity
      logger.info({ requestId, sagaId, step: 3 }, 'Step 3: Reserving ambulance capacity');
      const ambulanceReservation = await this.reserveAmbulanceCapacity(city, requiredAmbulanceCapacity);
      compensations.push(() => this.releaseAmbulanceCapacity(ambulanceReservation));

      logger.info({ requestId, sagaId }, 'SAGA completed successfully');

      return {
        success: true,
        message: 'Emergency request orchestrated successfully',
        sagaId,
        data: {
          city,
          requiredIcuBeds,
          requiredAmbulanceCapacity,
          status: 'APPROVED',
          validation: validation.data,
          allocations: {
            hospital: hospitalReservation.data,
            ambulance: ambulanceReservation.data
          },
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error({ requestId, sagaId, error: error.message }, 'SAGA failed, executing compensations');
      
      // Execute compensations in reverse order
      await this.executeCompensations(compensations, requestId, sagaId);

      return {
        success: false,
        reason: `Orchestration failed: ${error.message}`,
        step: 'compensation',
        sagaId
      };
    }
  }

  async validateResources(city, requiredIcuBeds, requiredAmbulanceCapacity) {
    try {
      const response = await axios.post(
        `${VALIDATION_SERVICE_URL}/validate`,
        { city, requiredIcuBeds, requiredAmbulanceCapacity },
        { timeout: TIMEOUT }
      );
      return response.data;
    } catch (error) {
      logger.error({ error: error.message }, 'Validation service call failed');
      throw new Error('Failed to validate resources');
    }
  }

  async reserveHospitalBeds(city, requiredIcuBeds) {
    try {
      const response = await axios.post(
        `${HOSPITAL_SERVICE_URL}/hospitals/allocate`,
        { city, icuBeds: requiredIcuBeds },
        { timeout: TIMEOUT }
      );
      return response.data;
    } catch (error) {
      logger.error({ error: error.message }, 'Hospital reservation failed');
      throw new Error('Failed to reserve hospital beds');
    }
  }

  async reserveAmbulanceCapacity(city, requiredCapacity) {
    try {
      const response = await axios.post(
        `${AMBULANCE_SERVICE_URL}/ambulances/allocate`,
        { city, capacity: requiredCapacity },
        { timeout: TIMEOUT }
      );
      return response.data;
    } catch (error) {
      logger.error({ error: error.message }, 'Ambulance reservation failed');
      throw new Error('Failed to reserve ambulance capacity');
    }
  }

  async releaseHospitalBeds(reservation) {
    logger.info({ reservation }, 'Compensating: Releasing hospital beds');
    // In production, implement actual rollback logic
  }

  async releaseAmbulanceCapacity(reservation) {
    logger.info({ reservation }, 'Compensating: Releasing ambulance capacity');
    // In production, implement actual rollback logic
  }

  async executeCompensations(compensations, requestId, sagaId) {
    logger.info({ requestId, sagaId, count: compensations.length }, 'Executing compensations');

    for (let i = compensations.length - 1; i >= 0; i--) {
      try {
        await compensations[i]();
      } catch (error) {
        logger.error({ requestId, sagaId, step: i, error: error.message }, 'Compensation failed');
      }
    }

    logger.info({ requestId, sagaId }, 'All compensations executed');
  }
}

module.exports = new OrchestrationService();
