import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export const EscalationModal = ({ isOpen, onClose, counselorCase, onResolved }) => {
  const [decision, setDecision] = useState('RESOLVED');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !counselorCase) return null;

  const handleResolve = async () => {
    if (!notes.trim()) {
      setError('Please add resolution notes explaining your decision.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/counselor/cases/${counselorCase._id}/resolve`, {
        resolutionDecision: decision,
        resolutionNotes: notes.trim(),
      });

      if (response.data.success) {
        onResolved(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to resolve case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Counselor Case Resolution</h3>
              <p className="text-xs text-slate-500 font-mono">Case ID: {counselorCase.caseId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Case Info Brief */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Tracking ID:</span>
            <span className="font-mono font-bold text-brand-700">{counselorCase.trackingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Category:</span>
            <span className="font-bold text-slate-800">{counselorCase.category}</span>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 font-bold block mb-1">AI Reason & Summary:</span>
            <p className="text-slate-700 italic">{counselorCase.aiReason}</p>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 font-bold block mb-1">Recommended Action:</span>
            <p className="text-slate-700 font-medium">{counselorCase.recommendedAction}</p>
          </div>
        </div>

        {/* Decision Selector */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">Counselor Decision</label>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="RESOLVED">General Resolution (Query Answered)</option>
            <option value="APPROVED_FEE_WAIVER">Approve 100% Fee Waiver (Concession Granted)</option>
            <option value="APPROVED_EXCEPTION">Approve Policy Exception</option>
            <option value="REJECTED_REQUEST">Reject Exception Request</option>
            <option value="REQUEST_DOCUMENT_REUPLOAD">Request Student to Re-upload Document</option>
          </select>
        </div>

        {/* Resolution Notes */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Counselor Resolution Notes <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add explanation and official notes for audit trail..."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={loading || !notes.trim()}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Decision...</span>
              </>
            ) : (
              <span>Confirm Decision</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
