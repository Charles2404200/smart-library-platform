import React from 'react';
import Hero from '../../components/home/Hero';
import PrimaryActions from '../../components/home/PrimaryActions';
import FooterSmall from '../../components/home/FooterSmall';

export default function HomePage({ isAuthenticated, user }) {
  // Fallback to localStorage if props aren’t passed
  const lsUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const authed = isAuthenticated ?? !!localStorage.getItem('token');
  const currentUser = user ?? lsUser;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 text-center border border-white/40">
        <Hero />
        <PrimaryActions isAuthenticated={authed} user={currentUser} />
        <FooterSmall />
      </div>
    </div>
  );
}
