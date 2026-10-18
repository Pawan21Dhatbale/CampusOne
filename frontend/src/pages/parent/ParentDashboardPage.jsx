import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { parentApi } from '../../api/parentApi';
import { StatsCard } from '../../components/StatsCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  Percent,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Clock,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export const ParentDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    loadDashboard(selectedChildId);
  }, [selectedChildId]);

  const loadDashboard = async (childId) => {
    setLoading(true);
    try {
      const res = await parentApi.getDashboard(childId);
      if (res.success && res.data) {
        setData(res.data);
        if (!selectedChildId && res.data.selected_child_id) {
          setSelectedChildId(res.data.selected_child_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <LoadingSpinner text="Connecting to student records..." />;

  const children = data?.children || [];
  const summary = data?.summary || {};
  const thisWeek = data?.this_week || {};
  const subjects = summary.subjects || [];
  const overallPct = summary.overall_percentage || 0;
  const shortageCount = summary.subjects_below_threshold || 0;

  const currentChild = children.find((c) => c.student_profile_id === Number(selectedChildId)) || children[0];

  return (
    <div className="space-y-6">
      {/* Header and Child Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Parent & Guardian Portal
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl mt-0.5">
            Academic Attendance Monitoring
          </h1>
        </div>

        {/* Multi-child Switcher Dropdown */}
        {children.length > 1 && (
          <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-2 dark:border-sky-900/50 dark:bg-sky-950/30">
            <Users className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 ml-1" />
            <span className="text-xs font-bold text-sky-900 dark:text-sky-200">Select Child:</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-900 focus:outline-none dark:border-sky-800 dark:bg-slate-900 dark:text-white"
            >
              {children.map((child) => (
                <option key={child.student_profile_id} value={child.student_profile_id}>
                  {child.full_name} ({child.roll_number})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected Child Info Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 p-6 text-white shadow-lg shadow-sky-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
              Monitoring Student
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              {currentChild?.full_name}
            </h2>
            <p className="text-xs text-sky-100 mt-1">
              Roll No: <span className="font-mono font-bold text-white">{currentChild?.roll_number}</span> &bull; Class: {currentChild?.class_name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur text-right">
              <span className="text-[10px] uppercase font-bold text-sky-100 block">Overall Standing</span>
              <span className="text-3xl font-black text-white">{overallPct}%</span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur text-right">
              <span className="text-[10px] uppercase font-bold text-sky-100 block">This Week</span>
              <span className="text-3xl font-black text-white">{thisWeek.percentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shortage Warning Banner */}
      {shortageCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs dark:border-rose-900/50 dark:bg-rose-950/30">
          <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-800 dark:text-rose-200">
              Low Attendance Notification
            </p>
            <p className="text-rose-700 dark:text-rose-300 mt-0.5">
              Your child has <strong>{shortageCount}</strong> subject(s) below the mandatory {summary.threshold_limit}% college attendance requirement.
              Regular classroom attendance is required to maintain exam eligibility.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Overall Attendance"
          value={`${overallPct}%`}
          subtitle="Cumulative across all courses"
          icon={Percent}
          color={overallPct >= 85 ? 'green' : overallPct >= 75 ? 'amber' : 'red'}
        />
        <StatsCard
          title="Total Lectures"
          value={summary.total_conducted || 0}
          subtitle="Conducted by college faculty"
          icon={CalendarCheck}
          color="indigo"
        />
        <StatsCard
          title="Lectures Attended"
          value={summary.total_present || 0}
          subtitle="Recorded as present"
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          title="Recorded Absences"
          value={summary.total_absent || 0}
          subtitle="Recorded as absent"
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Subject-wise Cards for Child */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Subject-wise Turnout</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current course-level performance for {currentChild?.full_name}</p>
          </div>
          <Link
            to="/parent/weekly"
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
          >
            Weekly Reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => {
            const isShortage = sub.percentage < 75;
            const isExcellent = sub.percentage >= 85;

            return (
              <div
                key={sub.subject_id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {sub.subject_code}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 line-clamp-1">
                      {sub.subject_name}
                    </h4>
                  </div>
                  <span
                    className={`font-black text-sm ${
                      isExcellent
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isShortage
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {sub.percentage}%
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExcellent ? 'bg-emerald-500' : isShortage ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, sub.percentage)}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {sub.present} / {sub.conducted} attended
                  </span>
                  <StatusBadge status={sub.status_tier} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
