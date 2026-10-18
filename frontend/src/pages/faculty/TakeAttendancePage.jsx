import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { facultyApi } from '../../api/facultyApi';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle,
  Send,
  HelpCircle,
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';

export const TakeAttendancePage = () => {
  const { lectureId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const lectureDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lectureInfo, setLectureInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [absentIds, setAbsentIds] = useState(new Set());
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' or 'ABSENT_ONLY'
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Correction Request Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionTargetStudent, setCorrectionTargetStudent] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionRequestedStatus, setCorrectionRequestedStatus] = useState('PRESENT');

  useEffect(() => {
    loadRoster();
  }, [lectureId, lectureDate]);

  const loadRoster = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await facultyApi.getLectureStudents(lectureId, lectureDate);
      if (res.success && res.data) {
        const data = res.data;
        setLectureInfo(data.lecture);
        setIsAlreadySubmitted(data.is_already_submitted);

        const initialAbsent = new Set();
        (data.students || []).forEach((s) => {
          if (s.is_absent) {
            initialAbsent.add(s.student_profile_id);
          }
        });
        setStudents(data.students || []);
        setAbsentIds(initialAbsent);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual student absent status
  const toggleAbsent = (studentProfileId) => {
    if (isAlreadySubmitted) return;
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentProfileId)) {
        next.delete(studentProfileId); // unchecked -> PRESENT
      } else {
        next.add(studentProfileId);    // checked -> ABSENT
      }
      return next;
    });
  };

  const markAllPresent = () => {
    if (isAlreadySubmitted) return;
    setAbsentIds(new Set());
  };

  const selectAllAbsent = () => {
    if (isAlreadySubmitted) return;
    const all = new Set(students.map((s) => s.student_profile_id));
    setAbsentIds(all);
  };

  // Calculate live statistics
  const totalEligible = students.length;
  const absentCount = absentIds.size;
  const presentCount = Math.max(0, totalEligible - absentCount);
  const turnoutPercentage = totalEligible > 0 ? ((presentCount / totalEligible) * 100).toFixed(1) : 100;

  // Filter students by search and filter mode
  const displayedStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'ABSENT_ONLY') {
      return absentIds.has(s.student_profile_id);
    }
    return true;
  });

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');
    setConfirmModalOpen(false);

    try {
      const payload = {
        date: lectureDate,
        absent_student_ids: Array.from(absentIds),
        notes: notes.trim(),
      };
      const res = await facultyApi.submitAttendance(lectureId, payload);
      if (res.success) {
        setSuccessMsg('Attendance finalized and securely saved to PostgreSQL.');
        setIsAlreadySubmitted(true);
        loadRoster();
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCorrection = (student) => {
    setCorrectionTargetStudent(student);
    setCorrectionRequestedStatus(absentIds.has(student.student_profile_id) ? 'PRESENT' : 'ABSENT');
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  const handleSendCorrectionRequest = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) return;

    try {
      const res = await facultyApi.requestCorrection({
        session_id: lectureInfo.session_id,
        student_id: correctionTargetStudent.student_profile_id,
        requested_status: correctionRequestedStatus,
        reason: correctionReason,
      });
      if (res.success) {
        alert('Attendance revision request submitted to administration.');
        setCorrectionModalOpen(false);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving class roster and validating lecture authorization..." />;

  const absentStudentObjects = students.filter((s) => absentIds.has(s.student_profile_id));

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/faculty')}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {isAlreadySubmitted ? 'Inspect Finalized Attendance' : 'Take Attendance (Absent-First)'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lectureInfo?.subject_name} &bull; Class {lectureInfo?.class_code} - Sec {lectureInfo?.section}
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Lecture Details Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {lectureInfo?.subject_code}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                {lectureInfo?.subject_name}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" /> {lectureDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-indigo-500" /> {lectureInfo?.start_time} - {lectureInfo?.end_time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" /> {lectureInfo?.room_number || 'Room TBD'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAlreadySubmitted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="h-4 w-4" /> Finalized in Database
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <Clock className="h-4 w-4" /> Pending Submission
              </span>
            )}
          </div>
        </div>

        {/* Absent-First Workflow Explainer Tip */}
        {!isAlreadySubmitted && (
          <div className="mt-4 rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="font-bold">Absent-First Workflow Active:</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                All <strong>{totalEligible}</strong> enrolled students are marked <strong>PRESENT</strong> by default.
                Simply check the checkbox next to any student who is <strong>ABSENT</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Roster Controls & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by student name or roll no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pl-9 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pill */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilterMode('ABSENT_ONLY')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                filterMode === 'ABSENT_ONLY'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 hover:text-rose-700 dark:text-rose-400'
              }`}
            >
              Absent Only ({absentCount})
            </button>
          </div>

          {!isAlreadySubmitted && (
            <>
              <button
                onClick={markAllPresent}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                Clear Absentees
              </button>
              <button
                onClick={selectAllAbsent}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition"
              >
                Mark All Absent
              </button>
            </>
          )}
        </div>
      </div>

      {/* Student Attendance Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Mark Absent</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Current Status</th>
                {isAlreadySubmitted && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((s) => {
                  const isAbsent = absentIds.has(s.student_profile_id);
                  return (
                    <tr
                      key={s.student_profile_id}
                      onClick={() => !isAlreadySubmitted && toggleAbsent(s.student_profile_id)}
                      className={`cursor-pointer transition ${
                        isAbsent
                          ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={isAlreadySubmitted}
                          checked={isAbsent}
                          onChange={() => toggleAbsent(s.student_profile_id)}
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {s.roll_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {s.full_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {s.student_id}
                      </td>
                      <td className="py-3 px-4">
                        {isAbsent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                            <XCircle className="h-3 w-3" /> Absent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle2 className="h-3 w-3" /> Present
                          </span>
                        )}
                      </td>
                      {isAlreadySubmitted && (
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenCorrection(s)}
                            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                          >
                            Request Revision
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Attendance Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Total Enrolled</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">{totalEligible}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Present</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{presentCount}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Absent</span>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">{absentCount}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Live Turnout Rate</span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{turnoutPercentage}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAlreadySubmitted ? (
              <button
                onClick={() => setConfirmModalOpen(true)}
                disabled={submitting || totalEligible === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" />
                <span>Review & Submit Attendance</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Attendance Saved & Locked
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Review & Confirm Attendance Submission"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Please review the absent list below before finalizing. Once finalized, records will update student and parent dashboards.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-700">
              <span>Class: {lectureInfo?.class_code}</span>
              <span>Turnout: {presentCount} / {totalEligible} ({turnoutPercentage}%)</span>
            </div>

            <div className="mt-2">
              <span className="font-bold text-rose-600 dark:text-rose-400">
                Absent Students ({absentCount}):
              </span>

              {absentCount === 0 ? (
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  &bull; No students marked absent. All {totalEligible} students are Present!
                </p>
              ) : (
                <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {absentStudentObjects.map((s) => (
                    <li key={s.student_profile_id} className="pt-1 flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{s.full_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{s.roll_number}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Session Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Covered Chapter 4 Binary Search Trees"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Back to Edit
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Confirm & Finalize Attendance'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Revision Request Modal */}
      <Modal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        title="Submit Attendance Correction Request"
      >
        <form onSubmit={handleSendCorrectionRequest} className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Request an administrative revision for <strong>{correctionTargetStudent?.full_name}</strong> (Roll: {correctionTargetStudent?.roll_number}).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Requested Status</label>
            <select
              value={correctionRequestedStatus}
              onChange={(e) => setCorrectionRequestedStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="PRESENT">Mark as PRESENT</option>
              <option value="ABSENT">Mark as ABSENT</option>
              <option value="LEAVE">Mark as APPROVED LEAVE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reason for Correction</label>
            <textarea
              required
              rows="3"
              placeholder="e.g. Student arrived with formal medical certificate or late slip verified."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCorrectionModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
