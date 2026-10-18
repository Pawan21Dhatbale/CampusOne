import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { StatsCard } from '../../components/StatsCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Users,
  GraduationCap,
  CalendarCheck2,
  BookOpen,
  CalendarDays,
  ShieldAlert,
  Percent,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Computing institution statistics..." />;
  if (error) return <div className="text-rose-500 text-sm p-4">Error: {error}</div>;

  const kpi = stats?.kpi || {};

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Academic Administration Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Institution-wide attendance metrics, daily trends, and academic tracking
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={kpi.total_students || 0}
          subtitle="Enrolled active students"
          icon={GraduationCap}
          color="indigo"
        />
        <StatsCard
          title="Total Faculty"
          value={kpi.total_faculty || 0}
          subtitle="Active teaching staff"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Institution Attendance"
          value={`${kpi.institution_attendance_percentage || 0}%`}
          subtitle="All finalized lectures"
          icon={Percent}
          color="green"
        />
        <StatsCard
          title="Shortage Alerts"
          value={kpi.low_attendance_students_count || 0}
          subtitle="Students below 75% threshold"
          icon={ShieldAlert}
          color="red"
        />
      </div>

      {/* Additional Quick Counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Active Classes</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{kpi.total_classes || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Total Subjects</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{kpi.total_subjects || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Today's Lectures</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{kpi.today_scheduled_lectures || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Finalized Today</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{kpi.today_finalized_sessions || 0}</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Attendance Trend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Attendance Trend (Last 7 Days)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average finalized lecture attendance</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.daily_trends || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="attendance_percentage"
                  name="Attendance Rate"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class-wise Attendance Comparison */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class-wise Attendance Comparison</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Aggregated attendance by batch/section</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.class_stats || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="class_name" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                <Tooltip />
                <Bar dataKey="attendance_percentage" name="Attendance %" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Security & Activity Audit Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent System Audit Trail</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800 uppercase font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats?.recent_activity?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-400">No recent activity recorded.</td>
                </tr>
              ) : (
                stats?.recent_activity?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                      {log.user_name}
                    </td>
                    <td className="py-2 px-3">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                      {log.ip_address || 'local'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
