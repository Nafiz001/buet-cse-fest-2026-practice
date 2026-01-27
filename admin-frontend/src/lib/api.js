import axios from 'axios';

// Centralized API client configuration
const hospitalAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_HOSPITAL_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ambulanceAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AMBULANCE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const requestAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REQUEST_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Hospital Service API calls
export const hospitalService = {
  getAll: async () => {
    const response = await hospitalAPI.get('/hospitals');
    return response.data.data || [];
  },
  create: async (data) => {
    const response = await hospitalAPI.post('/hospitals', data);
    return response.data;
  },
};

// Ambulance Service API calls
export const ambulanceService = {
  getAll: async () => {
    const response = await ambulanceAPI.get('/ambulances');
    return response.data.data || [];
  },
  create: async (data) => {
    const response = await ambulanceAPI.post('/ambulances', data);
    return response.data;
  },
};

// Emergency Request Service API calls
export const emergencyRequestService = {
  create: async (data) => {
    const response = await requestAPI.post('/requests', data);
    return response.data.data || response.data;
  },
  getById: async (id) => {
    const response = await requestAPI.get(`/requests/${id}`);
    return response.data.data || response.data;
  },
};
