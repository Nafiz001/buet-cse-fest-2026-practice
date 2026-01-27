import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            CityCare Emergency Platform
          </h1>
          <p className="text-gray-600 mb-8">
            Admin console for managing hospitals, ambulances, and emergency requests
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hospital Management Card */}
            <Link href="/hospitals">
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer border-t-4 border-blue-500">
                <div className="text-3xl mb-4">🏥</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Hospitals
                </h2>
                <p className="text-gray-600 text-sm">
                  Manage hospital resources and ICU bed capacity
                </p>
              </div>
            </Link>

            {/* Ambulance Management Card */}
            <Link href="/ambulances">
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer border-t-4 border-green-500">
                <div className="text-3xl mb-4">🚑</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Ambulances
                </h2>
                <p className="text-gray-600 text-sm">
                  Track ambulance availability and capacity
                </p>
              </div>
            </Link>

            {/* Emergency Requests Card */}
            <Link href="/requests">
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer border-t-4 border-red-500">
                <div className="text-3xl mb-4">🚨</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Emergency Requests
                </h2>
                <p className="text-gray-600 text-sm">
                  Submit and validate emergency resource requests
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              System Status
            </h3>
            <p className="text-blue-800 text-sm">
              All backend microservices are operational. This admin console provides safe, validated access to the emergency response platform.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
