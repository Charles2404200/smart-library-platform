import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AdminPanelButton
 * Renders a "Admin Panel" button if user is authenticated and is staff.
 *
 * Props:
 * - user: current user object (must include "role")
 * - className: optional tailwind classes to style the button
 */
export default function AdminPanelButton({ user, className = '' }) {
  if (!user || user.role !== 'staff') return null;

  return (
    <Link
      to="/admin"
      className={`inline-block bg-indigo-700 text-white font-semibold py-2 px-4 rounded hover:bg-indigo-800 transition ${className}`}
    >
      🛠 Admin Panel
    </Link>
  );
}
