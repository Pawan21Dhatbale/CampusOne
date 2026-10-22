import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyApi } from '../../api/facultyApi';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CsvImportModal } from '../../components/CsvImportModal';
import { FacultySwapModal } from '../../components/FacultySwapModal';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Upload, 
  ArrowLeftRight 
} from 'lucide-react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyTimetablePage = () => {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedLectureForSwap, setSelectedLectureForSwap] = useState(null);
  const navigate = useNavigate();

  const todayDate = new Date().toISOString().split('T')[0];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await facultyApi.getTimetable();
      if (res.success && res.data) {
        setTimetable(res.data.timetable || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSwapForLecture = (lecture) => {
    setSelectedLectureForSwap(lecture);
    setIsSwapModalOpen(true);
  };

  if (loading) return <LoadingSpinner text="Retrieving personal timetable..." />;

  return (
    <div className="space-y-6">
      {/* Header with Import and Swap actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Personal Lecture Timetable
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assigned scheduled classes. Lectures scheduled for today are highlighted for one-click attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-600 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-300"
          >
            <Upload className="h-4 w-4" /> Import Timetable (CSV)
          </button>
          <button
            onClick={() => {
              setSelectedLectureForSwap(null);
              setIsSwapModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
          >
            <ArrowLeftRight className="h-4 w-4" /> Swap / Substitute Lecture
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {daysOfWeek.map((day) => {
          const dayEntries = timetable.filter((t) => t.day_of_week === day);
          const isToday = day === todayDayName;

          return (
            <div
              key={day}
              className={`rounded-2xl border p-5 shadow-sm transition ${
                isToday
                  ? 'border-indigo-400 bg-indigo-50/20 ring-1 ring-indigo-400 dark:border-indigo-600 dark:bg-indigo-950/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className={`h-4 w-4 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  {day}
                  {isToday && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Today
                    </span>
                  )}
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
                      className="group rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
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

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <Clock className="h-3.5 w-3.5 text-indigo-500" />
                          {e.start_time} - {e.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {e.room_number || 'Room TBD'}
                        </span>
                      </div>

                      {/* Quick swap button and attendance action */}
                      <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleOpenSwapForLecture(e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                          title="Busy? Swap this lecture with a colleague"
                        >
                          <ArrowLeftRight className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Swap</span>
                        </button>

                        {isToday ? (
                          <div className="flex items-center gap-2">
                            {e.attendance_taken_today ? (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Marked
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                Not Marked
                              </span>
                            )}

                            <button
                              onClick={() => navigate(`/faculty/attendance/${e.id}?date=${todayDate}`)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 shadow-sm transition"
                            >
                              <span>{e.attendance_taken_today ? 'View' : 'Take'}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Scheduled</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Faculty Timetable CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Import Personal Lecture Timetable (CSV)"
        description="Upload a CSV file containing your scheduled classes. Missing faculty field will automatically be assigned to you."
        sampleHeaders={['class_code', 'subject_code', 'day_of_week', 'start_time', 'end_time', 'room_number']}
        sampleRows={[
          ['CS-3', 'CS301', 'Monday', '09:00', '10:00', 'Room 301'],
          ['CS-3', 'CS302', 'Wednesday', '11:15', '12:15', 'Lab 2'],
        ]}
        sampleFilename="faculty_timetable_template.csv"
        onUpload={(formData) => facultyApi.importTimetableCsv(formData)}
        onSuccess={() => loadTimetable()}
      />

      {/* Lecture Swap Modal */}
      <FacultySwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        preselectedLecture={selectedLectureForSwap}
        onSwapUpdated={() => loadTimetable()}
      />
    </div>
  );
};
