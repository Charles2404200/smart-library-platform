import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Navbar from './components/Navbar';
import ViewBooksPage from './pages/ViewBooksPage';
import AdminDashboard from './pages/AdminDashboard';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import BooksBorrowedPage from './pages/BooksBorrowedPage';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error('Invalid token:', err);
        handleLogout();
      }
    }
  }, []);

  const handleLogin = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (error) {
        console.error('Failed to decode token:', error);
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const PrivateRoute = ({ children, roles }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    if (roles && !roles.includes(user.role)) {
      return <Navigate to="/" />;
    }
    return children;
  };

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/books" element={<ViewBooksPage user={user} />} />
        <Route path="/search" element={<SearchPage user={user} />} />
        
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <DashboardPage user={user} />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/borrowed" 
          element={
            <PrivateRoute>
              <BooksBorrowedPage user={user} />
            </PrivateRoute>
          } 
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={['staff', 'admin']}>
              <AdminDashboard user={user}/>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;