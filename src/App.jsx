import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { dbClient } from './db';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import Bank from './pages/Bank';
import PPF from './pages/PPF';
import NPS from './pages/NPS';
import RealEstate from './pages/RealEstate';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    dbClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth state changes
    const subscription = dbClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFDDF] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-brand-dark/60 font-semibold text-sm">Authenticating Account...</p>
        </div>
      </div>
    );
  }

  const ProtectedLayout = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="min-h-screen bg-[#FEFDDF] text-brand-dark flex flex-col md:flex-row">
        <Navigation user={user} onSignOut={() => setUser(null)} />
        <main className="flex-1 md:pl-64 min-w-0 transition-all duration-300">
          {children}
        </main>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login onSignIn={setUser} />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" replace /> : <SignUp />} 
        />

        {/* Private wealth tracker pages */}
        <Route 
          path="/" 
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/stocks" 
          element={
            <ProtectedLayout>
              <Stocks />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/bank" 
          element={
            <ProtectedLayout>
              <Bank />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/ppf" 
          element={
            <ProtectedLayout>
              <PPF />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/nps" 
          element={
            <ProtectedLayout>
              <NPS />
            </ProtectedLayout>
          } 
        />
        <Route 
          path="/real-estate" 
          element={
            <ProtectedLayout>
              <RealEstate />
            </ProtectedLayout>
          } 
        />

        {/* Catch-all redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
