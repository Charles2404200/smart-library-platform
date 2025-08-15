import React, { useState, useRef, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

export default function ProfileDropdown({ onLogout }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout?.();
    navigate('/login');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-2xl text-indigo-700 focus:outline-none"
      >
        <FaUserCircle />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-white border border-gray-200 shadow-lg">
          <div className="py-1">
            <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</Link>
            <Link to="/books" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">View Books</Link>
            <Link to="/borrowed" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Books Borrowed</Link>
            <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
