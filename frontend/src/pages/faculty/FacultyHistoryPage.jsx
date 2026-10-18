import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyApi } from '../../api/facultyApi';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { History, Calendar, Eye, Users } from 'lucide-react';

export const FacultyHistoryPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await facultyApi.getHistory();
      if (res.success && res.data) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading session history..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Conducted Attendance History
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review historical finalized classroom attendance sessions and student turnout records
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Lecture Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Conducted Time</th>
                <th className="py-3 px-4">Turnout</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No conducted sessions recorded yet.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {s.lecture_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{s.subject_name}</span>
                      <span className="ml-1 text-[11px] font-mono text-slate-400">({s.subject_code})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {s.class_code} - Sec {s.section}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {s.present_count} / {s.total_students}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          s.attendance_percentage >= 85
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : s.attendance_percentage >= 75
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {s.attendance_percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/faculty/attendance/${s.timetable_entry_id}?date=${s.lecture_date}`)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </button>
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
