import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../contexts/SocketContext';
import { EscalationModal } from '../../components/counselor/EscalationModal';
import { AlertTriangle, CheckCircle2, Clock, Filter, Loader2, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EscalationsInbox = () => {
  const { socket } = useSocket();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filterStatus, setFilterStatus] = useState('OPEN');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/counselor/cases?status=${filterStatus}`);
      if (res.data.success) {
        setCases(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterStatus]);

  useEffect(() => {
    if (!socket) return;
    const handleEscalated = () => fetchCases();
    socket.on('case:escalated', handleEscalated);
    return () => socket.off('case:escalated', handleEscalated);
  }, [socket]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            Action Required: Escalation Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cases autonomously routed from AI Assistant for counselor exception approvals and complex resolutions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
          No {filterStatus.toLowerCase()} cases at this time. Routine queries are autonomously handled.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <div
              key={c._id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-700 text-xs">{c.caseId}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.priority === 'HIGH' || c.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {c.priority} PRIORITY
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.summary}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Student Tracking ID: <Link to={`/counselor/students/${c.trackingId}`} className="text-brand-600 font-bold underline">{c.trackingId}</Link>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                  <p className="text-slate-600">
                    <strong className="text-slate-900">AI Flagged Reason:</strong> {c.aiReason}
                  </p>
                  <p className="text-slate-600">
                    <strong className="text-slate-900">Recommended Counselor Action:</strong> {c.recommendedAction}
                  </p>
                  {c.resolutionNotes && (
                    <p className="text-emerald-700 pt-1 border-t border-slate-200 font-medium">
                      Resolution: "{c.resolutionNotes}" ({c.resolutionDecision})
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  to={`/counselor/students/${c.trackingId}`}
                  className="text-xs font-bold text-slate-600 hover:text-brand-600"
                >
                  View 360° Profile
                </Link>

                {c.status !== 'RESOLVED' && (
                  <button
                    onClick={() => setSelectedCase(c)}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm shadow-brand-500/20"
                  >
                    Take Decision / Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      <EscalationModal
        isOpen={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        counselorCase={selectedCase}
        onResolved={() => fetchCases()}
      />
    </div>
  );
};
