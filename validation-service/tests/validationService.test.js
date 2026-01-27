const axios = require('axios');
const ValidationService = require('../src/services/validationService');

// Mock axios
jest.mock('axios');

describe('ValidationService', () => {
  let validationService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create fresh instance with test URLs
    validationService = ValidationService;
    validationService.hospitalServiceUrl = 'http://test-hospital:3001';
    validationService.ambulanceServiceUrl = 'http://test-ambulance:3002';
    validationService.requestTimeout = 5000;
  });

  describe('validateEmergencyRequest - Success Scenarios', () => {
    test('should APPROVE when all resources are sufficient', async () => {
      // Mock hospital response - sufficient ICU beds
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            { id: '1', city: 'dhaka', icuBeds: 50, ventilators: 20 },
            { id: '2', city: 'dhaka', icuBeds: 30, ventilators: 15 }
          ]
        }
      });

      // Mock ambulance response - sufficient capacity
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            { id: '1', vehicleId: 'AMB-001', city: 'dhaka', capacity: 4, status: 'AVAILABLE' },
            { id: '2', vehicleId: 'AMB-002', city: 'dhaka', capacity: 6, status: 'AVAILABLE' }
          ]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 8
      });

      expect(result.approved).toBe(true);
      expect(result.resources.icuBeds.available).toBe(80);
      expect(result.resources.icuBeds.sufficient).toBe(true);
      expect(result.resources.ambulanceCapacity.available).toBe(10);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('should APPROVE when resources exactly meet requirements', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'chittagong', icuBeds: 20, ventilators: 10 }]
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', vehicleId: 'AMB-003', city: 'chittagong', capacity: 5, status: 'AVAILABLE' }]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'chittagong',
        requiredIcuBeds: 20,
        requiredAmbulanceCapacity: 5
      });

      expect(result.approved).toBe(true);
      expect(result.resources.icuBeds.available).toBe(20);
      expect(result.resources.ambulanceCapacity.available).toBe(5);
    });
  });

  describe('validateEmergencyRequest - Rejection Scenarios', () => {
    test('should REJECT when ICU beds are insufficient', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'dhaka', icuBeds: 10, ventilators: 5 }]
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', vehicleId: 'AMB-001', city: 'dhaka', capacity: 10, status: 'AVAILABLE' }]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 5
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_RESOURCES');
      expect(result.message).toContain('Insufficient ICU beds');
      expect(result.message).toContain('need 50, have 10');
      expect(result.resources.icuBeds.sufficient).toBe(false);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(true);
    });

    test('should REJECT when ambulance capacity is insufficient', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'dhaka', icuBeds: 100, ventilators: 50 }]
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', vehicleId: 'AMB-001', city: 'dhaka', capacity: 2, status: 'AVAILABLE' }]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 10
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_RESOURCES');
      expect(result.message).toContain('Insufficient ambulance capacity');
      expect(result.message).toContain('need 10, have 2');
      expect(result.resources.icuBeds.sufficient).toBe(true);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(false);
    });

    test('should REJECT when BOTH resources are insufficient', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'dhaka', icuBeds: 5, ventilators: 2 }]
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', vehicleId: 'AMB-001', city: 'dhaka', capacity: 1, status: 'AVAILABLE' }]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 10
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_RESOURCES');
      expect(result.message).toContain('Insufficient ICU beds');
      expect(result.message).toContain('Insufficient ambulance capacity');
      expect(result.resources.icuBeds.sufficient).toBe(false);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(false);
    });

    test('should REJECT when no hospitals exist in city', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [] // No hospitals
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', vehicleId: 'AMB-001', city: 'sylhet', capacity: 10, status: 'AVAILABLE' }]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'sylhet',
        requiredIcuBeds: 10,
        requiredAmbulanceCapacity: 5
      });

      expect(result.approved).toBe(false);
      expect(result.resources.icuBeds.available).toBe(0);
      expect(result.resources.icuBeds.sufficient).toBe(false);
    });

    test('should REJECT when no ambulances are available in city', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'rajshahi', icuBeds: 50, ventilators: 20 }]
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [] // No available ambulances
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'rajshahi',
        requiredIcuBeds: 20,
        requiredAmbulanceCapacity: 5
      });

      expect(result.approved).toBe(false);
      expect(result.resources.ambulanceCapacity.available).toBe(0);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(false);
    });
  });

  describe('validateEmergencyRequest - Downstream Service Failures', () => {
    test('should REJECT when Hospital Service is unavailable', async () => {
      axios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 10
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('DOWNSTREAM_SERVICE_UNAVAILABLE');
      expect(result.message).toContain('service unavailability');
      expect(result.details.error).toContain('Hospital Service unavailable');
    });

    test('should REJECT when Ambulance Service is unavailable', async () => {
      // Hospital service succeeds
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'dhaka', icuBeds: 100, ventilators: 50 }]
        }
      });

      // Ambulance service fails
      axios.get.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 10
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('DOWNSTREAM_SERVICE_UNAVAILABLE');
      expect(result.details.error).toContain('Ambulance Service unavailable');
    });

    test('should REJECT when Hospital Service returns invalid response', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: false // Invalid response
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 10
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('DOWNSTREAM_SERVICE_UNAVAILABLE');
    });

    test('should REJECT when Hospital Service times out', async () => {
      axios.get.mockRejectedValueOnce({ 
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded' 
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 50,
        requiredAmbulanceCapacity: 10
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('DOWNSTREAM_SERVICE_UNAVAILABLE');
    });
  });

  describe('Helper Methods', () => {
    test('calculateTotalIcuBeds should sum ICU beds correctly', () => {
      const hospitals = [
        { icuBeds: 50 },
        { icuBeds: 30 },
        { icuBeds: 20 }
      ];

      const total = validationService.calculateTotalIcuBeds(hospitals);
      expect(total).toBe(100);
    });

    test('calculateTotalIcuBeds should return 0 for empty array', () => {
      const total = validationService.calculateTotalIcuBeds([]);
      expect(total).toBe(0);
    });

    test('calculateTotalAmbulanceCapacity should sum capacities correctly', () => {
      const ambulances = [
        { capacity: 4 },
        { capacity: 6 },
        { capacity: 2 }
      ];

      const total = validationService.calculateTotalAmbulanceCapacity(ambulances);
      expect(total).toBe(12);
    });

    test('calculateTotalAmbulanceCapacity should return 0 for empty array', () => {
      const total = validationService.calculateTotalAmbulanceCapacity([]);
      expect(total).toBe(0);
    });
  });

  describe('validateConstraints - Atomic Decision Making', () => {
    test('should approve only when ALL constraints pass', () => {
      const result = validationService.validateConstraints({
        totalIcuBeds: 100,
        requiredIcuBeds: 50,
        totalAmbulanceCapacity: 20,
        requiredAmbulanceCapacity: 10,
        city: 'dhaka'
      });

      expect(result.approved).toBe(true);
      expect(result.resources.icuBeds.sufficient).toBe(true);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(true);
    });

    test('should reject if ICU beds fail even when ambulances pass', () => {
      const result = validationService.validateConstraints({
        totalIcuBeds: 10,
        requiredIcuBeds: 50,
        totalAmbulanceCapacity: 20,
        requiredAmbulanceCapacity: 10,
        city: 'dhaka'
      });

      expect(result.approved).toBe(false);
      expect(result.resources.icuBeds.sufficient).toBe(false);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(true);
    });

    test('should reject if ambulances fail even when ICU beds pass', () => {
      const result = validationService.validateConstraints({
        totalIcuBeds: 100,
        requiredIcuBeds: 50,
        totalAmbulanceCapacity: 5,
        requiredAmbulanceCapacity: 10,
        city: 'dhaka'
      });

      expect(result.approved).toBe(false);
      expect(result.resources.icuBeds.sufficient).toBe(true);
      expect(result.resources.ambulanceCapacity.sufficient).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero requirements', async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: true, data: [] }
      });

      axios.get.mockResolvedValueOnce({
        data: { success: true, data: [] }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 0,
        requiredAmbulanceCapacity: 0
      });

      expect(result.approved).toBe(true);
    });

    test('should handle very large resource numbers', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', city: 'dhaka', icuBeds: 999999, ventilators: 999999 }]
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: '1', vehicleId: 'AMB-001', city: 'dhaka', capacity: 999999, status: 'AVAILABLE' }]
        }
      });

      const result = await validationService.validateEmergencyRequest({
        city: 'dhaka',
        requiredIcuBeds: 100000,
        requiredAmbulanceCapacity: 50000
      });

      expect(result.approved).toBe(true);
    });
  });
});
