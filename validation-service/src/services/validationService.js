const axios = require('axios');
const logger = require('../utils/logger');
const { 
  validationRequestTotal, 
  validationDuration,
  downstreamServiceErrors 
} = require('../utils/metrics');

/**
 * CORE BUSINESS LOGIC SERVICE
 * 
 * This service is the decision-maker for emergency requests.
 * It implements atomic validation without distributed transactions.
 * 
 * Philosophy:
 * - Fetch all required data from downstream services
 * - Validate ALL constraints together
 * - Return single APPROVE or REJECT decision
 * - Never partially execute
 * - Fail safely on downstream errors
 */
class ValidationService {
  constructor() {
    this.hospitalServiceUrl = process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3001';
    this.ambulanceServiceUrl = process.env.AMBULANCE_SERVICE_URL || 'http://localhost:3002';
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 5000;
  }

  /**
   * Validate emergency request feasibility
   * 
   * This is the central decision-making function.
   * All constraints must pass for approval.
   * 
   * @param {Object} request - Emergency request details
   * @param {string} request.city - Target city
   * @param {number} request.requiredIcuBeds - Required ICU beds
   * @param {number} request.requiredAmbulanceCapacity - Required ambulance capacity
   * @returns {Promise<Object>} Validation result
   */
  async validateEmergencyRequest(request) {
    const startTime = Date.now();
    const { city, requiredIcuBeds, requiredAmbulanceCapacity } = request;

    logger.info({ 
      city, 
      requiredIcuBeds, 
      requiredAmbulanceCapacity 
    }, 'Starting validation');

    try {
      // STEP 1: Fetch hospital data for the city
      // This call may fail - we handle it gracefully
      const hospitals = await this.fetchHospitals(city);
      
      // STEP 2: Fetch available ambulances for the city
      // This call may also fail - we handle it gracefully
      const ambulances = await this.fetchAvailableAmbulances(city);

      // STEP 3: Calculate available resources
      const totalIcuBeds = this.calculateTotalIcuBeds(hospitals);
      const totalAmbulanceCapacity = this.calculateTotalAmbulanceCapacity(ambulances);

      // STEP 4: Validate ALL constraints atomically
      const validation = this.validateConstraints({
        totalIcuBeds,
        requiredIcuBeds,
        totalAmbulanceCapacity,
        requiredAmbulanceCapacity,
        city
      });

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      validationDuration.observe(duration);
      validationRequestTotal.inc({ 
        result: validation.approved ? 'approved' : 'rejected',
        city 
      });

      logger.info({ 
        ...validation,
        durationSeconds: duration 
      }, 'Validation completed');

      return validation;

    } catch (error) {
      // Downstream service failure - fail safely
      // We REJECT the request because we cannot verify resources
      logger.error({ 
        error: error.message,
        city,
        stack: error.stack
      }, 'Validation failed due to downstream error');

      const duration = (Date.now() - startTime) / 1000;
      validationDuration.observe(duration);
      validationRequestTotal.inc({ result: 'error', city });

      // Return rejection with clear explanation
      return {
        approved: false,
        reason: 'DOWNSTREAM_SERVICE_UNAVAILABLE',
        message: 'Cannot validate request due to service unavailability',
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Fetch hospitals from Hospital Service
   * @param {string} city - City name
   * @returns {Promise<Array>} List of hospitals
   */
  async fetchHospitals(city) {
    try {
      logger.debug({ city, url: this.hospitalServiceUrl }, 'Fetching hospitals');
      
      const response = await axios.get(`${this.hospitalServiceUrl}/hospitals`, {
        params: { city },
        timeout: this.requestTimeout
      });

      if (!response.data || !response.data.success) {
        throw new Error('Invalid response from Hospital Service');
      }

      return response.data.data || [];
    } catch (error) {
      downstreamServiceErrors.inc({ service: 'hospital' });
      logger.error({ 
        error: error.message,
        city,
        service: 'hospital'
      }, 'Failed to fetch hospitals');
      throw new Error(`Hospital Service unavailable: ${error.message}`);
    }
  }

  /**
   * Fetch available ambulances from Ambulance Service
   * @param {string} city - City name
   * @returns {Promise<Array>} List of available ambulances
   */
  async fetchAvailableAmbulances(city) {
    try {
      logger.debug({ city, url: this.ambulanceServiceUrl }, 'Fetching ambulances');
      
      const response = await axios.get(`${this.ambulanceServiceUrl}/ambulances`, {
        params: { 
          city,
          status: 'AVAILABLE'  // Only fetch available ambulances
        },
        timeout: this.requestTimeout
      });

      if (!response.data || !response.data.success) {
        throw new Error('Invalid response from Ambulance Service');
      }

      return response.data.data || [];
    } catch (error) {
      downstreamServiceErrors.inc({ service: 'ambulance' });
      logger.error({ 
        error: error.message,
        city,
        service: 'ambulance'
      }, 'Failed to fetch ambulances');
      throw new Error(`Ambulance Service unavailable: ${error.message}`);
    }
  }

  /**
   * Calculate total ICU beds across all hospitals
   * @param {Array} hospitals - List of hospitals
   * @returns {number} Total ICU beds
   */
  calculateTotalIcuBeds(hospitals) {
    return hospitals.reduce((sum, hospital) => sum + hospital.icuBeds, 0);
  }

  /**
   * Calculate total ambulance capacity
   * @param {Array} ambulances - List of available ambulances
   * @returns {number} Total capacity
   */
  calculateTotalAmbulanceCapacity(ambulances) {
    return ambulances.reduce((sum, ambulance) => sum + ambulance.capacity, 0);
  }

  /**
   * ATOMIC CONSTRAINT VALIDATION
   * 
   * This is where the magic happens.
   * All constraints are checked together.
   * If ANY constraint fails, the entire request is rejected.
   * 
   * This prevents partial execution without needing distributed transactions.
   * 
   * @param {Object} params - Validation parameters
   * @returns {Object} Validation result
   */
  validateConstraints(params) {
    const {
      totalIcuBeds,
      requiredIcuBeds,
      totalAmbulanceCapacity,
      requiredAmbulanceCapacity,
      city
    } = params;

    // Check ICU bed availability
    const icuBedsAvailable = totalIcuBeds >= requiredIcuBeds;
    
    // Check ambulance capacity availability
    const ambulanceCapacityAvailable = totalAmbulanceCapacity >= requiredAmbulanceCapacity;

    // ATOMIC DECISION: ALL constraints must pass
    const approved = icuBedsAvailable && ambulanceCapacityAvailable;

    // Build detailed response
    const result = {
      approved,
      city,
      timestamp: new Date().toISOString(),
      resources: {
        icuBeds: {
          required: requiredIcuBeds,
          available: totalIcuBeds,
          sufficient: icuBedsAvailable
        },
        ambulanceCapacity: {
          required: requiredAmbulanceCapacity,
          available: totalAmbulanceCapacity,
          sufficient: ambulanceCapacityAvailable
        }
      }
    };

    // Add rejection reason if not approved
    if (!approved) {
      const reasons = [];
      if (!icuBedsAvailable) {
        reasons.push(`Insufficient ICU beds (need ${requiredIcuBeds}, have ${totalIcuBeds})`);
      }
      if (!ambulanceCapacityAvailable) {
        reasons.push(`Insufficient ambulance capacity (need ${requiredAmbulanceCapacity}, have ${totalAmbulanceCapacity})`);
      }
      
      result.reason = 'INSUFFICIENT_RESOURCES';
      result.message = reasons.join('; ');
    }

    return result;
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      status: 'healthy',
      service: 'validation-service',
      downstream: {
        hospitalService: this.hospitalServiceUrl,
        ambulanceService: this.ambulanceServiceUrl
      }
    };
  }
}

module.exports = new ValidationService();
