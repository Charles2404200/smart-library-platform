import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 text-center border border-white/40">
        <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-700 mb-4 drop-shadow-md">
          📖 Smart Library Platform
        </h1>
        <p className="text-lg text-gray-700 mb-8 max-w-xl mx-auto">
          A modern digital library system that helps you easily search, borrow, and review books — anytime, anywhere.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-5 mb-10">
          <Link
            to="/search"
            className="px-6 py-3 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md"
          >
            🔍 Search Books
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 text-lg font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition-all shadow-md"
          >
            🔐 Login
          </Link>
        </div>

        <div className="text-sm text-gray-500">
          &copy; 2025 <span className="font-medium text-indigo-700">Smart Library</span>. Built by Le Anh Minh.
        </div>
      </div>
    </div>
  );
}

export default HomePage;
