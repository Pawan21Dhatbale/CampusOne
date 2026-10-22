import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { Modal } from '../../components/Modal';
import { CsvImportModal } from '../../components/CsvImportModal';
import { AdminSwapModal } from '../../components/AdminSwapModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle, 
  Trash2, 
  Upload, 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TimetableManagementPage = () => {
  const [activeTab, setActiveTab] = useState('TIMETABLE'); // 'TIMETABLE' | 'SWAPS'
  const [timetable, setTimetable] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [swapStatusFilter, setSwapStatusFilter] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAdminSwapModalOpen, setIsAdminSwapModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    faculty_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    room_number: 'Room 301',
  });

  useEffect(() => {
    loadPrerequisites();
  }, []);

  useEffect(() => {
    if (activeTab === 'TIMETABLE') {
      loadTimetable();
    } else {
      loadSwaps();
    }
  }, [selectedClass, selectedDay, activeTab, swapStatusFilter]);

  const loadPrerequisites = async () => {
    try {
      const [clsRes, subRes, facRes] = await Promise.all([
        adminApi.getClasses(),
        adminApi.getSubjects(),
        adminApi.getFaculty(),
      ]);
      if (clsRes.success) setClasses(clsRes.data.classes || []);
      if (subRes.success) setSubjects(subRes.data.subjects || []);
      if (facRes.success) setFaculty(facRes.data.faculty || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedClass) params.class_id = selectedClass;
      if (selectedDay) params.day = selectedDay;
      const res = await adminApi.getTimetable(params);
      if (res.success && res.data) {
        setTimetable(res.data.timetable || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSwaps = async () => {
    setSwapsLoading(true);
    try {
      const params = {};
      if (swapStatusFilter) params.status = swapStatusFilter;
      const res = await adminApi.getSwaps(params);
      if (res.success && res.data) {
        setSwaps(res.data.swaps || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSwapsLoading(false);
    }
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      const res = await adminApi.createTimetableEntry(formData);
      if (res.success) {
        setIsModalOpen(false);
        loadTimetable();
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this scheduled timetable entry? (Historical attendance will remain safe).')) return;
    try {
      await adminApi.deactivateTimetableEntry(id);
      loadTimetable();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateSwapStatus = async (swapId, status) => {
    try {
      const res = await adminApi.updateSwapStatus(swapId, { status });
      if (res.success) {
        loadSwaps();
      }
    } catch (err) {
      alert(err.message || 'Failed to update swap status.');
    }
  };

  const handleDeleteSwap = async (swapId) => {
    if (!window.confirm('Permanently delete this lecture swap record?')) return;
    try {
      const res = await adminApi.deleteSwap(swapId);
      if (res.success) {
        loadSwaps();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete swap record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Timetable & Lecture Swapping
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Institutional lecture scheduling, conflict prevention, and teacher substitution management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'TIMETABLE' ? (
            <>
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-600 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-300"
              >
                <Upload className="h-4 w-4" /> Import CSV
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  setModalError('');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
              >
                <Plus className="h-4 w-4" /> Schedule New Lecture
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAdminSwapModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
            >
              <ArrowLeftRight className="h-4 w-4" /> Assign Substitute Teacher
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('TIMETABLE')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'TIMETABLE'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Scheduled Timetable</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SWAPS')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'SWAPS'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>Teacher Swaps & Substitutions</span>
        </button>
      </div>

      {activeTab === 'TIMETABLE' ? (
        <>
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
                  {c.code} - Sec {c.section} ({c.name})
                </option>
              ))}
            </select>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Days of Week</option>
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {(selectedClass || selectedDay) && (
              <button
                onClick={() => {
                  setSelectedClass('');
                  setSelectedDay('');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Timetable Grid */}
          {loading ? (
            <LoadingSpinner text="Retrieving schedule slots..." />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {daysOfWeek
                .filter((d) => !selectedDay || d === selectedDay)
                .map((day) => {
                  const dayEntries = timetable.filter((t) => t.day_of_week === day);
                  return (
                    <div
                      key={day}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          {day}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {dayEntries.length} Slots
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {dayEntries.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-400">No scheduled lectures</p>
                        ) : (
                          dayEntries.map((e) => (
                            <div
                              key={e.id}
                              className="group relative rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 hover:border-indigo-200 transition"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    {e.subject_code}
                                  </span>
                                  <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">
                                    {e.subject_name}
                                  </h4>
                                </div>
                                <span className="font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">
                                  {e.class_code} - Sec {e.section}
                                </span>
                              </div>

                              <div className="mt-2 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                  <span>{e.start_time} - {e.end_time}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="truncate">{e.faculty_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{e.room_number || 'Room TBD'}</span>
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
                                <button
                                  onClick={() => handleDeactivate(e.id)}
                                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Trash2 className="h-3 w-3" /> Deactivate
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      ) : (
        /* Tab 2: Swaps and Substitutions Management */
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Status:</span>
              <select
                value={swapStatusFilter}
                onChange={(e) => setSwapStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted / Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <button
              onClick={() => setIsAdminSwapModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Assign Substitute
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {swapsLoading ? (
              <LoadingSpinner text="Loading lecture swaps..." />
            ) : swaps.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No lecture swap requests found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Lecture / Course</th>
                      <th className="py-3 px-4">Target Date & Time</th>
                      <th className="py-3 px-4">Regular Faculty</th>
                      <th className="py-3 px-4">Substitute Faculty</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {swaps.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {s.entry?.subject_code}
                          </span>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {s.entry?.subject_name}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {s.entry?.class_code} - Sec {s.entry?.section}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                            {s.target_date}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {s.entry?.day_of_week} &bull; {s.entry?.start_time} - {s.entry?.end_time}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {s.requesting_faculty_name}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                          {s.substitute_faculty_name}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="truncate text-slate-700 dark:text-slate-300" title={s.reason}>
                            {s.reason || 'N/A'}
                          </p>
                          {s.notes && (
                            <span className="text-[10px] text-slate-400 block truncate" title={s.notes}>
                              {s.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
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
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSwapStatus(s.id, 'ACCEPTED')}
                                  title="Approve Swap"
                                  className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSwapStatus(s.id, 'REJECTED')}
                                  title="Reject Swap"
                                  className="rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSwap(s.id)}
                              title="Delete Record"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Lecture Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Lecture"
      >
        <form onSubmit={handleCreateEntry} className="space-y-4">
          {modalError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Class Batch *</label>
              <select
                required
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - Sec {c.section} ({c.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Course Subject *</label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Faculty Instructor *</label>
              <select
                required
                value={formData.faculty_id}
                onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select Faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>{f.full_name} ({f.department})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Day of Week *</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {daysOfWeek.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Start Time *</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">End Time *</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Room / Hall *</label>
              <input
                type="text"
                placeholder="Room 301"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {modalLoading ? 'Checking Conflicts...' : 'Save Lecture Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Timetable Bulk CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Bulk Import Timetable via CSV"
        description="Upload an institutional timetable CSV file. Class, Subject, Faculty, Day, and Time slots will be validated for conflict prevention."
        sampleHeaders={['class_code', 'subject_code', 'faculty_email', 'day_of_week', 'start_time', 'end_time', 'room_number']}
        sampleRows={[
          ['CS-3', 'CS301', 'faculty@mitaoe.ac.in', 'Monday', '09:00', '10:00', 'Room 301'],
          ['CS-3', 'CS302', 'faculty@mitaoe.ac.in', 'Monday', '10:15', '11:15', 'Lab 2'],
        ]}
        sampleFilename="timetable_import_template.csv"
        onUpload={(formData) => adminApi.importTimetableCsv(formData)}
        onSuccess={() => loadTimetable()}
      />

      {/* Admin Swap / Substitution Modal */}
      <AdminSwapModal
        isOpen={isAdminSwapModalOpen}
        onClose={() => setIsAdminSwapModalOpen(false)}
        onSuccess={() => loadSwaps()}
      />
    </div>
  );
};
