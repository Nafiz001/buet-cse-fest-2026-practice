'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Table from '@/components/Table';
import { hospitalService } from '@/lib/api';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    icuBeds: '',
    ventilators: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hospitalService.getAll();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch hospitals';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitSuccess(false);
    setError(null);

    try {
      await hospitalService.create({
        name: formData.name,
        city: formData.city,
        icuBeds: parseInt(formData.icuBeds),
        ventilators: parseInt(formData.ventilators),
      });

      setSubmitSuccess(true);
      setFormData({ name: '', city: '', icuBeds: '', ventilators: '' });
      fetchHospitals();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create hospital';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'icuBeds', label: 'ICU Beds' },
    { key: 'ventilators', label: 'Ventilators' },
  ];

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Hospital Management</h1>

        {/* Create Hospital Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Hospital</h2>
          
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Hospital created successfully!
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Dhaka Medical College"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Dhaka"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ICU Beds *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.icuBeds}
                onChange={(e) => setFormData({ ...formData, icuBeds: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ventilators *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.ventilators}
                onChange={(e) => setFormData({ ...formData, ventilators: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 30"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Creating...' : 'Create Hospital'}
              </button>
            </div>
          </form>
        </div>

        {/* Hospitals List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Hospitals</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading hospitals...</div>
          ) : (
            <Table columns={columns} data={hospitals} />
          )}
        </div>
      </main>
    </>
  );
}
