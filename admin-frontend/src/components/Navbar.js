import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold">
            CityCare Admin
          </Link>
          <div className="flex space-x-6">
            <Link href="/" className="hover:text-blue-200 transition">
              Dashboard
            </Link>
            <Link href="/hospitals" className="hover:text-blue-200 transition">
              Hospitals
            </Link>
            <Link href="/ambulances" className="hover:text-blue-200 transition">
              Ambulances
            </Link>
            <Link href="/requests" className="hover:text-blue-200 transition">
              Emergency Requests
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
