import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Plus, Calendar, Clock, MapPin, User, AlertTriangle, Trash2 } from 'lucide-react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TimetableManagementPage = () => {
  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    loadTimetable();
  }, [selectedClass, selectedDay]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Timetable & Lecture Scheduling
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure lecture slots with real-time class, faculty, and room conflict prevention
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setModalError('');
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" /> Schedule New Lecture
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
              {c.code} - Sec {c.section} ({c.name})
            </option>
          ))}
        </select>

        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All Days</option>
          {daysOfWeek.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Timetable Cards Grid by Day */}
      {loading ? (
        <LoadingSpinner text="Loading timetable schedule..." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {daysOfWeek
            .filter((d) => !selectedDay || selectedDay === d)
            .map((day) => {
              const dayEntries = timetable.filter((t) => t.day_of_week === day);
              return (
                <div key={day} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      {day}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {dayEntries.length} lectures
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {dayEntries.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">No lectures scheduled</p>
                    ) : (
                      dayEntries.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 relative group"
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
                            <button
                              onClick={() => handleDeactivate(e.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                              title="Deactivate slot"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                              <Clock className="h-3.5 w-3.5 text-indigo-500" />
                              {e.start_time} - {e.end_time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {e.room_number || 'Room TBD'}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] dark:border-slate-800 text-slate-500">
                            <span className="flex items-center gap-1 font-medium">
                              <User className="h-3 w-3" /> {e.faculty_name}
                            </span>
                            <span className="font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {e.class_code}
                            </span>
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

      {/* Add Timetable Entry Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Lecture Slot">
        <form onSubmit={handleCreateEntry} className="space-y-3">
          {modalError && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Class & Section</label>
              <select
                required
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - Sec {c.section}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Subject</label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Assigned Faculty</label>
              <select
                required
                value={formData.faculty_id}
                onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select Faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name} ({f.faculty_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Day of the Week</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {daysOfWeek.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Start Time</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">End Time</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Room</label>
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
    </div>
  );
};
