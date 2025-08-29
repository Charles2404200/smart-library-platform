// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Pages
import HomePage from './pages/HomePage/HomePage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ViewBooksPage from './pages/ViewBooks/ViewBooks';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import BorrowedBooks from './pages/BorrowedBooks/BorrowedBooks';
import SearchPage from './pages/SearchPage/SearchPage';
import SettingsPage from './pages/SettingsPage';
import ReaderPage from './pages/Reader/ReaderPage';
import MyLibrary from './pages/MyLibrary/MyLibrary';

// Shared
import Navbar from './components/navbar/Navbar';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtUser, setJwtUser] = useState(null);       // decoded token (id,email,role)
  const [profileUser, setProfileUser] = useState(null); // user object saved at login
  const [isInitializing, setIsInitializing] = useState(true); // <-- THÊM STATE MỚI

  const user = useMemo(() => profileUser || jwtUser, [profileUser, jwtUser]);

  // Load token & user on first mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');

    if (rawUser) {
      try { setProfileUser(JSON.parse(rawUser)); } catch { setProfileUser(null); }
    }

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setJwtUser(decoded);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Invalid token:', err);
        setJwtUser(null);
        setIsAuthenticated(false);
      }
    }
    setIsInitializing(false); 
  }, []);

  // Keep state in sync if token/user changes in another tab
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem('token');
      const rawUser = localStorage.getItem('user');

      if (rawUser) {
        try { setProfileUser(JSON.parse(rawUser)); } catch { setProfileUser(null); }
      } else {
        setProfileUser(null);
      }

      if (token) {
        try {
          const decoded = jwtDecode(token);
          setJwtUser(decoded);
          setIsAuthenticated(true);
        } catch {
          setJwtUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setJwtUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = (token, userObj) => {
    localStorage.setItem('token', token);
    if (userObj) localStorage.setItem('user', JSON.stringify(userObj));
    try {
      const decoded = jwtDecode(token);
      setJwtUser(decoded);
      setProfileUser(userObj || null);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('login decode error', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setJwtUser(null);
    setProfileUser(null);
  };

  // Private route wrapper for role-based guard
  const PrivateRoute = ({ element, roles }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (roles?.length) {
      const role = user?.role;
      if (!roles.includes(role)) return <Navigate to="/" replace />;
    }
    return element;
  };

  if (isInitializing) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Navbar isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage isAuthenticated={isAuthenticated} user={user} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/books" element={<ViewBooksPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/read/:bookId" element={<ReaderPage />} />
        
        <Route
          path="/my-library"
          element={
            <PrivateRoute
              element={<MyLibrary />}
              roles={['reader', 'staff', 'admin']}
            />
          }
        />

        {/* Borrowed (role: reader/staff/admin) */}
        <Route
          path="/borrowed"
          element={
            <PrivateRoute
              element={<BorrowedBooks />}
              roles={['reader', 'staff', 'admin']}
            />
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <PrivateRoute
              element={<AdminDashboard />}
              roles={['staff', 'admin']}
            />
          }
        />
          <Route
            path="/settings"
            element={ <PrivateRoute element={<SettingsPage />} roles={['reader', 'staff', 'admin']} /> }
          />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}