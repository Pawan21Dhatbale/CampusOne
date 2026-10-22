import React, { useState, useEffect } from 'react';
import { facultyApi } from '../api/facultyApi';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import { 
  ArrowLeftRight, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock3,
  Send,
  Trash2
} from 'lucide-react';

export const FacultySwapModal = ({
  isOpen,
  onClose,
  preselectedLecture = null,
  onSwapUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('REQUEST'); // 'REQUEST' | 'INCOMING' | 'OUTGOING'
  const [colleagues, setColleagues] = useState([]);
  const [myTimetable, setMyTimetable] = useState([]);
  const [swaps, setSwaps] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [selectedColleagueId, setSelectedColleagueId] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Busy with official academic duties');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (preselectedLecture) {
        setSelectedEntryId(preselectedLecture.id);
      }
    }
  }, [isOpen, preselectedLecture]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [colRes, timeRes, swapRes] = await Promise.all([
        facultyApi.getColleagues(),
        facultyApi.getTimetable(),
        facultyApi.getSwaps(),
      ]);

      if (colRes.success) setColleagues(colRes.data.colleagues || []);
      if (timeRes.success) setMyTimetable(timeRes.data.timetable || []);
      if (swapRes.success) {
        setSwaps({
          incoming: swapRes.data.incoming || [],
          outgoing: swapRes.data.outgoing || [],
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load swap data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntryId || !selectedColleagueId || !targetDate) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await facultyApi.requestSwap({
        timetable_entry_id: parseInt(selectedEntryId),
        substitute_faculty_id: parseInt(selectedColleagueId),
        target_date: targetDate,
        reason,
        notes,
      });

      if (res.success) {
        setSuccessMsg('Lecture swap request sent to colleague successfully!');
        setNotes('');
        loadData();
        if (onSwapUpdated) onSwapUpdated();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send swap request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (swapId, action) => {
    try {
      const res = await facultyApi.respondToSwap(swapId, { action });
      if (res.success) {
        loadData();
        if (onSwapUpdated) onSwapUpdated();
      }
    } catch (err) {
      alert(err.message || 'Error updating swap request.');
    }
  };

  const handleCancel = async (swapId) => {
    if (!window.confirm('Cancel this lecture swap request?')) return;
    try {
      const res = await facultyApi.cancelSwap(swapId);
      if (res.success) {
        loadData();
        if (onSwapUpdated) onSwapUpdated();
      }
    } catch (err) {
      alert(err.message || 'Error cancelling swap request.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lecture Swap & Substitution"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('REQUEST');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
              activeTab === 'REQUEST'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Request Swap
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('INCOMING');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'INCOMING'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Incoming</span>
            {swaps.incoming.filter((s) => s.status === 'PENDING').length > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {swaps.incoming.filter((s) => s.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('OUTGOING');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
              activeTab === 'OUTGOING'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            My Requests ({swaps.outgoing.length})
          </button>
        </div>

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

        {/* Tab 1: Request Swap Form */}
        {activeTab === 'REQUEST' && (
          <form onSubmit={handleRequestSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Lecture to Swap / Substitute *
              </label>
              <select
                required
                value={selectedEntryId}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Choose from your scheduled lectures --</option>
                {myTimetable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.day_of_week} ({t.start_time} - {t.end_time}): {t.subject_name} ({t.class_code} Sec {t.section})
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
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Substitute Faculty Colleague *
                </label>
                <select
                  required
                  value={selectedColleagueId}
                  onChange={(e) => setSelectedColleagueId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Select Faculty Colleague --</option>
                  {colleagues.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Swap / Absence
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="Busy with official academic duties">Busy with official academic duties</option>
                <option value="Attending Conference / Faculty Development Program">Attending Conference / Workshop</option>
                <option value="University Examination Duty">University Examination Duty</option>
                <option value="Medical Emergency / Sick Leave">Medical Emergency / Sick Leave</option>
                <option value="Personal / Family Emergency">Personal / Family Emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instructions / Notes for Colleague (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Please cover Chapter 3 (Stack Implementation) or take doubt clearing session."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? 'Submitting...' : 'Send Swap Request'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Incoming Swap Requests */}
        {activeTab === 'INCOMING' && (
          <div className="space-y-3">
            {swaps.incoming.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No incoming swap requests from colleagues.
              </p>
            ) : (
              swaps.incoming.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {s.entry?.subject_name} ({s.entry?.subject_code})
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Requested by: <strong className="text-slate-900 dark:text-white">{s.requesting_faculty_name}</strong>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : s.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {s.target_date} ({s.entry?.day_of_week})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {s.entry?.start_time} - {s.entry?.end_time}
                    </span>
                    <span>Class: {s.entry?.class_code} - Sec {s.entry?.section}</span>
                  </div>

                  {s.reason && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <strong>Reason:</strong> {s.reason}
                      {s.notes && <span className="block mt-0.5 text-slate-500">Note: {s.notes}</span>}
                    </p>
                  )}

                  {s.status === 'PENDING' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => handleRespond(s.id, 'REJECT')}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespond(s.id, 'ACCEPT')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept & Cover Lecture
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Outgoing Requests */}
        {activeTab === 'OUTGOING' && (
          <div className="space-y-3">
            {swaps.outgoing.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                You have not created any lecture swap requests.
              </p>
            ) : (
              swaps.outgoing.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {s.entry?.subject_name} ({s.entry?.subject_code})
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Substitute: <strong className="text-slate-900 dark:text-white">{s.substitute_faculty_name}</strong>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : s.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : s.status === 'CANCELLED'
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {s.target_date} ({s.entry?.day_of_week})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {s.entry?.start_time} - {s.entry?.end_time}
                    </span>
                  </div>

                  {s.status === 'PENDING' && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleCancel(s.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
