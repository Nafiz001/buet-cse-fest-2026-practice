const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const { emergencyRequestTotal, emergencyRequestDuration } = require('../utils/metrics');

const prisma = new PrismaClient();

/**
 * Emergency Request Orchestration Service
 * 
 * This service handles incoming emergency requests and orchestrates
 * the validation flow. It delegates decision-making to the Validation Service.
 * 
 * Key principle: This service NEVER makes validation decisions itself.
 * It trusts the Validation Service completely.
 */
class EmergencyRequestService {
  constructor() {
    this.validationServiceUrl = process.env.VALIDATION_SERVICE_URL || 'http://localhost:3003';
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 5000;
  }

  /**
   * Create and process an emergency request
   * 
   * Flow:
   * 1. Receive request
   * 2. Call Validation Service
   * 3. If approved → allocate resources → save as APPROVED
   * 4. If rejected → save as REJECTED
   * 5. Return result to client
   * 
   * @param {Object} requestData - Emergency request details
   * @returns {Promise<Object>} Created request with status
   */
  async createEmergencyRequest(requestData) {
    const startTime = Date.now();
    const { city, requiredIcuBeds, requiredAmbulanceCapacity } = requestData;

    logger.info({ 
      city, 
      requiredIcuBeds, 
      requiredAmbulanceCapacity 
    }, 'Processing emergency request');

    try {
      // STEP 1: Call Validation Service for decision
      const validation = await this.callValidationService({
        city,
        requiredIcuBeds,
        requiredAmbulanceCapacity
      });

      // STEP 2: Determine status based on validation result
      const status = validation.approved ? 'APPROVED' : 'REJECTED';

      // STEP 3: If approved, allocate resources
      if (validation.approved) {
        try {
          await this.allocateResources({
            city,
            requiredIcuBeds,
            requiredAmbulanceCapacity
          });
          logger.info({ city, requiredIcuBeds, requiredAmbulanceCapacity }, 'Resources allocated successfully');
        } catch (allocationError) {
          logger.error({ 
            error: allocationError.message,
            city 
          }, 'Resource allocation failed after approval');
          // Continue anyway - we've already approved the request
          // In production, you might want to implement compensation logic
        }
      }

      // STEP 4: Save request to database with validation details
      // We store everything for auditability and debugging
      const emergencyRequest = await prisma.emergencyRequest.create({
        data: {
          city: city.toLowerCase(),
          requiredIcuBeds,
          requiredAmbulanceCapacity,
          status,
          validationReason: validation.reason || null,
          validationDetails: validation // Store complete validation response
        }
      });

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      emergencyRequestDuration.observe(duration);
      emergencyRequestTotal.inc({ status, city: city.toLowerCase() });

      logger.info({
        requestId: emergencyRequest.id,
        status,
        city,
        durationSeconds: duration
      }, 'Emergency request processed');

      return {
        ...emergencyRequest,
        validationDetails: validation // Include validation details in response
      };

    } catch (error) {
      logger.error({ 
        error: error.message,
        city,
        stack: error.stack
      }, 'Failed to process emergency request');

      // If validation service is down, we cannot proceed
      // We do NOT save the request because we cannot validate it
      throw error;
    }
  }

  /**
   * Call Validation Service
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} Validation result
   */
  async callValidationService(requestData) {
    try {
      logger.debug({ 
        url: this.validationServiceUrl,
        requestData 
      }, 'Calling Validation Service');

      const response = await axios.post(
        `${this.validationServiceUrl}/validate`,
        requestData,
        { timeout: this.requestTimeout }
      );

      if (!response.data || !response.data.success) {
        throw new Error('Invalid response from Validation Service');
      }

      return response.data.data;

    } catch (error) {
      logger.error({ 
        error: error.message,
        requestData,
        service: 'validation'
      }, 'Validation Service call failed');

      // Re-throw with clear message
      const err = new Error(`Validation Service unavailable: ${error.message}`);
      err.statusCode = 503;
      throw err;
    }
  }

  /**
   * Get request by ID
   * @param {string} id - Request ID
   * @returns {Promise<Object>} Emergency request
   */
  async getRequestById(id) {
    try {
      const request = await prisma.emergencyRequest.findUnique({
        where: { id }
      });

      if (!request) {
        const error = new Error('Emergency request not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info({ requestId: id }, 'Retrieved emergency request');
      return request;

    } catch (error) {
      if (error.statusCode === 404) throw error;
      
      logger.error({ error, id }, 'Failed to retrieve request');
      throw error;
    }
  }

  /**
   * Get all requests with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of requests
   */
  async getRequests(filters = {}) {
    try {
      const { city, status, limit = 50 } = filters;
      
      const where = {};
      if (city) where.city = city.toLowerCase();
      if (status) where.status = status;

      const requests = await prisma.emergencyRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit)
      });

      logger.info({ 
        count: requests.length,
        filters 
      }, 'Retrieved emergency requests');

      return requests;

    } catch (error) {
      logger.error({ error, filters }, 'Failed to retrieve requests');
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { 
        status: 'healthy', 
        database: 'connected',
        validationService: this.validationServiceUrl
      };
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return { 
        status: 'unhealthy', 
        database: 'disconnected', 
        error: error.message 
      };
    }
  }

  /**
   * Allocate resources after approval
   * Reduces available ICU beds and ambulance capacity
   * 
   * @param {Object} allocation - Allocation details
   * @param {string} allocation.city - City name
   * @param {number} allocation.requiredIcuBeds - ICU beds to allocate
   * @param {number} allocation.requiredAmbulanceCapacity - Ambulance capacity to allocate
   */
  async allocateResources({ city, requiredIcuBeds, requiredAmbulanceCapacity }) {
    const hospitalServiceUrl = process.env.HOSPITAL_SERVICE_URL || 'http://hospital-service:3001';
    const ambulanceServiceUrl = process.env.AMBULANCE_SERVICE_URL || 'http://ambulance-service:3002';

    try {
      // Allocate ICU beds from hospitals
      if (requiredIcuBeds > 0) {
        await axios.post(
          `${hospitalServiceUrl}/hospitals/allocate`,
          { city: city.toLowerCase(), icuBeds: requiredIcuBeds },
          { timeout: this.requestTimeout }
        );
      }

      // Allocate ambulance capacity
      if (requiredAmbulanceCapacity > 0) {
        await axios.post(
          `${ambulanceServiceUrl}/ambulances/allocate`,
          { city: city.toLowerCase(), capacity: requiredAmbulanceCapacity },
          { timeout: this.requestTimeout }
        );
      }

      logger.info({ 
        city, 
        requiredIcuBeds, 
        requiredAmbulanceCapacity 
      }, 'Resources allocated successfully');

    } catch (error) {
      logger.error({ 
        error: error.message,
        city,
        requiredIcuBeds,
        requiredAmbulanceCapacity
      }, 'Failed to allocate resources');
      throw error;
    }
  }
}

module.exports = new EmergencyRequestService();
