import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { dbClient } from '../db';
import { AlertCircle, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pass) => {
    // constraints: minimum length 8, must be alphanumeric, must contain 1 uppercase, 1 lowercase, 1 special character
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    
    const hasUppercase = /[A-Z]/.test(pass);
    const hasLowercase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    
    // Check if alphanumeric + special character (essentially containing both letters and numbers)
    const isAlphanumeric = /[A-Za-z]/.test(pass) && /[0-9]/.test(pass);

    if (!isAlphanumeric) return 'Password must be alphanumeric (contain both letters and numbers).';
    if (!hasUppercase) return 'Password must contain at least one uppercase letter.';
    if (!hasLowercase) return 'Password must contain at least one lowercase letter.';
    if (!hasSpecial) return 'Password must contain at least one special character.';
    
    return null;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await dbClient.auth.signUp({
        email,
        password,
        username
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Success
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFDDF] px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-brand-border/60 overflow-hidden">
        <div className="bg-brand-blue/10 px-8 py-6 text-center border-b border-brand-border/40">
          <div className="w-12 h-12 bg-brand-orange rounded-2xl flex items-center justify-center font-extrabold text-white shadow-md text-xl mx-auto mb-3">
            AG
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">Create Your Account</h2>
          <p className="text-sm text-brand-dark/60 mt-1">Start managing your assets today</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="border border-brand-border rounded-xl overflow-hidden shadow-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-brand-border/50">
                    <td className="w-1/3 bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark/70 align-middle">
                      Username
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. johndoe"
                        className="w-full text-sm border-0 p-0 focus:ring-0 focus:outline-none"
                        required
                        disabled={loading}
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-brand-border/50">
                    <td className="w-1/3 bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark/70 align-middle">
                      Email
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full text-sm border-0 p-0 focus:ring-0 focus:outline-none"
                        required
                        disabled={loading}
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-brand-border/50">
                    <td className="w-1/3 bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark/70 align-middle">
                      Password
                    </td>
                    <td className="px-4 py-3 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-sm border-0 p-0 pr-8 focus:ring-0 focus:outline-none"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/3 bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark/70 align-middle">
                      Confirm
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-sm border-0 p-0 focus:ring-0 focus:outline-none"
                        required
                        disabled={loading}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-brand-dark/50 leading-relaxed bg-brand-light p-3 rounded-lg border border-brand-border/40">
              <span className="font-semibold text-brand-dark/70">Password Requirements:</span> Minimum 8 characters, alphanumeric, at least one uppercase letter, one lowercase letter, and one special character.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-brand-orange hover:bg-brand-orange/95 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-brand-orange/20 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              <UserPlus className="w-5 h-5" />
              <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
            </button>
          </form>

          <p className="text-center text-sm text-brand-dark/60 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-orange hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
