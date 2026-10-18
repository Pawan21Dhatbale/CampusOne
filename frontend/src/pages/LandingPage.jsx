import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck,
  ShieldCheck,
  Users,
  GraduationCap,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Lock,
  Clock
} from 'lucide-react';

export const LandingPage = () => {
  const { user, getRoleDashboardPath } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Smart<span className="text-indigo-600 dark:text-indigo-400">Attend</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate(getRoleDashboardPath(user.role))}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" /> Next-Generation College Attendance Platform
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Smarter, Faster, <span className="text-indigo-600 dark:text-indigo-400">Absent-First</span> Attendance
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            A unified, multi-portal academic attendance management system with timetable conflict detection, 
            instant absent-first marking, shortage forecasting, and real-time parent monitoring.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition"
            >
              Access Portal <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Key Feature Cards */}
      <section className="py-12 border-y border-slate-200/80 bg-white/50 dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Absent-First Marking</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All eligible students are marked present by default. Faculty simply check off absent students, saving over 80% of classroom time.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Shortage Mathematical Modeling</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Calculates the exact number of consecutive upcoming classes a student needs to attend: <code>(P + x)/(T + x) &ge; R</code>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Multi-Portal RBAC Security</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Strict database isolation prevents parents from viewing other students, and blocks faculty from altering unassigned classes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Role Portals */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Dedicated Role-Based Portals
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Unified authentication dynamically routes authenticated users to their authorized workspace:
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Admin */}
            <div className="rounded-2xl border border-purple-200/80 bg-white p-6 shadow-sm dark:border-purple-900/40 dark:bg-slate-900 flex flex-col justify-between hover:border-purple-400 transition-colors">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Administration
                </span>
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Admin Portal</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Enterprise control over students, faculty directories, academic classes, timetable conflicts, and campus analytics.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 w-full rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
              >
                Sign In to Portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Faculty */}
            <div className="rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900 flex flex-col justify-between hover:border-indigo-400 transition-colors">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Faculty & Staff
                </span>
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Faculty Portal</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Absent-first classroom attendance marking, slot conflict prevention, lecture logs, and student shortage notices.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Sign In to Portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Student */}
            <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900 flex flex-col justify-between hover:border-emerald-400 transition-colors">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Enrolled Students
                </span>
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Student Portal</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Real-time attendance percentage breakdown, shortage recovery forecasts, class timetable, and warning alerts.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Sign In to Portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Parent */}
            <div className="rounded-2xl border border-sky-200/80 bg-white p-6 shadow-sm dark:border-sky-900/40 dark:bg-slate-900 flex flex-col justify-between hover:border-sky-400 transition-colors">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 mb-4">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  Parents & Guardians
                </span>
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Parent Portal</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Independent multi-child academic monitoring, strict data isolation, attendance history, and absence alerts.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 w-full rounded-xl bg-sky-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 transition"
              >
                Sign In to Portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>SmartAttend — Smart Attendance Management System. Built for Full-Stack Learning & College Deployment.</p>
      </footer>
    </div>
  );
};
