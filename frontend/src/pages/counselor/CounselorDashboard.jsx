import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Eye,
  Clock,
  Flame,
  ArrowUpDown,
  Filter,
  CheckCircle2,
} from 'lucide-react';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Recently';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return past.toLocaleDateString();
};

const getPriorityStyle = (priority) => {
  if (priority === 'HIGH') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (priority === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

const getPriorityDot = (priority) => {
  if (priority === 'HIGH') return 'bg-rose-500';
  if (priority === 'MEDIUM') return 'bg-amber-500';
  return 'bg-emerald-500';
};

export const CounselorDashboard = () => {
  const { socket, lastSyncEvent } = useSocket();
  const [data, setData] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [sortBy, setSortBy] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/counselor/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch counselor dashboard:', err);
    }
  };

  const fetchAssignedStudents = async (sortOption = sortBy) => {
    try {
      setLoadingStudents(true);
      const res = await api.get(`/counselor/assigned-students?sortBy=${sortOption}`);
      if (res.data.success) {
        setAssignedStudents(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch assigned students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchAssignedStudents('priority')]);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    fetchAssignedStudents(newSort);
  };

  // Real-time synchronization when any student, case, or document event occurs
  useEffect(() => {
    if (lastSyncEvent) {
      fetchDashboard();
      fetchAssignedStudents(sortBy);
    }
  }, [lastSyncEvent]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchDashboard();
      fetchAssignedStudents(sortBy);
    };

    socket.on('case:escalated', handleUpdate);
    socket.on('student:enrolled', handleUpdate);
    socket.on('payment:received', handleUpdate);
    socket.on('document:new_uploaded', handleUpdate);
    socket.on('document:status', handleUpdate);

    return () => {
      socket.off('case:escalated', handleUpdate);
      socket.off('student:enrolled', handleUpdate);
      socket.off('payment:received', handleUpdate);
      socket.off('document:new_uploaded', handleUpdate);
      socket.off('document:status', handleUpdate);
    };
  }, [socket, sortBy]);

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
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-brand-600" />
            Admissions Counselor Intelligence Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time student intelligence, automatic priority ranking, and engagement scoring
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

      {/* Counselor Summary Intelligence Bar (Real DB Data) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-indigo-950 text-white shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Students</span>
            <p className="text-xl font-black text-white mt-0.5">{metrics.assignedStudentsCount || 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-400/20">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              High Priority
            </span>
            <p className="text-xl font-black text-rose-300 mt-0.5">{metrics.highPriorityCount || 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/20">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Medium Priority
            </span>
            <p className="text-xl font-black text-amber-300 mt-0.5">{metrics.mediumPriorityCount || 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/20">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Low Priority
            </span>
            <p className="text-xl font-black text-emerald-300 mt-0.5">{metrics.lowPriorityCount || 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Engagement</span>
            <p className="text-xl font-black text-brand-300 mt-0.5">{metrics.avgEngagement || 0}<span className="text-xs text-slate-400 font-normal"> / 100</span></p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Registration</span>
            <p className="text-xl font-black text-teal-300 mt-0.5">{metrics.avgRegistrationProgress || 0}%</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
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

      {/* SECTION: Assigned Students Intelligence Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              Assigned Students Priority Worklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked dynamically by attention urgency, missing requirements, and engagement score
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="priority">🔴 Priority (High → Low)</option>
              <option value="engagement">🔥 Engagement (High → Low)</option>
              <option value="registration">📝 Registration % (Low → High)</option>
              <option value="visits">👁 Website Visits (High → Low)</option>
              <option value="activity">⏰ Last Activity (Newest → Oldest)</option>
            </select>
          </div>
        </div>

        {loadingStudents ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : assignedStudents.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No assigned candidates found in this worklist.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assignedStudents.map((student) => {
              const priorityClass = getPriorityStyle(student.priority);
              const priorityDot = getPriorityDot(student.priority);

              return (
                <div
                  key={student._id}
                  onClick={() => navigate(`/counselor/students/${student.trackingId}`)}
                  className="p-5 rounded-3xl bg-white border-2 border-slate-200 hover:border-brand-500 shadow-sm hover:shadow-lg transition-all cursor-pointer space-y-4 group relative"
                >
                  {/* Top: Name & Application Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 font-bold group-hover:scale-105 transition-transform border border-brand-100">
                        {student.firstName?.[0]}
                        {student.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{student.email}</p>
                      </div>
                    </div>

                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {student.currentStage?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Tracking ID & Program */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Tracking ID:</span>
                      <span className="font-mono font-bold text-brand-700">{student.trackingId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Program:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                        {student.selectedProgram?.name || 'General Admission'}
                      </span>
                    </div>
                  </div>

                  {/* FEATURE 3: Registration Progress % */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-700">Registration Progress</span>
                      <span className="font-mono font-black text-brand-700">{student.registrationProgress || 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all"
                        style={{ width: `${student.registrationProgress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* FEATURE 1: Website Visits & Last Activity */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Eye className="w-3.5 h-3.5 text-brand-600" />
                      Website Visits: <strong>{student.visitCount || 1}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Last: <strong>{formatTimeAgo(student.lastActivityAt)}</strong>
                    </span>
                  </div>

                  {/* FEATURE 2: Automatic Priority & Reason */}
                  <div className={`p-2.5 rounded-2xl border ${priorityClass} space-y-0.5`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                      <span className={`w-2 h-2 rounded-full ${priorityDot}`} />
                      <span>{student.priority} PRIORITY</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                      Reason: {student.priorityReason}
                    </p>
                  </div>

                  {/* FEATURE 4: Student Engagement Score */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-700">Student Engagement</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <span>{student.engagementScore || 50}/100</span>
                        <span className="text-[10px] text-brand-600 font-semibold">{student.engagementCategory}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          student.engagementScore >= 80
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                            : student.engagementScore >= 50
                            ? 'bg-gradient-to-r from-teal-500 to-brand-500'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${student.engagementScore || 50}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Action: Inspect 360 */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs font-bold text-brand-600 gap-1">
                    <span>Inspect 360° Record</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
