'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { emergencyRequestService } from '@/lib/api';

export default function RequestsPage() {
  const [formData, setFormData] = useState({
    city: '',
    requiredIcuBeds: '',
    requiredAmbulanceCapacity: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const response = await emergencyRequestService.create({
        city: formData.city,
        requiredIcuBeds: parseInt(formData.requiredIcuBeds),
        requiredAmbulanceCapacity: parseInt(formData.requiredAmbulanceCapacity),
      });

      setResult(response);
      setFormData({ city: '', requiredIcuBeds: '', requiredAmbulanceCapacity: '' });
    } catch (err) {
      // Backend returns detailed error for rejected requests
      if (err.response?.data) {
        setResult(err.response.data);
      } else {
        const errorMsg = err.message || 'Failed to submit emergency request';
        setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Emergency Request Validation</h1>

        <div className="max-w-3xl mx-auto">
          {/* Warning Banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Production System:</strong> All requests are validated atomically by the backend. 
                  The system will reject any request that cannot be fully satisfied to prevent partial execution.
                </p>
              </div>
            </div>
          </div>

          {/* Request Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Submit Emergency Request</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Dhaka"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required ICU Beds *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.requiredIcuBeds}
                  onChange={(e) => setFormData({ ...formData, requiredIcuBeds: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Ambulance Capacity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.requiredAmbulanceCapacity}
                  onChange={(e) => setFormData({ ...formData, requiredAmbulanceCapacity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 10"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
              >
                {submitting ? 'Validating Request...' : 'Submit Emergency Request'}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Validation Result */}
          {result && (
            <div className={`rounded-lg shadow-lg p-6 border-2 ${
              result.validationDetails?.approved 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Validation Result
                </h2>
                <StatusBadge approved={result.validationDetails?.approved} />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Request ID</p>
                  <p className="text-lg font-mono">{result.id}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">City</p>
                  <p className="text-lg">{result.city}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Required ICU Beds</p>
                    <p className="text-lg">{result.requiredIcuBeds}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Required Ambulance Capacity</p>
                    <p className="text-lg">{result.requiredAmbulanceCapacity}</p>
                  </div>
                </div>

                {result.validationDetails && (
                  <>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium text-gray-600 mb-2">Backend Response</p>
                      
                      {result.validationDetails.approved ? (
                        <div className="bg-green-100 p-3 rounded">
                          <p className="text-green-800 font-semibold">✓ Request Approved</p>
                          <p className="text-sm text-green-700 mt-1">
                            All resources are available. Emergency plan can proceed.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-red-100 p-3 rounded">
                          <p className="text-red-800 font-semibold">✗ Request Rejected</p>
                          <p className="text-sm text-red-700 mt-1">
                            <strong>Reason:</strong> {result.validationDetails.reason || 'Unknown'}
                          </p>
                          {result.validationDetails.message && (
                            <p className="text-sm text-red-700 mt-1">
                              <strong>Details:</strong> {result.validationDetails.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {result.validationDetails.resources && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-600 mb-2">Resource Analysis</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">ICU Beds</span>
                            <span className={`text-sm font-semibold ${
                              result.validationDetails.resources.icuBeds?.sufficient 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {result.validationDetails.resources.icuBeds?.available || 0} / {result.validationDetails.resources.icuBeds?.required || 0}
                              {result.validationDetails.resources.icuBeds?.sufficient ? ' ✓' : ' ✗'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">Ambulance Capacity</span>
                            <span className={`text-sm font-semibold ${
                              result.validationDetails.resources.ambulanceCapacity?.sufficient 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {result.validationDetails.resources.ambulanceCapacity?.available || 0} / {result.validationDetails.resources.ambulanceCapacity?.required || 0}
                              {result.validationDetails.resources.ambulanceCapacity?.sufficient ? ' ✓' : ' ✗'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-gray-500">
                    Timestamp: {result.validationDetails?.timestamp || new Date().toISOString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
