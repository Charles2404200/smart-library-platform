// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Pages (split structure)
import HomePage from './pages/HomePage/HomePage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ViewBooksPage from './pages/ViewBooks/ViewBooks';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import BorrowedBooks from './pages/BorrowedBooks/BorrowedBooks';

// Shared
import Navbar from './components/Navbar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtUser, setJwtUser] = useState(null);       // decoded token (id, email, role)
  const [profileUser, setProfileUser] = useState(null); // full user object saved at login

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

  // Prefer full profile user if available
  const user = useMemo(() => profileUser || jwtUser, [profileUser, jwtUser]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setJwtUser(null);
    setProfileUser(null);
  };

  const handleLogin = () => {
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
      } catch {
        setJwtUser(null);
        setIsAuthenticated(false);
      }
    }
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

  return (
    <Router>
      <Navbar isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage isAuthenticated={isAuthenticated} user={user} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/books" element={<ViewBooksPage />} />

        <Route
          path="/borrowed"
          element={
            <PrivateRoute
              element={<BorrowedBooks />}
              roles={['reader', 'staff', 'admin']}
            />
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute
              element={<AdminDashboard />}
              roles={['staff', 'admin']}
            />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
