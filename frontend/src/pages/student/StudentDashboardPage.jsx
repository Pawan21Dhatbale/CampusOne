import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../api/studentApi';
import { StatsCard } from '../../components/StatsCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Percent,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Clock,
  ArrowRight,
  BookOpen,
  Calculator
} from 'lucide-react';

export const StudentDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await studentApi.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Computing attendance summary..." />;

  const student = data?.student || {};
  const summary = data?.summary || {};
  const todayLectures = data?.today_lectures || [];
  const recentRecords = data?.recent_records || [];
  const subjects = summary.subjects || [];

  const overallPct = summary.overall_percentage || 0;
  const shortageCount = summary.subjects_below_threshold || 0;

  return (
    <div className="space-y-6">
      {/* Student Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Student Attendance Portal
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1">
              {student.full_name}
            </h1>
            <p className="text-xs text-emerald-100 mt-1">
              Roll No: <span className="font-mono font-bold text-white">{student.roll_number}</span> &bull; Class: {student.class_name} ({student.class_code})
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-100 block">Overall Attendance</span>
            <span className="text-3xl font-black text-white">{overallPct}%</span>
          </div>
        </div>
      </div>

      {/* Shortage Alert Banner if any subject is below threshold */}
      {shortageCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 dark:text-rose-200">
                Attendance Shortage Warning
              </p>
              <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                You have <strong>{shortageCount}</strong> subject(s) below the mandatory {summary.threshold_limit}% attendance threshold.
                Use the calculator to estimate classes needed to restore eligibility.
              </p>
            </div>
          </div>
          <Link
            to="/student/calculator"
            className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl bg-rose-600 px-3.5 py-2 font-bold text-white shadow-sm hover:bg-rose-700 transition shrink-0"
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Shortage Calculator</span>
          </Link>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Overall Attendance"
          value={`${overallPct}%`}
          subtitle="Lecture-weighted across all subjects"
          icon={Percent}
          color={overallPct >= 85 ? 'green' : overallPct >= 75 ? 'amber' : 'red'}
        />
        <StatsCard
          title="Lectures Conducted"
          value={summary.total_conducted || 0}
          subtitle="Finalized classroom lectures"
          icon={CalendarCheck}
          color="indigo"
        />
        <StatsCard
          title="Attended (Present)"
          value={summary.total_present || 0}
          subtitle="Lectures marked present"
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          title="Missed (Absent)"
          value={summary.total_absent || 0}
          subtitle="Lectures marked absent"
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Subject-wise Progress Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Subject-wise Attendance</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current standing per enrolled course</p>
          </div>
          <Link
            to="/student/subjects"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Detailed View <ArrowRight className="h-3.5 w-3.5" />
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
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
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

                {/* Progress bar */}
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
                    {sub.present} / {sub.conducted} lectures attended
                  </span>
                  <StatusBadge status={sub.status_tier} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Today's Lectures & Recent Marks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Lectures */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Today's Class Schedule</h3>
          {todayLectures.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No scheduled lectures today.</p>
          ) : (
            <div className="space-y-2.5">
              {todayLectures.map((lec) => (
                <div
                  key={lec.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {lec.subject_code}
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white">{lec.subject_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{lec.faculty_name} &bull; {lec.room_number || 'Room TBD'}</p>
                  </div>
                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    {lec.start_time} - {lec.end_time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance History */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Attendance Marks</h3>
            <Link
              to="/student/history"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Full History
            </Link>
          </div>

          {recentRecords.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No attendance marks recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{r.subject_name}</p>
                    <p className="text-[11px] text-slate-400">{r.date} &bull; {r.faculty_name}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
