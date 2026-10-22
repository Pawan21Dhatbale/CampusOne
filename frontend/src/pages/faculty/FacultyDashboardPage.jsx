import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyApi } from '../../api/facultyApi';
import { StatsCard } from '../../components/StatsCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { FacultySwapModal } from '../../components/FacultySwapModal';
import { 
  BookOpen, 
  CalendarCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Calendar,
  ArrowLeftRight,
  BellRing
} from 'lucide-react';

export const FacultyDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedLectureForSwap, setSelectedLectureForSwap] = useState(null);
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

  const handleOpenSwapForLecture = (lec) => {
    setSelectedLectureForSwap(lec);
    setIsSwapModalOpen(true);
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedLectureForSwap(null);
                setIsSwapModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3.5 py-2 backdrop-blur text-xs font-bold text-white transition shadow-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Lecture Swaps</span>
              {stats.pending_swaps_count > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-900">
                  {stats.pending_swaps_count}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 backdrop-blur text-xs font-semibold">
              <Calendar className="h-4 w-4 text-indigo-200" />
              <span>{data?.today_day}, {data?.today_date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Swaps Notification Banner */}
      {stats.pending_swaps_count > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500 p-2 text-white">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                You have {stats.pending_swaps_count} pending lecture swap request(s)
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                A colleague is busy and requested you to cover their lecture today or this week.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedLectureForSwap(null);
              setIsSwapModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition shrink-0"
          >
            Review Requests
          </button>
        </div>
      )}

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
          value={todayLectures.length}
          subtitle="Scheduled & substituted classes today"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Today's Lectures Schedule */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Today's Scheduled & Substituted Lectures
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
                className={`flex flex-col gap-4 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                  lec.is_substituted
                    ? 'border-purple-300 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-950/20'
                    : lec.is_swapped_away
                    ? 'border-slate-200 bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/20 opacity-75'
                    : 'border-slate-200/80 bg-slate-50/50 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {lec.subject_code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">&bull;</span>
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {lec.class_code} - Sec {lec.section}
                    </span>

                    {lec.is_substituted && (
                      <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Covering for Prof. {lec.substitute_for}
                      </span>
                    )}

                    {lec.is_swapped_away && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Swapped to Prof. {lec.substitute_faculty_name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lec.subject_name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {lec.start_time} - {lec.end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {lec.room_number || 'Room TBD'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {!lec.is_swapped_away && !lec.is_substituted && (
                    <button
                      type="button"
                      onClick={() => handleOpenSwapForLecture(lec)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                      title="Busy today? Swap with a colleague"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Swap</span>
                    </button>
                  )}

                  {lec.is_swapped_away ? (
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800">
                      Covered by Colleague
                    </span>
                  ) : lec.attendance_submitted ? (
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

      {/* Faculty Swap Modal */}
      <FacultySwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        preselectedLecture={selectedLectureForSwap}
        onSwapUpdated={() => loadDashboard()}
      />
    </div>
  );
};
