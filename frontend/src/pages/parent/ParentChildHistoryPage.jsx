import React, { useState, useEffect } from 'react';
import { parentApi } from '../../api/parentApi';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { History, Calendar, Clock, User } from 'lucide-react';

export const ParentChildHistoryPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadHistory(selectedChildId);
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

  const loadHistory = async (childId) => {
    setLoading(true);
    try {
      const res = await parentApi.getChildHistory(childId);
      if (res.success && res.data) {
        setRecords(res.data.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Child Attendance History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chronological audit log of all finalized attendance sessions for your child
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading attendance history..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Lecture Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Lecture Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No attendance records found for this student.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {r.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {r.subject_name} <span className="font-mono text-slate-400 font-normal">({r.subject_code})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {r.faculty_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {r.start_time} - {r.end_time}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
