// src/App.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { parseJwt } from './utils/jwt';
import http, { silentRefresh } from './services/http';
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

const CLOCK_SKEW_MS = 5 * 1000;
const LOGOUT_BEFORE_EXP_MS = 0;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtUser, setJwtUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const user = useMemo(() => profileUser || jwtUser, [profileUser, jwtUser]);
  const logoutTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) {
      console.log('[Auth] clearTimers()');
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const doLogout = useCallback((silent = false) => {
    console.log('[Auth] doLogout triggered', { silent });
    clearTimers();
    setIsAuthenticated(false);
    setJwtUser(null);
    setProfileUser(null);
    try {
      storage.remove('token');
      storage.remove('user');
      console.log('[Auth] storage cleared (token,user removed)');
    } catch (e) { console.error('[Auth] error clearing storage', e); }
    try {
      localStorage.setItem('logout', Date.now().toString());
      console.log('[Auth] broadcasted logout via localStorage');
    } catch (e) { console.error('[Auth] error broadcasting logout', e); }
    if (!silent) {
      window.location.href = '/login';
    }
  }, [clearTimers]);

  const scheduleLogout = useCallback((expiresAtMs) => {
    clearTimers();
    const now = Date.now();
    const msUntil = Math.max(0, (expiresAtMs - LOGOUT_BEFORE_EXP_MS) - now);
    console.log('[Auth] scheduleLogout -> expiresAt:', new Date(expiresAtMs).toISOString(), 'msUntil:', msUntil);
    logoutTimerRef.current = setTimeout(() => {
      console.log('[Auth] logout timer fired at', new Date().toISOString());
      doLogout(false);
    }, msUntil);
  }, [clearTimers, doLogout]);

  const handleLoginLocal = useCallback((token, userObj = null) => {
    console.log('[Auth] handleLoginLocal invoked');
    try {
      if (token) storage.set('token', token);
      if (userObj) storage.set('user', userObj);
      console.log('[Auth] stored token and user in storage (local)');
    } catch (e) { console.error('[Auth] error storing token/user', e); }

    const payload = parseJwt(token);
    if (payload && payload.exp) {
      console.log('[Auth] parsed token payload', payload);
      setJwtUser(payload);
      setProfileUser(userObj || null);
      setIsAuthenticated(true);
      scheduleLogout(payload.exp * 1000);
    } else {
      console.warn('[Auth] malformed token, forcing logout');
      doLogout(true);
    }
    try { localStorage.setItem('token', Date.now().toString()); } catch(e){console.error('[Auth] token broadcast failed', e);}
  }, [scheduleLogout, doLogout]);

  const handleLogout = useCallback(() => {
    console.log('[Auth] handleLogout called by UI');
    doLogout(false);
  }, [doLogout]);

  // Bootstrapping: verify token or refresh before showing login
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setBootstrapping(true);
      try {
        const raw = storage.get('token', null);
        const token = (function (r) {
          if (!r) return null;
          try { const p = JSON.parse(r); if (typeof p === 'string') return p; if (p?.token) return p.token; return r; }
          catch(e){ return r; }
        })(raw);

        if (token) {
          const payload = parseJwt(token);
          if (payload && payload.exp && (payload.exp * 1000 > Date.now() + CLOCK_SKEW_MS)) {
            // Try verifying with server; try both endpoints (plural and singular)
            const endpoints = ['/api/user/me', '/api/users/me'];
            for (const ep of endpoints) {
              try {
                const me = await http(ep);
                if (!mounted) return;
                setProfileUser(me);
                setJwtUser(payload);
                setIsAuthenticated(true);
                scheduleLogout(payload.exp * 1000);
                console.log('[Auth] bootstrap: token validated by server via', ep);
                setBootstrapping(false);
                return;
              } catch (e) {
                console.warn('[Auth] bootstrap: verify failed for', ep, e);
              }
            }
          } else {
            console.log('[Auth] bootstrap: token missing or expired client-side, will try refresh');
          }
        } else {
          console.log('[Auth] bootstrap: no token found, will try refresh');
        }

        // Attempt silent refresh (httpOnly cookie)
        const newToken = await silentRefresh();
        if (newToken) {
          try { storage.set('token', newToken); } catch(e) {}
          const payload = parseJwt(newToken);
          const endpoints = ['/api/user/me', '/api/users/me'];
          for (const ep of endpoints) {
            try {
              const me = await http(ep);
              if (!mounted) return;
              setProfileUser(me);
              setJwtUser(payload);
              setIsAuthenticated(true);
              if (payload && payload.exp) scheduleLogout(payload.exp * 1000);
              console.log('[Auth] bootstrap: refresh succeeded and verified via', ep);
              setBootstrapping(false);
              return;
            } catch (e) {
              console.warn('[Auth] bootstrap: verify after refresh failed for', ep, e);
            }
          }
        }

        console.log('[Auth] bootstrap: no valid session, logging out silently');
        doLogout(true);
      } catch (err) {
        console.error('[Auth] bootstrap error', err);
        doLogout(true);
      } finally {
        if (mounted) setBootstrapping(false);
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, [scheduleLogout, doLogout]);

  // export global helpers & storage listener
  useEffect(() => {
    try {
      window.__appLogout = doLogout;
      window.__appLogin = handleLoginLocal;
      console.log('[Auth] exported window.__appLogout and window.__appLogin');
    } catch (e) { console.warn('[Auth] cannot export global helpers', e); }

    function onStorage(e) {
      if (!e) return;
      console.log('[Auth] storage event received', { key: e.key });
      if (e.key === 'logout') {
        console.log('[Auth] received logout event from another tab, logging out silently');
        doLogout(true);
      }
      if (e.key === 'token') {
        const t = storage.get('token', null);
        if (!t) {
          console.log('[Auth] token removed in another tab; logging out');
          doLogout(true);
          return;
        }
        const p = parseJwt(t);
        if (!p || !p.exp) {
          console.log('[Auth] token changed in another tab but is invalid; logging out');
          doLogout(true);
          return;
        }
        console.log('[Auth] token changed in another tab; updating local state and scheduling logout');
        setJwtUser(p);
        setIsAuthenticated(true);
        scheduleLogout(p.exp * 1000);
      }
    }

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      try {
        if (window.__appLogout === doLogout) window.__appLogout = undefined;
        if (window.__appLogin === handleLoginLocal) window.__appLogin = undefined;
      } catch (e) {}
    };
  }, [doLogout, handleLoginLocal, scheduleLogout]);

  if (bootstrapping) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading…</p>
      </div>
    );
  }

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

        <Route path="/books" element={<ViewBooksPage />} />
        <Route path="/borrowed" element={<PrivateRoute element={<BorrowedBooks />} roles={['reader','staff','admin']} />} />
        <Route path="/admin" element={<PrivateRoute element={<AdminDashboard />} roles={['staff','admin']} />} />
        <Route path="/search" element={<PrivateRoute element={<SearchPage />} roles={['reader','staff','admin']} />} />
        <Route path="/settings" element={<PrivateRoute element={<SettingsPage />} roles={['reader','staff','admin']} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
