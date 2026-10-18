import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { Modal } from '../../components/Modal';
import { 
  CalendarCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState({ loading: false, message: '', success: false });
  
  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ loading: false, message: '', success: false });

  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get('expired') === 'true';
  const verifiedSuccess = queryParams.get('verified') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email/username and password.');
      return;
    }

    const trimmed = email.trim();
    if (trimmed.includes('@')) {
      const isMitaoe = trimmed.toLowerCase().endsWith('@mitaoe.ac.in');
      if (!isMitaoe) {
        setErrorMessage('Access restricted to MIT AOE accounts (@mitaoe.ac.in). Students must use their 12-digit PRN email (e.g. 202501100063@mitaoe.ac.in).');
        return;
      }
      const prefix = trimmed.split('@')[0];
      if (/^\d+$/.test(prefix) && prefix.length !== 12) {
        setErrorMessage('Student PRN email must have exactly 12 digits (e.g. 202501100063@mitaoe.ac.in).');
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');
    setIsUnverified(false);

    const res = await login(trimmed, password);
    setLoading(false);

    if (res.success) {
      navigate(res.targetPath);
    } else {
      const err = res.error || 'Authentication failed. Please verify credentials.';
      setErrorMessage(err);
      if (err.toLowerCase().includes('not verified') || err.toLowerCase().includes('verification')) {
        setIsUnverified(true);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendStatus({ loading: true, message: '', success: false });
    try {
      const res = await authApi.resendVerification(email.trim());
      setResendStatus({ loading: false, message: res.message || 'Verification email dispatched.', success: true });
    } catch (err) {
      setResendStatus({ loading: false, message: err.message, success: false });
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotStatus({ loading: true, message: '', success: false });
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setForgotStatus({ loading: false, message: res.message, success: true });
    } catch (err) {
      setForgotStatus({ loading: false, message: err.message, success: false });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div className="text-left">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Smart</span>
              <span className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">Attend</span>
            </div>
          </Link>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign In to Your Portal
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Role-verified institutional attendance & academic system
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {verifiedSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Your email address has been verified successfully! You may now sign in.</span>
            </div>
          )}

          {sessionExpired && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {isUnverified && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                  <span className="text-[11px] opacity-90">Need a fresh confirmation email?</span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendStatus.loading}
                    className="font-bold underline hover:text-rose-900 dark:hover:text-rose-200"
                  >
                    {resendStatus.loading ? 'Sending...' : 'Resend Link'}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendStatus.message && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
              resendStatus.success
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {resendStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{resendStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Institutional Email or 12-Digit PRN
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="202501100063@mitaoe.ac.in or 202501100063"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Students: Sign in with your 12-digit PRN email (e.g. 202501100063@mitaoe.ac.in) or 12-digit PRN
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-9 pr-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 dark:text-slate-400">
                Keep me signed in on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need to register or activate student credentials?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Account Password"
      >
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Enter your registered college email address and we will dispatch password recovery instructions.
          </p>

          {forgotStatus.message && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              forgotStatus.success 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {forgotStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{forgotStatus.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Registered Email Address
            </label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="e.g. user@college.edu"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotStatus.loading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {forgotStatus.loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
