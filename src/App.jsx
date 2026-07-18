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

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches render errors so the whole app never goes fully blank.
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FEFDDF] flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-brand-dark">Something went wrong</h2>
            <p className="text-sm text-brand-dark/60">{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-5 py-2.5 bg-brand-orange text-white rounded-xl font-semibold text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── ProtectedLayout must live OUTSIDE App ───────────────────────────────────
// Defining it inside App() creates a new component reference on every render,
// which causes React to fully unmount+remount every page on each state change.
function ProtectedLayout({ user, onSignOut, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen bg-[#FEFDDF] text-brand-dark flex flex-col md:flex-row">
      <Navigation user={user} onSignOut={onSignOut} />
      <main className="flex-1 md:pl-64 min-w-0 transition-all duration-300">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Restore session on mount
    dbClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth changes
    // IMPORTANT: Only clear the user on SIGNED_OUT.
    // Supabase fires TOKEN_REFRESHED / USER_UPDATED with a momentarily-null
    // session, which would incorrectly clear the user and blank the page.
    const { data: { subscription } } = dbClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        setUser(session.user);
      }
      // Always stop the loading spinner once we get any auth event
      setLoading(false);
    });

    return () => { subscription?.unsubscribe(); };
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

  const handleSignOut = () => setUser(null);

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
        <Route path="/" element={<ProtectedLayout user={user} onSignOut={handleSignOut}><Dashboard /></ProtectedLayout>} />
        <Route path="/stocks" element={<ProtectedLayout user={user} onSignOut={handleSignOut}><Stocks /></ProtectedLayout>} />
        <Route path="/bank" element={<ProtectedLayout user={user} onSignOut={handleSignOut}><Bank /></ProtectedLayout>} />
        <Route path="/ppf" element={<ProtectedLayout user={user} onSignOut={handleSignOut}><PPF /></ProtectedLayout>} />
        <Route path="/nps" element={<ProtectedLayout user={user} onSignOut={handleSignOut}><NPS /></ProtectedLayout>} />
        <Route path="/real-estate" element={<ProtectedLayout user={user} onSignOut={handleSignOut}><RealEstate /></ProtectedLayout>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
