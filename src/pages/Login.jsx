import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { dbClient } from '../db';
import { AlertCircle, Eye, EyeOff, TrendingUp, Shield, BarChart3 } from 'lucide-react';

const features = [
  { icon: TrendingUp, text: 'Track stocks, PPF, NPS & real estate' },
  { icon: BarChart3, text: 'Visualise your wealth distribution' },
  { icon: Shield, text: 'Your data, secured with RLS policies' },
];

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('All fields are required.'); return; }
    setLoading(true);
    try {
      const { data, error: signInError } = await dbClient.auth.signIn({ email, password });
      if (signInError) { setError(signInError.message); }
      else { onSignIn(data.session?.user || data.user); navigate('/'); }
    } catch { setError('An unexpected error occurred. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-[#FEFDDF]">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #E87F24, transparent)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #73A5CA, transparent)' }} />
        <div className="absolute top-1/2 right-[-40px] w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FFC81E, transparent)' }} />

        <div className="relative z-10 p-12 pt-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-lg"
              style={{ background: 'linear-gradient(135deg, #E87F24, #FFC81E)' }}>
              AC
            </div>
            <span className="text-white font-bold text-lg tracking-wide">AssetControl</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your wealth,<br />
            <span style={{ color: '#FFC81E' }}>fully in control.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-12">
            One dashboard for every investment you own — stocks, bank, PPF, NPS, and real estate.
          </p>

          <div className="space-y-5">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center space-x-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(232,127,36,0.18)' }}>
                  <Icon className="w-4 h-4" style={{ color: '#E87F24' }} />
                </div>
                <span className="text-white/75 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 p-12 pb-10">
          <p className="text-white/30 text-xs">© 2026 AssetControl · Built for personal finance</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center space-x-2 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #E87F24, #FFC81E)' }}>
            AC
          </div>
          <span className="font-bold text-lg text-brand-dark">AssetControl</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-brand-dark">Welcome back</h2>
            <p className="text-brand-dark/50 text-sm mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-brand-dark/60 mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm rounded-xl px-4 py-3.5 border border-brand-border/80 bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none transition-all"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-brand-dark/60 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm rounded-xl px-4 py-3.5 pr-11 border border-brand-border/80 bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none transition-all"
                  required
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-dark/35 hover:text-brand-dark transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 disabled:opacity-60 flex items-center justify-center space-x-2 shadow-lg"
              style={{ background: loading ? '#ccc' : 'linear-gradient(135deg, #E87F24, #f59c42)', boxShadow: '0 4px 20px rgba(232,127,36,0.35)' }}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Signing in...</span></>
                : <span>Sign In</span>
              }
            </button>
          </form>

          <p className="text-center text-sm text-brand-dark/50 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#E87F24' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
