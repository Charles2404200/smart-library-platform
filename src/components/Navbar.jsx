import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBook, FaSearch, FaTachometerAlt, FaSignOutAlt, FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

export default function Navbar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleLogout = () => {
    onLogout();
    setDropdownOpen(false);
    setIsOpen(false);
    navigate('/login');
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const commonLinks = (
    <>
      <Link to="/books" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-700 transition" onClick={() => setIsOpen(false)}>
        <FaBook /><span>View Books</span>
      </Link>
      <Link to="/search" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-700 transition" onClick={() => setIsOpen(false)}>
        <FaSearch /><span>Search</span>
      </Link>
    </>
  );
  
  const authLinks = (
    <>
      {user && (user.role === 'staff' || user.role === 'admin') && (
        <Link to="/admin" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-700 transition" onClick={() => setIsOpen(false)}>
          <FaTachometerAlt /><span>Admin Panel</span>
        </Link>
      )}
      <div className="relative" ref={dropdownRef}>
        <button onClick={toggleDropdown} className="flex items-center text-indigo-700 focus:outline-none">
          <FaUserCircle className="text-2xl" />
          <span className="ml-2 hidden md:inline">{user?.name || user?.email}</span>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
            <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={toggleDropdown}>Dashboard</Link>
            <Link to="/borrowed" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={toggleDropdown}>Books Borrowed</Link>
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <FaSignOutAlt /><span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  const guestLinks = (
    <>
      <Link to="/login" className="flex items-center space-x-2 text-gray-600 hover:text-indigo-700">
        <FaSignInAlt /><span>Login</span>
      </Link>
      <Link to="/register" className="flex items-center space-x-2 text-gray-600 hover:text-indigo-700">
        <FaUserPlus /><span>Register</span>
      </Link>
    </>
  );

  return (
    <nav className="bg-white border-b shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-indigo-700">
          📚 SmartLibrary
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          {commonLinks}
          {user ? authLinks : guestLinks}
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
          {commonLinks}
          <hr/>
          {user ? (
             <>
              <Link to="/dashboard" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-700" onClick={() => setIsOpen(false)}>Dashboard</Link>
              <Link to="/borrowed" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-700" onClick={() => setIsOpen(false)}>Books Borrowed</Link>
              {(user.role === 'staff' || user.role === 'admin') && (
                <Link to="/admin" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-700" onClick={() => setIsOpen(false)}>Admin Panel</Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center space-x-2 text-red-600 hover:text-red-800"
              >
                <FaSignOutAlt /><span>Logout</span>
              </button>
            </>
          ) : (
            <>
              {guestLinks}
            </>
          )}
        </div>
      )}
    </nav>
  );
}