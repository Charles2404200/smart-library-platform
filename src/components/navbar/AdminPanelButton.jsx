import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminPanelButton({ user, className = '' }) {
  const canSee = user && (user.role === 'staff' || user.role === 'admin');
  if (!canSee) return null;

  return (
    <Link
      to="/admin"
      className={`inline-block bg-indigo-700 text-white font-semibold py-2 px-4 rounded hover:bg-indigo-800 transition ${className}`}
    >
      🛠 Admin Panel
    </Link>
  );
}
