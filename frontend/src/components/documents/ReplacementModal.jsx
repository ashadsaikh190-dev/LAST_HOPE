import React, { useState } from 'react';
import { RefreshCw, X, File, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../../api/axios';

export const ReplacementModal = ({ isOpen, onClose, document, onReplacementSuccess }) => {
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !document) return null;

  const currentVersionNum = document.currentVersion?.versionNumber || 1;
  const nextVersionNum = currentVersionNum + 1;

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must not exceed 10MB');
      return;
    }
    setError('');
    setFile(selectedFile);
  };

  const handleReplace = async () => {
    if (!file) {
      setError('Please select a replacement file');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for replacing this document');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('replacementReason', reason);

    try {
      const response = await api.post(`/documents/${document._id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        onReplacementSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to replace document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Replace Document</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {document.documentType?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Versioning Flow Indicator */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="px-2 py-0.5 rounded bg-slate-200 font-mono text-[11px]">v{currentVersionNum}</span>
            <span>Current (will be SUPERSEDED)</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1.5 text-brand-700">
            <span className="px-2 py-0.5 rounded bg-brand-100 font-mono text-[11px] text-brand-700">v{nextVersionNum}</span>
            <span>New (CURRENT)</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Replacement Reason */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Reason for Replacement <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Uploaded incorrect marksheet semester / corrected name typo"
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* File Selector */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Select New Correct Document <span className="text-rose-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
          />
        </div>

        {file && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-brand-50 text-xs font-medium text-brand-900 border border-brand-200">
            <File className="w-4 h-4 text-brand-600" />
            <span className="truncate">{file.name}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            disabled={!file || !reason.trim() || uploading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating v{nextVersionNum} & restarting OCR...</span>
              </>
            ) : (
              <span>Submit Replacement (v{nextVersionNum})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
