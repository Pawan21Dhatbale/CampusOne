import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { Download, Search, Eye, Calendar, FileText } from 'lucide-react';

export const AttendanceReportsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Details Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    loadClasses();
    loadSessions();
  }, [selectedClass, selectedDate]);

  const loadClasses = async () => {
    try {
      const res = await adminApi.getClasses();
      if (res.success && res.data) {
        setClasses(res.data.classes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedClass) params.class_id = selectedClass;
      if (selectedDate) params.date = selectedDate;
      const res = await adminApi.getAttendanceSessions(params);
      if (res.success && res.data) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open(adminApi.exportAttendanceCsvUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Attendance Records & Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit finalized classroom attendance records with CSV export
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition"
        >
          <Download className="h-4 w-4" /> Export All Records (CSV)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} - Sec {c.section}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading attendance sessions..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Lecture Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Faculty Instructor</th>
                  <th className="py-3 px-4">Turnout (Pres / Tot)</th>
                  <th className="py-3 px-4">Attendance %</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No attendance sessions recorded for the selected parameters.
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
                          {s.class_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {s.faculty_name}
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
                          onClick={() => {
                            setActiveSession(s);
                            setDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={activeSession ? `Attendance Session: ${activeSession.subject_name}` : 'Session Details'}
        maxWidth="max-w-2xl"
      >
        {activeSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Lecture Date</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeSession.lecture_date}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Class & Section</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeSession.class_code} - Sec {activeSession.section}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Instructor</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeSession.faculty_name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Final Turnout</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeSession.present_count} Present, {activeSession.absent_count} Absent ({activeSession.attendance_percentage}%)
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
