import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({ title = 'No records found', description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <Inbox className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
    {description && (
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
