import React, { useState, useRef, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/env'; // Thêm import này


export default function ProfileDropdown({ onLogout, user }) {
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
    localStorage.removeItem('user'); 
    onLogout?.();
    navigate('/login');
    window.location.reload();
  };

  const avatarSrc = user?.avatar_url
      ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)
      : null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="focus:outline-none"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <FaUserCircle className="text-2xl text-indigo-700" />
        )}
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
