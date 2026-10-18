import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/studentApi';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { 
  Calculator, 
  Target, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const ShortageCalculatorPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetThreshold, setTargetThreshold] = useState(75.0);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await studentApi.getSummary();
      if (res.success && res.data) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Initializing attendance calculator..." />;

  const subjects = summary?.subjects || [];

  // Determine current active metrics
  let currentPresent = summary?.total_present || 0;
  let currentTotal = summary?.total_conducted || 0;
  let activeName = 'Overall Attendance (All Subjects)';

  if (selectedSubjectId) {
    const sub = subjects.find((s) => String(s.subject_id) === String(selectedSubjectId));
    if (sub) {
      currentPresent = sub.present;
      currentTotal = sub.conducted;
      activeName = `${sub.subject_code} - ${sub.subject_name}`;
    }
  }

  // Calculate formula live: (P + x) / (T + x) >= R  ==> x = ceil((R*T - P) / (1 - R))
  const R = targetThreshold / 100.0;
  const currentPct = currentTotal > 0 ? (currentPresent / currentTotal) * 100 : 100.0;

  let classesNeeded = 0;
  let alreadySatisfied = false;
  let isAchievable = true;

  if (R >= 1.0) {
    if (currentPresent === currentTotal && currentTotal > 0) {
      classesNeeded = 0;
      alreadySatisfied = true;
    } else {
      isAchievable = false;
    }
  } else if (currentPct >= targetThreshold) {
    alreadySatisfied = true;
    classesNeeded = 0;
  } else {
    const numerator = R * currentTotal - currentPresent;
    const denominator = 1.0 - R;
    classesNeeded = Math.ceil(numerator / denominator);
    if (classesNeeded < 0) classesNeeded = 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Attendance Shortage Calculator
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Mathematically models the exact consecutive upcoming lectures required to achieve target attendance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Configuration Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Target Parameters</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Evaluation Scope
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Overall (All Subjects Combined)</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_code} - {s.subject_name} ({s.percentage}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Threshold Percentage
              </label>
              <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                {targetThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="1"
              value={targetThreshold}
              onChange={(e) => setTargetThreshold(Number(e.target.value))}
              className="mt-2 w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>60%</span>
              <span className="font-bold text-amber-500">75% (Min)</span>
              <span className="font-bold text-emerald-500">85% (Good)</span>
              <span>95%</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Current Status</span>
            <div className="flex justify-between text-slate-800 dark:text-slate-200">
              <span>Attended Lectures (P):</span>
              <span className="font-bold">{currentPresent}</span>
            </div>
            <div className="flex justify-between text-slate-800 dark:text-slate-200">
              <span>Total Finalized (T):</span>
              <span className="font-bold">{currentTotal}</span>
            </div>
            <div className="flex justify-between text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <span>Current Attendance:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Calculation Result Display Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Calculator className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Projection Results</h2>
            </div>

            <div className="mt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Course</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{activeName}</h3>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-gradient-to-tr from-slate-50 to-indigo-50/30 p-6 text-center dark:border-slate-800 dark:from-slate-800/40 dark:to-indigo-950/20">
              {alreadySatisfied ? (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Goal Satisfied!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Your current attendance of <strong>{currentPct.toFixed(1)}%</strong> already satisfies or exceeds your target of <strong>{targetThreshold}%</strong>. No extra classes needed to maintain eligibility.
                  </p>
                </div>
              ) : !isAchievable ? (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Mathematically Unachievable</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    A 100% attendance rate cannot be mathematically recovered once any lecture has been missed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Additional Consecutive Classes Required
                  </span>
                  <div className="text-6xl font-black text-indigo-600 dark:text-indigo-400">
                    +{classesNeeded}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    You must attend the next <strong>{classesNeeded} consecutive lectures</strong> without missing any to reach <strong>{targetThreshold}%</strong> attendance.
                  </p>
                </div>
              )}
            </div>

            {/* Formula Explanation */}
            <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-indigo-500" /> Mathematical Formulation:
              </p>
              <div className="mt-2 font-mono text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                (P + x) / (T + x) &ge; R &nbsp;&implies;&nbsp; x = &lceil;(R&bull;T - P) / (1 - R)&rceil;
              </div>
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                * Note: This projection is an estimate assuming all future upcoming lectures are attended consecutively, and no timetable exclusions or corrections occur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
