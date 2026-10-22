import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { Modal } from './Modal';
import { AlertCircle, CheckCircle2, User, Calendar, Clock, Send } from 'lucide-react';

export const AdminSwapModal = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [timetable, setTimetable] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    timetable_entry_id: '',
    substitute_faculty_id: '',
    target_date: new Date().toISOString().split('T')[0],
    reason: 'Administrative Substitution / Faculty Busy',
    notes: '',
    status: 'ACCEPTED',
  });

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [timeRes, facRes] = await Promise.all([
        adminApi.getTimetable(),
        adminApi.getFaculty(),
      ]);

      if (timeRes.success) setTimetable(timeRes.data.timetable || []);
      if (facRes.success) setFacultyList(facRes.data.faculty || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load timetable or faculty list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.timetable_entry_id || !formData.substitute_faculty_id || !formData.target_date) {
      setErrorMsg('Please select lecture entry, substitute faculty, and date.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await adminApi.createSwap({
        timetable_entry_id: parseInt(formData.timetable_entry_id),
        substitute_faculty_id: parseInt(formData.substitute_faculty_id),
        target_date: formData.target_date,
        reason: formData.reason,
        notes: formData.notes,
        status: formData.status,
      });

      if (res.success) {
        setSuccessMsg('Lecture substitution assigned and approved successfully!');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create substitution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin: Assign Lecture Substitute"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Directly assign a substitute faculty member to conduct a scheduled lecture when the regular teacher is busy or on leave.
        </p>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Scheduled Lecture Entry *
          </label>
          <select
            required
            value={formData.timetable_entry_id}
            onChange={(e) => setFormData({ ...formData, timetable_entry_id: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">-- Select Scheduled Lecture --</option>
            {timetable.map((t) => (
              <option key={t.id} value={t.id}>
                {t.day_of_week} ({t.start_time} - {t.end_time}): {t.subject_code} - {t.subject_name} | Regular: {t.faculty_name} ({t.class_code} Sec {t.section})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lecture Date *
            </label>
            <input
              type="date"
              required
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign Substitute Faculty *
            </label>
            <select
              required
              value={formData.substitute_faculty_id}
              onChange={(e) => setFormData({ ...formData, substitute_faculty_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Choose Substitute Faculty --</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} ({f.department} - {f.designation})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Administrative Reason
          </label>
          <input
            type="text"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="E.g. Faculty on emergency leave, exam duty, etc."
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Administrative Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special instructions or notes for the session..."
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitting ? 'Assigning...' : 'Assign & Approve'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
