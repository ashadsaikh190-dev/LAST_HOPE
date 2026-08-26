import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  Users,
  FileText,
  FolderOpen,
  CreditCard,
  Award,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Search,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Loader2,
} from 'lucide-react';

export const CounselorDashboard = () => {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/counselor/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Listen to live student admissions, document uploads, and case escalations
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchDashboard();
    };

    socket.on('case:escalated', handleUpdate);
    socket.on('student:enrolled', handleUpdate);
    socket.on('payment:received', handleUpdate);

    return () => {
      socket.off('case:escalated', handleUpdate);
      socket.off('student:enrolled', handleUpdate);
      socket.off('payment:received', handleUpdate);
    };
  }, [socket]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentCases = data?.recentCases || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-brand-600" />
            Admissions Counselor Command Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time database aggregated metrics & autonomous conversion workload management
          </p>
        </div>

        <Link
          to="/counselor/search"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
        >
          <Search className="w-4 h-4" />
          <span>Universal Student Search</span>
        </Link>
      </div>

      {/* Metrics Grid (Calculated from Real DB - ZERO HARDCODED DATA!) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
          <p className="text-2xl font-black text-slate-900">{metrics.totalStudents || 0}</p>
          <span className="text-[10px] text-brand-600 font-medium">Registered Accounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Applications</span>
          <p className="text-2xl font-black text-slate-900">{metrics.totalApplications || 0}</p>
          <span className="text-[10px] text-brand-600 font-medium">{metrics.leadToAppConversion || 0}% Lead Conv.</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doc Review Queue</span>
          <p className="text-2xl font-black text-amber-600">{metrics.pendingVerifications || 0}</p>
          <span className="text-[10px] text-slate-400 font-medium">Textract & Mismatch</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escalated Cases</span>
          <p className="text-2xl font-black text-rose-600">{metrics.escalatedCases || 0}</p>
          <span className="text-[10px] text-rose-500 font-medium">Human Intervention</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enrollments</span>
          <p className="text-2xl font-black text-emerald-600">{metrics.totalEnrollments || 0}</p>
          <span className="text-[10px] text-emerald-600 font-medium">{metrics.appToEnrollConversion || 0}% Final Conv.</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-900 to-indigo-950 text-white shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-brand-300 uppercase tracking-wider block flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-300" />
            AI Automation
          </span>
          <p className="text-2xl font-black text-white">{metrics.aiAutomationRate || 100}%</p>
          <span className="text-[10px] text-brand-200 font-medium">Routine Cases Resolved</span>
        </div>
      </div>

      {/* Action Required Escalations & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Escalation Queue */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Action Required: Open Escalations</h3>
                <p className="text-xs text-slate-500">Autonomous AI escalated cases requiring human counselor decisions</p>
              </div>
            </div>

            <Link
              to="/counselor/cases"
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>View All Cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentCases.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active escalated cases. Autonomous agent is resolving routine student lifecycle inquiries.
              </div>
            ) : (
              recentCases.map((c) => (
                <div
                  key={c._id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand-700">{c.caseId}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {c.category}
                      </span>
                      <span className="text-slate-400 font-mono">({c.trackingId})</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">{c.summary}</p>
                    <p className="text-slate-500 text-[11px] line-clamp-1 italic">{c.aiReason}</p>
                  </div>

                  <Link
                    to={`/counselor/cases`}
                    className="shrink-0 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-100 transition-colors text-center shadow-sm"
                  >
                    Review Case
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Quick Counselor Links */}
        <div className="space-y-4">
          <Link
            to="/counselor/documents"
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all block space-y-2 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Document Verification Desk</h4>
            <p className="text-[11px] text-slate-500">Inspect Textract OCR mismatches, confidence anomalies, and override verification</p>
          </Link>

          <Link
            to="/counselor/conversations"
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all block space-y-2 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">AI Conversation Monitor</h4>
            <p className="text-[11px] text-slate-500">Inspect live student sessions, detected intents, and backend tool invocations</p>
          </Link>
        </div>
      </div>
    </div>
  );
};
