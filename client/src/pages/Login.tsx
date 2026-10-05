import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { studentApi } from '../api';
import AuthSplit from '../components/AuthSplit';
import { EyeIcon } from "@animateicons/react/lucide";
import { EyeOffIcon } from "@animateicons/react/lucide";
import { MailIcon } from "@animateicons/react/lucide";
import { LockIcon } from "@animateicons/react/lucide";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      studentApi.getEnrollmentStatus()
        .then(res => navigate(res.data.hasEnrollment ? '/student' : '/student/select-track', { replace: true }))
        .catch(() => navigate('/student/select-track', { replace: true }));
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await login(email, password, remember);
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u && u.role !== 'admin') sessionStorage.setItem('iq:channel-banner', '1');
      } catch {
        sessionStorage.setItem('iq:channel-banner', '1');
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <AuthSplit>
      <div>
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-105 transition-all duration-300">
            <span className="text-white font-bold text-base">IQ</span>
          </div>
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in with email, phone number or registration number</p>
      </div>

      {error && (
        <div className="mt-5 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
          <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl flex items-center gap-2">
          <span className="shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Check size={12} /></span>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <div className="relative">
            <MailIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="login-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="username"
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-300"
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <LockIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20"
            />
            <span className="text-gray-600">Remember me</span>
          </label>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      <p className="mt-5 text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
          Create account
        </Link>
      </p>
    </AuthSplit>
  );
}
