import React from 'react';
import { Link } from 'react-router-dom';

export default function PrimaryActions({ isAuthenticated, user }) {
  // If logged in, show more relevant CTAs
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-5 mb-10">
      <Link
        to="/search"
        className="px-6 py-3 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md"
      >
        🔍 Search Books
      </Link>

      {!isAuthenticated && (
        <Link
          to="/login"
          className="px-6 py-3 text-lg font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition-all shadow-md"
        >
          🔐 Login
        </Link>
      )}

      {isAuthenticated && (
        <>
          <Link
            to="/borrowed"
            className="px-6 py-3 text-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md"
          >
            📚 My Borrows
          </Link>

          {isStaff && (
            <Link
              to="/admin"
              className="px-6 py-3 text-lg font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-md"
            >
              🛠 Admin Panel
            </Link>
          )}
        </>
      )}
    </div>
  );
}
