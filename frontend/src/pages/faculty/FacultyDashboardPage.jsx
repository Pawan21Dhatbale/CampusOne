import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyApi } from '../../api/facultyApi';
import { StatsCard } from '../../components/StatsCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  BookOpen, 
  CalendarCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Calendar
} from 'lucide-react';

export const FacultyDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await facultyApi.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading faculty workspace..." />;

  const faculty = data?.faculty || {};
  const stats = data?.stats || {};
  const todayLectures = data?.today_lectures || [];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Faculty Instructor Portal
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1">
              Welcome, {faculty.full_name}
            </h1>
            <p className="text-xs text-indigo-100 mt-1">
              {faculty.designation} &bull; Department of {faculty.department} (ID: {faculty.faculty_id})
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 backdrop-blur text-xs font-semibold">
            <Calendar className="h-4 w-4 text-indigo-200" />
            <span>{data?.today_day}, {data?.today_date}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Assigned Subjects"
          value={stats.assigned_subjects || 0}
          subtitle="Courses you teach this semester"
          icon={BookOpen}
          color="indigo"
        />
        <StatsCard
          title="Conducted Sessions"
          value={stats.total_conducted_sessions || 0}
          subtitle="Total finalized classroom lectures"
          icon={CalendarCheck}
          color="green"
        />
        <StatsCard
          title="Today's Lectures"
          value={stats.today_lectures_count || 0}
          subtitle="Scheduled on today's timetable"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Today's Lectures Schedule */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Today's Scheduled Lectures
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an eligible lecture slot to mark attendance using the absent-first workflow
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {todayLectures.length} Classes Today
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {todayLectures.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No lectures scheduled for you today. Check your full timetable for other days.
            </div>
          ) : (
            todayLectures.map((lec) => (
              <div
                key={lec.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {lec.subject_code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">&bull;</span>
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {lec.class_code} - Sec {lec.section}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lec.subject_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {lec.start_time} - {lec.end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {lec.room_number || 'Room TBD'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {lec.attendance_submitted ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Attendance Finalized
                      </span>
                      <button
                        onClick={() => navigate(`/faculty/attendance/${lec.id}?date=${data?.today_date}`)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        Inspect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/faculty/attendance/${lec.id}?date=${data?.today_date}`)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
                    >
                      <span>Take Attendance</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
