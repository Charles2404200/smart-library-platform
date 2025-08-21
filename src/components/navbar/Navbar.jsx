import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import CalendarWidget from '../calendar/CalendarWidget';
import ProfileDropdown from './ProfileDropdown';
import AdminPanelButton from './AdminPanelButton';

export default function Navbar({ isAuthenticated, onLogout, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen((v) => !v);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (q) navigate(`/books?q=${encodeURIComponent(q)}`);
    else navigate('/books');
    setIsOpen(false);
  };

  const isStaffOrAdmin = isAuthenticated && (user?.role === 'staff' || user?.role === 'admin');

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

          {/* 🔎 Desktop search box */}
          <form onSubmit={submitSearch} className="flex items-center">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search title, author, genre…"
              className="border rounded-l-md px-3 py-1.5 w-64"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
            >
              Search
            </button>
          </form>

          {/* Admin button (staff/admin) */}
          <AdminPanelButton user={user} />

          {/* 📅 Calendar */}
          {isAuthenticated && (
            <CalendarWidget isAuthenticated={isAuthenticated} user={user} />
          )}

          {/* Profile dropdown / auth links */}
          {isAuthenticated ? (
            <ProfileDropdown onLogout={onLogout} user={user} /> 
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
        <div className="md:hidden px-4 pb-4 space-y-3">
          <Link to="/" className="block text-gray-700 hover:text-indigo-700">Home</Link>
          <Link to="/books" className="block text-gray-700 hover:text-indigo-700">View Books</Link>

          {/* 🔎 Mobile search box */}
          <form onSubmit={submitSearch} className="flex items-center">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search…"
              className="flex-1 border rounded-l-md px-3 py-2"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
            >
              Go
            </button>
          </form>

          {isStaffOrAdmin && (
            <Link to="/admin" className="block text-gray-700 hover:text-indigo-700">Admin Panel</Link>
          )}

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
                onClick={() => { onLogout?.(); navigate('/login'); }}
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
