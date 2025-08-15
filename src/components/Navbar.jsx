// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import CalendarWidget from './calendar/CalendarWidget';

export default function Navbar({ isAuthenticated, onLogout, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen((v) => !v);
  const toggleDropdown = () => setDropdownOpen((v) => !v);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-indigo-700">
          📚 SmartLibrary
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-gray-700 hover:text-indigo-700 transition">Home</Link>
          <Link to="/books" className="text-gray-700 hover:text-indigo-700 transition">View Books</Link>
          <Link to="/search" className="text-gray-700 hover:text-indigo-700 transition">Search</Link>

          {isAuthenticated && (user?.role === 'staff' || user?.role === 'admin') && (
            <Link to="/admin" className="text-gray-700 hover:text-indigo-700 transition">Admin Panel</Link>
          )}

          {/* 📅 Calendar (real-time due reminders) */}
          {isAuthenticated && (
            <CalendarWidget isAuthenticated={isAuthenticated} user={user} />
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center text-indigo-700 focus:outline-none"
              >
                <FaUserCircle className="text-2xl" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">My Profile</Link>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</Link>
                  <Link to="/borrowed" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Books Borrowed</Link>
                  <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-700">Login</Link>
              <Link to="/register" className="text-gray-600 hover:text-indigo-700">Register</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="text-2xl text-indigo-700 focus:outline-none">
            {isOpen ? <HiOutlineX /> : <HiOutlineMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          <Link to="/" className="block text-gray-700 hover:text-indigo-700">Home</Link>
          <Link to="/books" className="block text-gray-700 hover:text-indigo-700">View Books</Link>
          <Link to="/search" className="block text-gray-700 hover:text-indigo-700">Search</Link>

          {isAuthenticated && (user?.role === 'staff' || user?.role === 'admin') && (
            <Link to="/admin" className="block text-gray-700 hover:text-indigo-700">Admin Panel</Link>
          )}

          {/* Mobile: link to the borrowed page (popover is desktop-first) */}
          {isAuthenticated && (
            <Link to="/borrowed" className="block text-gray-700 hover:text-indigo-700">
              📅 Due Dates & Borrowed
            </Link>
          )}

          {isAuthenticated ? (
            <>
              <Link to="/profile" className="block text-gray-700 hover:text-indigo-700">My Profile</Link>
              <Link to="/dashboard" className="block text-gray-700 hover:text-indigo-700">Dashboard</Link>
              <Link to="/borrowed" className="block text-gray-700 hover:text-indigo-700">Books Borrowed</Link>
              <Link to="/settings" className="block text-gray-700 hover:text-indigo-700">Settings</Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-gray-700 hover:text-indigo-700">Login</Link>
              <Link to="/register" className="block text-gray-700 hover:text-indigo-700">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
