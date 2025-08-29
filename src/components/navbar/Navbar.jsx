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

  const goToAdvanced = () => {
    navigate('/search');
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
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/" className="text-gray-700 hover:text-indigo-700 transition">Home</Link>
          <Link to="/books" className="text-gray-700 hover:text-indigo-700 transition">View Books</Link>

          {/* Desktop search box */}
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

            {/* Advanced search shortcut button */}
            <button
              type="button"
              onClick={goToAdvanced}
              className="ml-2 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              title="Open advanced search"
            >
              Filter
            </button>
          </form>

          {/* Admin button (staff/admin) */}
          <AdminPanelButton user={user} />

          {/* Calendar */}
          {isAuthenticated && (
            <CalendarWidget isAuthenticated={isAuthenticated} user={user} />
          )}

          {/* Profile / Auth links */}
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
        <div className="md:hidden px-4 py-3 border-t bg-white space-y-2">
          <Link to="/" className="block text-gray-700 hover:text-indigo-700">Home</Link>
          <Link to="/books" className="block text-gray-700 hover:text-indigo-700">View Books</Link>

          <form onSubmit={submitSearch} className="flex items-center">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search title, author, genre…"
              className="border rounded-l-md px-3 py-1.5 w-full"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
            >
              Search
            </button>
          </form>

          <button
            onClick={goToAdvanced}
            className="w-full text-left px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Advanced Search
          </button>

          {isStaffOrAdmin && <Link to="/admin" className="block text-gray-700 hover:text-indigo-700">Admin Panel</Link>}

          {isAuthenticated ? (
            <ProfileDropdown onLogout={onLogout} />
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