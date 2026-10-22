import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const CsvImportModal = ({
  isOpen,
  onClose,
  title = 'Import CSV File',
  description = 'Upload a structured CSV file to bulk import data.',
  sampleHeaders = [],
  sampleRows = [],
  sampleFilename = 'sample_template.csv',
  onUpload,
  onSuccess,
}) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setLoading(false);
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        setErrorMsg('Please select a valid .csv file.');
        return;
      }
      setFile(selected);
      setErrorMsg('');
      setResult(null);
    }
  };

  const downloadSampleCsv = () => {
    if (!sampleHeaders || sampleHeaders.length === 0) return;
    const headerLine = sampleHeaders.join(',');
    const dataLines = sampleRows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerLine, ...dataLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', sampleFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a CSV file to upload.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await onUpload(formData);
      if (res.success) {
        setResult(res.data);
        if (onSuccess) onSuccess(res.data);
      } else {
        setErrorMsg(res.message || 'CSV import failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while uploading.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>

        {/* Download template banner */}
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Sample CSV Template</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Headers: {sampleHeaders.slice(0, 4).join(', ')}
                {sampleHeaders.length > 4 ? '...' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Template</span>
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Result summary if finished */}
        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {result.imported_count || 0} Records Imported
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {result.skipped_count || 0} Skipped
              </span>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 max-h-36 overflow-y-auto">
                <p className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Notes / Skipped Rows ({result.errors.length}):
                </p>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-slate-700 dark:hover:border-indigo-400 transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="rounded-full bg-slate-100 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
              {file ? file.name : 'Click to select CSV file'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : 'Supports .csv format with UTF-8 encoding'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Upload className="h-4 w-4" />
              <span>{loading ? 'Uploading & Parsing...' : 'Import CSV'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
