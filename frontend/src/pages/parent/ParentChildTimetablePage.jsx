import React, { useState, useEffect } from 'react';
import { parentApi } from '../../api/parentApi';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ParentChildTimetablePage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadTimetable(selectedChildId);
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

  const loadTimetable = async (childId) => {
    setLoading(true);
    try {
      const res = await parentApi.getChildTimetable(childId);
      if (res.success && res.data) {
        setTimetable(res.data.timetable || []);
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
            Child Class Timetable
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly class schedule for your child
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

      {loading ? (
        <LoadingSpinner text="Retrieving class timetable..." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {daysOfWeek.map((day) => {
            const dayEntries = timetable.filter((t) => t.day_of_week === day);

            return (
              <div
                key={day}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sky-500" />
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
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div>
                          <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                            {e.subject_code}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">
                            {e.subject_name}
                          </h4>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <Clock className="h-3.5 w-3.5 text-sky-500" />
                            {e.start_time} - {e.end_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {e.room_number || 'Room TBD'}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" /> {e.faculty_name}
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
    </div>
  );
};
