import React from 'react';

export const LoadingSpinner = ({ text = 'Loading data...' }) => (
  <div className="flex flex-col items-center justify-center p-12">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400" />
    {text && <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{text}</p>}
  </div>
);
