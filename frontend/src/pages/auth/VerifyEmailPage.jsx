import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { 
  CalendarCheck, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';

export const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  const [verifying, setVerifying] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Resend form
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState({ loading: false, message: '', success: false });

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (tok) => {
    setVerifying(true);
    setErrorMessage('');
    try {
      const res = await authApi.verifyEmail(tok);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login?verified=true');
      }, 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Verification token is invalid or has expired.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus({ loading: true, message: '', success: false });
    try {
      const res = await authApi.resendVerification(resendEmail.trim());
      setResendStatus({ 
        loading: false, 
        message: res.message || 'If an unverified account matches this email, a new link has been dispatched.', 
        success: true 
      });
    } catch (err) {
      setResendStatus({ loading: false, message: err.message, success: false });
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
            Email Verification
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Institutional security confirmation
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center">
          {verifying ? (
            <div className="py-8 space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Verifying your institutional credentials...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please wait while we confirm your email token with Supabase and our directory.
              </p>
            </div>
          ) : success ? (
            <div className="py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Email Successfully Verified!
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your institutional account is now active. Redirecting you to sign in...
                </p>
              </div>
              <Link
                to="/login?verified=true"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Resend Verification Link</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Enter your registered institutional email address to receive a fresh verification link.
                </p>

                {resendStatus.message && (
                  <div className={`mt-3 flex items-center gap-2 rounded-xl p-2.5 text-[11px] ${
                    resendStatus.success
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    {resendStatus.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                    <span>{resendStatus.message}</span>
                  </div>
                )}

                <form onSubmit={handleResend} className="mt-3 space-y-3">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pl-9 text-xs text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <button
                    type="submit"
                    disabled={resendStatus.loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {resendStatus.loading ? 'Dispatching...' : 'Send Verification Email'}
                  </button>
                </form>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
