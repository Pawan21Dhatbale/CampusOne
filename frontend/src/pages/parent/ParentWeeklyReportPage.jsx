import React, { useState, useEffect } from 'react';
import { parentApi } from '../../api/parentApi';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { TrendingUp, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const ParentWeeklyReportPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadReports(selectedChildId);
    }
  }, [selectedChildId]);

  const loadChildren = async () => {
    try {
      const res = await parentApi.getChildren();
      if (res.success && res.data) {
        const list = res.data.children || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId(list[0].student_profile_id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReports = async (childId) => {
    setLoading(true);
    try {
      const res = await parentApi.getChildWeeklyReport(childId, 4);
      if (res.success && res.data) {
        setWeeklyReports(res.data.weekly_reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && weeklyReports.length === 0) return <LoadingSpinner text="Generating weekly attendance reports from database..." />;

  const chartData = [...weeklyReports].reverse().map((w) => ({
    label: w.week_label,
    attendance_rate: w.attendance_percentage,
    conducted: w.conducted,
    attended: w.attended,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Weekly Attendance Performance Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly progression aggregated from actual finalized classroom sessions
          </p>
        </div>

        {children.length > 1 && (
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-900 dark:border-sky-800 dark:bg-slate-900 dark:text-white"
          >
            {children.map((c) => (
              <option key={c.student_profile_id} value={c.student_profile_id}>
                {c.full_name} ({c.roll_number})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Weekly Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Weekly Attendance Trend (Past 4 Weeks)</h3>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
              <Tooltip />
              <Bar dataKey="attendance_rate" name="Turnout %" fill="#0284c7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Breakdown Cards */}
      <div className="space-y-4">
        {weeklyReports.map((w, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-sky-500" />
                  {w.week_label} &bull; {w.week_start} to {w.week_end}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">
                  {w.conducted} Conducted &bull; <strong className="text-emerald-600">{w.attended} Attended</strong> &bull; <strong className="text-rose-600">{w.absent} Absent</strong>
                </span>
                <span className={`font-black text-sm ${w.attendance_percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {w.attendance_percentage}%
                </span>
              </div>
            </div>

            {/* Subject Breakdown within this week */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {w.subjects.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No finalized lectures occurred during this weekly window.</p>
              ) : (
                w.subjects.map((s) => (
                  <div key={s.code} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                      <span className="font-black text-xs text-sky-600 dark:text-sky-400">{s.pct}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {s.attended} / {s.conducted} classes attended this week
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
