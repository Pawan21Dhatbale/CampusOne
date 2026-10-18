import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CalendarCheck, 
  Lock, 
  Mail, 
  User, 
  CreditCard, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    institutional_id: '',
    role: 'student',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ error: '', success: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // If user types/pastes email, auto-detect 12-digit PRN
      if (name === 'email') {
        const prnMatch = value.match(/^(\d{12})/);
        if (prnMatch) {
          updated.institutional_id = prnMatch[1];
          updated.username = prnMatch[1];
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: '', success: '' });

    // Validate 12-digit PRN email format
    const prnRegex = /^\d{12}@mitaoe\.ac\.in$/i;
    if (!prnRegex.test(formData.email.trim())) {
      setStatus({
        error: 'Registration requires a valid MIT AOE institutional email containing your 12-digit PRN (e.g. 202501100063@mitaoe.ac.in).',
        success: '',
      });
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setStatus({ error: 'Passwords do not match.', success: '' });
      return;
    }

    if (formData.password.length < 6) {
      setStatus({ error: 'Password must be at least 6 characters.', success: '' });
      return;
    }

    const prn = formData.email.split('@')[0];

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/register', {
        full_name: formData.full_name,
        email: formData.email.trim().toLowerCase(),
        username: prn,
        institutional_id: prn,
        role: formData.role,
        password: formData.password,
      });

      setStatus({
        error: '',
        success: 'Registration successful! Your account is active. Redirecting to sign in...',
      });
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      // In case self-service endpoint isn't open yet or returns error
      const msg = err.response?.data?.message || err.message || 'Registration request could not be processed.';
      setStatus({
        error: msg,
        success: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
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
            Institutional Account Registration
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Activate or register your verified campus credentials
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {status.error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{status.error}</span>
            </div>
          )}

          {status.success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{status.success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Institutional Email (12-Digit PRN)
                </label>
                <div className="relative mt-1">
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="202501100063@mitaoe.ac.in"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Format: 12-digit PRN @ mitaoe.ac.in (e.g. 202501100063@mitaoe.ac.in)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  PRN Number (12 Digits)
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    name="institutional_id"
                    required
                    maxLength={12}
                    value={formData.institutional_id}
                    onChange={handleChange}
                    placeholder="202501100063"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Auto-populated from institutional email prefix
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Role
              </label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, role: 'student' }))}
                  className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                    formData.role === 'student'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, role: 'parent' }))}
                  className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                    formData.role === 'parent'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  Parent Portal
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm_password"
                    required
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an active account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
