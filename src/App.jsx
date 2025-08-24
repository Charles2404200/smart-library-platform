// src/App.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { parseJwt } from './utils/jwt';

// Pages
import HomePage from './pages/HomePage/HomePage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ViewBooksPage from './pages/ViewBooks/ViewBooks';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import BorrowedBooks from './pages/BorrowedBooks/BorrowedBooks';
import SearchPage from './pages/SearchPage/SearchPage';
import SettingsPage from './pages/SettingsPage';

// Shared
import Navbar from './components/navbar/Navbar';
import { storage } from './utils/storage';

/**
 * App-level authentication handling:
 * - Read token from localStorage (via storage util).
 * - Parse token `exp` and automatically logout when expired (in real time).
 * - Sync logout/login across tabs using localStorage `logout` + `token` events.
 *
 * We intentionally force a full re-login when access token expires (per your request).
 * If you want token refresh instead, we can add a refresh endpoint and silent refresh logic later.
 */

const CLOCK_SKEW_MS = 5 * 1000;       // tolerance for clock differences
const LOGOUT_BEFORE_EXP_MS = 0;       // how many ms before exact exp to force logout (0 = at expiry)

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtUser, setJwtUser] = useState(null);         // decoded token (id,email,role)
  const [profileUser, setProfileUser] = useState(null); // user object saved at login

  const user = useMemo(() => profileUser || jwtUser, [profileUser, jwtUser]);

  // timers refs for scheduled logout
  const logoutTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const doLogout = useCallback((silent = false) => {
    // Clear timers and local state
    clearTimers();
    setIsAuthenticated(false);
    setJwtUser(null);
    setProfileUser(null);

    // Clear storage
    try {
      storage.remove('token');
      storage.remove('user');
    } catch (e) { /* ignore */ }

    // Broadcast to other tabs
    try {
      localStorage.setItem('logout', Date.now().toString());
    } catch (e) { /* ignore */ }

    // Redirect to login
    if (!silent) {
      window.location.href = '/login';
    }
  }, [clearTimers]);

  const scheduleLogout = useCallback((expiresAtMs) => {
    clearTimers();
    const now = Date.now();
    const msUntil = Math.max(0, (expiresAtMs - LOGOUT_BEFORE_EXP_MS) - now);
    logoutTimerRef.current = setTimeout(() => {
      // On expiry, do a forced logout
      doLogout(false);
    }, msUntil);
  }, [clearTimers, doLogout]);

  // Called at login to set token & user and schedule logout
  const handleLoginLocal = useCallback((token, userObj = null) => {
    try {
      if (token) storage.set('token', token);
      if (userObj) storage.set('user', userObj);
    } catch (e) { /* ignore */ }

    const payload = parseJwt(token);
    if (payload && payload.exp) {
      setJwtUser(payload);
      setProfileUser(userObj || null);
      setIsAuthenticated(true);
      scheduleLogout(payload.exp * 1000);
    } else {
      // malformed token -> ensure logged out for safety
      doLogout(true);
    }

    // notify other tabs in case they want to sync
    try { localStorage.setItem('token', Date.now().toString()); } catch(e){/*ignore*/}
  }, [scheduleLogout, doLogout]);

  // Global logout handler for UI (calls doLogout)
  const handleLogout = useCallback(() => doLogout(false), [doLogout]);

  // On mount: load token + user and schedule logout if token valid
  useEffect(() => {
    const token = storage.get('token', null);
    const userObj = storage.get('user', null);
    if (userObj) setProfileUser(userObj);

    if (token) {
      const payload = parseJwt(token);
      if (!payload || !payload.exp) {
        // malformed -> clear
        doLogout(true);
        return;
      }
      const expiresAt = payload.exp * 1000;
      if (expiresAt <= Date.now() + CLOCK_SKEW_MS) {
        // token already expired -> clear and redirect
        doLogout(false);
      } else {
        setJwtUser(payload);
        setIsAuthenticated(true);
        scheduleLogout(expiresAt);
      }
    }

    // Listen for cross-tab events
    function onStorage(e) {
      if (!e) return;
      if (e.key === 'logout') {
        // another tab logged out -> force logout silently here
        doLogout(true);
      }
      if (e.key === 'token') {
        // token changed in another tab. Re-read and update state.
        const t = storage.get('token', null);
        if (!t) {
          doLogout(true);
          return;
        }
        const p = parseJwt(t);
        if (!p || !p.exp) {
          doLogout(true);
          return;
        }
        setJwtUser(p);
        setIsAuthenticated(true);
        scheduleLogout(p.exp * 1000);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [doLogout, scheduleLogout]);

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Existing list page (kept) */}
        <Route path="/books" element={<ViewBooksPage />} />

        {/* Protected pages */}
        <Route path="/borrowed" element={<PrivateRoute element={<BorrowedBooks />} roles={['reader','staff','admin']} />} />
        <Route path="/admin" element={<PrivateRoute element={<AdminDashboard />} roles={['staff','admin']} />} />
        <Route path="/search" element={<PrivateRoute element={<SearchPage />} roles={['reader','staff','admin']} />} />
        <Route path="/settings" element={<PrivateRoute element={<SettingsPage />} roles={['reader','staff','admin']} />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
