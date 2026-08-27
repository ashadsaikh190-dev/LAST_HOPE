import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  AlertTriangle,
  ClipboardCheck,
  Search,
  ScrollText,
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronRight,
  ChevronDown,
  UserPlus,
  Eye,
  RefreshCcw,
  Bell,
  ArrowRightLeft,
  Star,
  Zap,
  Target,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Sparkles,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Hash,
  UserCheck,
  UserX,
  Flame,
  Shield,
  CircleDot,
  Megaphone,
  FileCheck2,
  DollarSign,
  PlayCircle,
  RotateCcw,
  Cpu,
  Inbox,
} from 'lucide-react';

// ─── Utility Helpers ────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (n) => `${n ?? 0}%`;
const timeAgo = (date) => {
  if (!date) return 'N/A';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};
const stageColor = (stage) => {
  const map = {
    REGISTERED: 'bg-slate-100 text-slate-700',
    LEAD: 'bg-blue-50 text-blue-700',
    APPLICATION_STARTED: 'bg-sky-50 text-sky-700',
    APPLICATION_COMPLETED: 'bg-cyan-50 text-cyan-700',
    DOCUMENTS_PENDING: 'bg-amber-50 text-amber-700',
    DOCUMENT_VERIFICATION: 'bg-orange-50 text-orange-700',
    ELIGIBILITY_CHECK: 'bg-yellow-50 text-yellow-700',
    PAYMENT_PENDING: 'bg-rose-50 text-rose-700',
    ADMISSION_REVIEW: 'bg-purple-50 text-purple-700',
    ADMISSION_APPROVED: 'bg-indigo-50 text-indigo-700',
    ENROLLMENT_GENERATED: 'bg-teal-50 text-teal-700',
    ENROLLED: 'bg-emerald-50 text-emerald-700',
  };
  return map[stage] || 'bg-slate-100 text-slate-600';
};
const riskBadge = (level) => {
  if (level === 'HIGH') return 'bg-red-100 text-red-700 border-red-200';
  if (level === 'MEDIUM') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

// ─── Tab Constants ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Command Center', icon: LayoutDashboard },
  { key: 'students', label: 'Student Lifecycle', icon: GraduationCap },
  { key: 'counselors', label: 'Counselor Performance', icon: Users },
  { key: 'at-risk', label: 'At-Risk Matrix', icon: AlertTriangle },
  { key: 'approvals', label: 'Approval Center', icon: ClipboardCheck },
  { key: 'search', label: 'Global Search', icon: Search },
  { key: 'audit', label: 'Audit Trail', icon: ScrollText },
  { key: 'health', label: 'System Health', icon: Activity },
];

// MAIN COMPONENT
export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview data
  const [overview, setOverview] = useState(null);

  // Students data
  const [students, setStudents] = useState([]);
  const [studentsMeta, setStudentsMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [studentFilter, setStudentFilter] = useState({ stage: '', risk: '', q: '' });

  // Counselors data
  const [counselors, setCounselors] = useState([]);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [counselorDetail, setCounselorDetail] = useState(null);

  // At-Risk data
  const [atRiskStudents, setAtRiskStudents] = useState([]);

  // Approvals data
  const [approvals, setApprovals] = useState(null);
  const [approvalTab, setApprovalTab] = useState('scholarships');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditMeta, setAuditMeta] = useState({ total: 0, page: 1, pages: 1 });

  // Cost Protection / Health
  const [costData, setCostData] = useState(null);

  // Staff creation
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '' });

  // Reassign modal
  const [reassignModal, setReassignModal] = useState(null);
  const [reassignCounselorId, setReassignCounselorId] = useState('');

  // Decision modal
  const [decisionModal, setDecisionModal] = useState(null);
  const [decisionForm, setDecisionForm] = useState({ decision: '', reason: '', scholarshipPct: 0 });

  // Action feedback
  const [actionMsg, setActionMsg] = useState(null);

  const navigate = useNavigate();

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/admin/overview');
      if (res.data.success) setOverview(res.data.data);
    } catch (e) {
      console.error('Overview fetch error:', e);
    }
  }, []);

  const fetchStudents = useCallback(async (page = 1) => {
    try {
      const params = { page, limit: 25 };
      if (studentFilter.stage) params.stage = studentFilter.stage;
      if (studentFilter.risk) params.risk = studentFilter.risk;
      if (studentFilter.q) params.q = studentFilter.q;
      const res = await api.get('/admin/students', { params });
      if (res.data.success) {
        setStudents(res.data.data.students);
        setStudentsMeta({ total: res.data.data.total, page: res.data.data.page, pages: res.data.data.pages });
      }
    } catch (e) {
      console.error('Students fetch error:', e);
    }
  }, [studentFilter]);

  const fetchCounselors = useCallback(async () => {
    try {
      const res = await api.get('/admin/counselors');
      if (res.data.success) setCounselors(res.data.data);
    } catch (e) {
      console.error('Counselors fetch error:', e);
    }
  }, []);

  const fetchCounselorDetail = useCallback(async (id) => {
    try {
      const res = await api.get(`/admin/counselors/${id}`);
      if (res.data.success) setCounselorDetail(res.data.data);
    } catch (e) {
      console.error('Counselor detail fetch error:', e);
    }
  }, []);

  const fetchAtRisk = useCallback(async () => {
    try {
      const res = await api.get('/admin/at-risk-students');
      if (res.data.success) setAtRiskStudents(res.data.data);
    } catch (e) {
      console.error('At-risk fetch error:', e);
    }
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await api.get('/admin/approvals');
      if (res.data.success) setApprovals(res.data.data);
    } catch (e) {
      console.error('Approvals fetch error:', e);
    }
  }, []);

  const fetchSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await api.get('/admin/search', { params: { q } });
      if (res.data.success) setSearchResults(res.data.data);
    } catch (e) {
      console.error('Search error:', e);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (page = 1) => {
    try {
      const res = await api.get('/admin/audit-logs', { params: { page, limit: 30 } });
      if (res.data.success) {
        setAuditLogs(res.data.data.logs);
        setAuditMeta({ total: res.data.data.total, page: res.data.data.page, pages: res.data.data.pages });
      }
    } catch (e) {
      console.error('Audit logs fetch error:', e);
    }
  }, []);

  const fetchCostProtection = useCallback(async () => {
    try {
      const res = await api.get('/admin/cost-protection');
      if (res.data.success) setCostData(res.data.data);
    } catch (e) {
      console.error('Cost protection fetch error:', e);
    }
  }, []);

  // Initial + Tab-based loading
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await fetchOverview();
      setLoading(false);
    };
    loadAll();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'counselors') fetchCounselors();
    if (activeTab === 'at-risk') fetchAtRisk();
    if (activeTab === 'approvals') fetchApprovals();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'health') fetchCostProtection();
  }, [activeTab, fetchStudents, fetchCounselors, fetchAtRisk, fetchApprovals, fetchAuditLogs, fetchCostProtection]);

  const { lastSyncEvent } = useSocket() || {};

  // Auto-refresh when any role triggers an event
  useEffect(() => {
    if (lastSyncEvent) {
      fetchOverview();
      if (activeTab === 'students') fetchStudents();
      if (activeTab === 'counselors') fetchCounselors();
      if (activeTab === 'at-risk') fetchAtRisk();
      if (activeTab === 'approvals') fetchApprovals();
      if (activeTab === 'audit') fetchAuditLogs();
    }
  }, [lastSyncEvent, activeTab, fetchOverview, fetchStudents, fetchCounselors, fetchAtRisk, fetchApprovals, fetchAuditLogs]);

  // Auto-refresh overview every 30s as heartbeat
  useEffect(() => {
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', { ...staffForm, role: 'COUNSELOR' });
      if (res.data.success) {
        setActionMsg({ type: 'success', text: `Counselor ${staffForm.name} created successfully.` });
        setStaffForm({ name: '', email: '', password: '', phone: '' });
        setShowCreateStaff(false);
        fetchCounselors();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create staff user.' });
    }
  };

  const handleReassign = async () => {
    if (!reassignModal || !reassignCounselorId) return;
    try {
      const res = await api.post(`/admin/students/${reassignModal.trackingId}/reassign`, {
        counselorId: reassignCounselorId,
        reason: 'Reassigned by administrator from Command Center',
      });
      if (res.data.success) {
        setActionMsg({ type: 'success', text: res.data.message });
        setReassignModal(null);
        setReassignCounselorId('');
        fetchStudents(studentsMeta.page);
        fetchCounselors();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Reassignment failed.' });
    }
  };

  const handleRemindCounselor = async (trackingId) => {
    try {
      const res = await api.post(`/admin/students/${trackingId}/remind-counselor`, {
        notes: 'Admin flagged this student as at-risk. Immediate counselor follow-up required.',
      });
      if (res.data.success) {
        setActionMsg({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send reminder.' });
    }
  };

  const handleApprovalDecision = async () => {
    if (!decisionModal || !decisionForm.decision) return;
    try {
      const res = await api.post(
        `/admin/approvals/${decisionModal.type}/${decisionModal.id}/decision`,
        decisionForm
      );
      if (res.data.success) {
        setActionMsg({ type: 'success', text: res.data.message });
        setDecisionModal(null);
        setDecisionForm({ decision: '', reason: '', scholarshipPct: 0 });
        fetchApprovals();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Decision failed.' });
    }
  };

  const handleCostSimulate = async (amount) => {
    try {
      const res = await api.post('/admin/cost-protection/simulate', { amount, enableTestMode: true });
      if (res.data.success) {
        setActionMsg({ type: 'success', text: `Simulated cost: $${amount}. Level: ${res.data.data.currentLevel}` });
        fetchCostProtection();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Simulation failed.' });
    }
  };

  const handleCostResume = async () => {
    if (!window.confirm('Resume all AWS services?')) return;
    try {
      const res = await api.post('/admin/cost-protection/resume', { notes: 'Admin approved resumption.' });
      if (res.data.success) {
        setActionMsg({ type: 'success', text: 'AWS services resumed.' });
        fetchCostProtection();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Resume failed.' });
    }
  };

  const handleToggleCounselorStatus = async (id, currentActive) => {
    try {
      const res = await api.put(`/admin/counselors/${id}`, { isActive: !currentActive });
      if (res.data.success) {
        setActionMsg({ type: 'success', text: `Counselor ${currentActive ? 'deactivated' : 'activated'}.` });
        fetchCounselors();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update counselor.' });
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderOverview = () => {
    if (!overview) return null;
    const { kpis, funnel, recentActivities } = overview;

    const kpiCards = [
      { label: 'Total Students', value: fmt(kpis.totalStudents), icon: GraduationCap, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
      { label: 'Active Applications', value: fmt(kpis.activeApplications), icon: FileText, color: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/20' },
      { label: 'Total Admissions', value: fmt(kpis.totalAdmissions), icon: Award, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
      { label: 'Pending Approvals', value: fmt(kpis.pendingApprovals), icon: ClipboardCheck, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
      { label: 'At-Risk Students', value: fmt(kpis.atRiskStudents), icon: AlertTriangle, color: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/20' },
      { label: 'Active Counselors', value: fmt(kpis.activeCounselors), icon: Users, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-4 text-white shadow-lg ${card.shadow} transition-transform hover:scale-[1.02]`}>
                <div className="absolute -top-2 -right-2 opacity-10">
                  <Icon className="w-16 h-16" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{card.label}</p>
                <p className="text-2xl font-black mt-1">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Pending Approvals Quick Breakdown */}
        {kpis.pendingApprovals > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-4 text-xs">
            <Zap className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-amber-800">Awaiting Your Review: </span>
              <span className="text-amber-700">
                {kpis.pendingBreakdown.scholarships} Scholarships &middot; {kpis.pendingBreakdown.admissionForms} Admission Forms &middot; {kpis.pendingBreakdown.documents} Documents
              </span>
            </div>
            <button
              onClick={() => setActiveTab('approvals')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-colors shrink-0"
            >
              Review Now
            </button>
          </div>
        )}

        {/* Admission Funnel & Recent Activities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Funnel */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-600" />
                Admission Funnel
              </h3>
              <button onClick={fetchOverview} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              {funnel.map((step, i) => {
                const maxCount = funnel[0]?.count || 1;
                const widthPct = Math.max(8, (step.count / maxCount) * 100);
                const colors = [
                  'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500',
                  'bg-emerald-500', 'bg-indigo-500', 'bg-violet-500', 'bg-green-600',
                ];
                return (
                  <div key={step.stage}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="font-semibold text-slate-700 truncate max-w-[180px]">{step.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{fmt(step.count)}</span>
                        {step.dropOffPct > 0 && (
                          <span className="flex items-center gap-0.5 text-red-500 font-bold">
                            <ArrowDownRight className="w-3 h-3" />
                            {step.dropOffPct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-5 rounded-lg bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-lg ${colors[i % colors.length]} transition-all duration-700 ease-out`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
              {(recentActivities || []).map((log, i) => (
                <div key={log._id || i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">
                      {log.action?.replace(/_/g, ' ') || 'System Event'}
                    </span>
                    <span className="text-slate-400 shrink-0">{timeAgo(log.timestamp)}</span>
                  </div>
                  {log.trackingId && (
                    <p className="text-slate-500 font-mono mt-0.5">{log.trackingId}</p>
                  )}
                </div>
              ))}
              {(!recentActivities || recentActivities.length === 0) && (
                <p className="text-slate-400 text-[11px] text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: STUDENTS
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderStudents = () => {
    const stages = [
      '', 'REGISTERED', 'LEAD', 'APPLICATION_STARTED', 'APPLICATION_COMPLETED',
      'DOCUMENTS_PENDING', 'DOCUMENT_VERIFICATION', 'ELIGIBILITY_CHECK',
      'PAYMENT_PENDING', 'ADMISSION_REVIEW', 'ADMISSION_APPROVED',
      'ENROLLMENT_GENERATED', 'ENROLLED',
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Filters */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, email, tracking ID..."
              value={studentFilter.q}
              onChange={(e) => setStudentFilter({ ...studentFilter, q: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && fetchStudents(1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lifecycle Stage</label>
            <select
              value={studentFilter.stage}
              onChange={(e) => setStudentFilter({ ...studentFilter, stage: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="">All Stages</option>
              {stages.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Risk Level</label>
            <select
              value={studentFilter.risk}
              onChange={(e) => setStudentFilter({ ...studentFilter, risk: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="">All</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
          <button
            onClick={() => fetchStudents(1)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
          >
            <Filter className="w-3.5 h-3.5 inline mr-1" />
            Apply
          </button>
          <button
            onClick={() => { setStudentFilter({ stage: '', risk: '', q: '' }); fetchStudents(1); }}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Tracking ID</th>
                  <th className="p-3">Program</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Counselor</th>
                  <th className="p-3">Last Activity</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{s.firstName} {s.lastName}</p>
                      <p className="text-slate-400 font-mono text-[10px]">{s.email}</p>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700">{s.trackingId}</td>
                    <td className="p-3 text-slate-600 max-w-[120px] truncate">{s.selectedProgram?.name || '\u2014'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${stageColor(s.currentStage)}`}>
                        {s.currentStage?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${riskBadge(s.riskLevel)}`}>
                        {s.riskLevel}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{s.assignedCounselor?.name || '\u2014'}</td>
                    <td className="p-3 text-slate-400">{timeAgo(s.lastActivityAt || s.updatedAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/counselor/students/${s.trackingId}`)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors"
                          title="View 360 Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setReassignModal(s)}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600 transition-colors"
                          title="Reassign Counselor"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">No students found matching filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {studentsMeta.pages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Page {studentsMeta.page} of {studentsMeta.pages} &middot; {fmt(studentsMeta.total)} students</span>
              <div className="flex gap-1">
                <button
                  disabled={studentsMeta.page <= 1}
                  onClick={() => fetchStudents(studentsMeta.page - 1)}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={studentsMeta.page >= studentsMeta.pages}
                  onClick={() => fetchStudents(studentsMeta.page + 1)}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: COUNSELORS
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderCounselors = () => {
    const scoreColor = (s) => {
      if (s >= 75) return 'text-emerald-600';
      if (s >= 50) return 'text-amber-600';
      return 'text-red-600';
    };

    const scoreBar = (s) => {
      if (s >= 75) return 'bg-emerald-500';
      if (s >= 50) return 'bg-amber-500';
      return 'bg-red-500';
    };

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header with staff creation */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-600" />
            Multi-Factor Weighted Performance Rankings
          </h3>
          <button
            onClick={() => setShowCreateStaff(!showCreateStaff)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showCreateStaff ? 'Cancel' : 'Add Counselor'}
          </button>
        </div>

        {/* Create Staff Form */}
        {showCreateStaff && (
          <form onSubmit={handleCreateStaff} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md space-y-3 text-xs animate-fade-in">
            <h4 className="text-xs font-bold text-slate-800">Provision New Admissions Counselor</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Full Name</label>
                <input type="text" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Email</label>
                <input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Phone</label>
                <input type="text" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Temp Password</label>
                <input type="password" required minLength={6} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold">Create Counselor Account</button>
            </div>
          </form>
        )}

        {/* Leaderboard */}
        <div className="space-y-3">
          {counselors.map((c) => (
            <div key={c._id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${c.rank === 1 ? 'bg-amber-100 text-amber-700' : c.rank === 2 ? 'bg-slate-100 text-slate-600' : c.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                  {c.rank <= 3 ? ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][c.rank - 1] : `#${c.rank}`}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{c.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{c.email}</p>
                </div>

                {/* Score */}
                <div className="text-center shrink-0">
                  <p className={`text-2xl font-black ${scoreColor(c.performanceScore)}`}>{c.performanceScore}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Score</p>
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-xl bg-blue-50">
                  <p className="font-black text-blue-800">{c.assignedCount}</p>
                  <p className="text-blue-500">Assigned</p>
                </div>
                <div className="p-2 rounded-xl bg-cyan-50">
                  <p className="font-black text-cyan-800">{c.applicationsCount}</p>
                  <p className="text-cyan-500">Applications</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50">
                  <p className="font-black text-emerald-800">{c.admissionsCount}</p>
                  <p className="text-emerald-500">Admissions</p>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50">
                  <p className="font-black text-indigo-800">{pct(c.conversionRate)}</p>
                  <p className="text-indigo-500">Conversion</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50">
                  <p className="font-black text-amber-800">{pct(c.followupRate)}</p>
                  <p className="text-amber-500">Follow-up</p>
                </div>
                <div className="p-2 rounded-xl bg-red-50">
                  <p className="font-black text-red-800">{c.atRiskCount}</p>
                  <p className="text-red-500">At-Risk</p>
                </div>
              </div>

              {/* Score Progress Bar */}
              <div className="mt-2.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${scoreBar(c.performanceScore)} transition-all duration-700`} style={{ width: `${c.performanceScore}%` }} />
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={async () => { setSelectedCounselor(c._id); await fetchCounselorDetail(c._id); }}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold transition-colors"
                >
                  <Eye className="w-3 h-3 inline mr-1" /> View Details
                </button>
                <button
                  onClick={() => handleToggleCounselorStatus(c._id, c.isActive)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${c.isActive ? 'bg-red-50 hover:bg-red-100 text-red-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}
                >
                  {c.isActive ? <><UserX className="w-3 h-3 inline mr-1" /> Deactivate</> : <><UserCheck className="w-3 h-3 inline mr-1" /> Activate</>}
                </button>
              </div>

              {/* Detail Drawer */}
              {selectedCounselor === c._id && counselorDetail && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">Assigned Students ({counselorDetail.students?.length || 0})</h5>
                    <button onClick={() => { setSelectedCounselor(null); setCounselorDetail(null); }} className="p-1 rounded-lg hover:bg-slate-200">
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1.5">
                    {(counselorDetail.students || []).map((s) => (
                      <div key={s._id} className="p-2.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-[10px]">
                        <div>
                          <span className="font-bold text-slate-800">{s.firstName} {s.lastName}</span>
                          <span className="ml-2 font-mono text-slate-400">{s.trackingId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${riskBadge(s.riskLevel)}`}>{s.riskLevel}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${stageColor(s.currentStage)}`}>{s.currentStage?.replace(/_/g, ' ')}</span>
                          <button onClick={() => navigate(`/counselor/students/${s.trackingId}`)} className="text-brand-600 hover:text-brand-700">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {counselors.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">No counselors found</div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: AT-RISK
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderAtRisk = () => {
    const riskIcon = (type) => {
      if (type === 'STUDENT_INACTIVE') return <Clock className="w-4 h-4 text-amber-500" />;
      if (type === 'FOLLOWUP_OVERDUE') return <Flame className="w-4 h-4 text-red-500" />;
      if (type === 'DOCUMENTS_PENDING') return <FileText className="w-4 h-4 text-orange-500" />;
      if (type === 'PAYMENT_PENDING') return <DollarSign className="w-4 h-4 text-rose-500" />;
      return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    };

    const riskTypeBg = (type) => {
      if (type === 'FOLLOWUP_OVERDUE') return 'border-l-red-500 bg-red-50/50';
      if (type === 'STUDENT_INACTIVE') return 'border-l-amber-500 bg-amber-50/50';
      if (type === 'DOCUMENTS_PENDING') return 'border-l-orange-500 bg-orange-50/50';
      if (type === 'PAYMENT_PENDING') return 'border-l-rose-500 bg-rose-50/50';
      return 'border-l-slate-300';
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            At-Risk Student Detection Matrix
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">{atRiskStudents.length} flagged</span>
          </h3>
          <button onClick={fetchAtRisk} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-2">
          {atRiskStudents.map((s) => (
            <div key={s._id} className={`p-4 rounded-2xl bg-white border border-slate-200 border-l-4 ${riskTypeBg(s.riskType)} shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-start gap-3">
                {riskIcon(s.riskType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">{s.firstName} {s.lastName}</h4>
                    <span className="font-mono text-[10px] text-slate-400">{s.trackingId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${stageColor(s.currentStage)}`}>{s.currentStage?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5">{s.riskDetails}</p>
                  <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-400">
                    <span>Last Active: <strong className="text-slate-600">{timeAgo(s.lastStudentActivity)}</strong></span>
                    <span>Counselor: <strong className="text-slate-600">{s.assignedCounselor?.name || 'Unassigned'}</strong></span>
                    <span>Last Interaction: <strong className="text-slate-600">{timeAgo(s.lastCounselorInteraction)}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/counselor/students/${s.trackingId}`)}
                    className="px-2.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold transition-colors"
                    title="View 360 Record"
                  >
                    <Eye className="w-3 h-3 inline mr-0.5" /> 360
                  </button>
                  {s.assignedCounselor && (
                    <button
                      onClick={() => handleRemindCounselor(s.trackingId)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold transition-colors"
                      title="Send Counselor Reminder"
                    >
                      <Bell className="w-3 h-3 inline mr-0.5" /> Remind
                    </button>
                  )}
                  <button
                    onClick={() => setReassignModal(s)}
                    className="px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-bold transition-colors"
                    title="Reassign to another counselor"
                  >
                    <ArrowRightLeft className="w-3 h-3 inline mr-0.5" /> Reassign
                  </button>
                </div>
              </div>
            </div>
          ))}
          {atRiskStudents.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">All Students Are On Track</p>
              <p className="text-xs text-slate-400 mt-1">No at-risk candidates detected at this time.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: APPROVALS
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderApprovals = () => {
    if (!approvals) {
      return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 text-brand-600 animate-spin" /></div>;
    }

    const subTabs = [
      { key: 'scholarships', label: 'Scholarships', count: approvals.scholarships?.length || 0 },
      { key: 'admissionForms', label: 'Admission Forms', count: approvals.admissionForms?.length || 0 },
      { key: 'documents', label: 'Documents', count: approvals.documents?.length || 0 },
    ];

    const currentItems =
      approvalTab === 'scholarships' ? approvals.scholarships :
      approvalTab === 'admissionForms' ? approvals.admissionForms :
      approvals.documents;

    const approvalType =
      approvalTab === 'scholarships' ? 'scholarship' :
      approvalTab === 'admissionForms' ? 'admission-form' :
      'document';

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand-600" />
            Centralized Approval Desk
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{approvals.totalPending} pending</span>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1">
          {subTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setApprovalTab(t.key)}
              className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                approvalTab === t.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                  approvalTab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-2">
          {(currentItems || []).map((item) => (
            <div key={item._id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {approvalTab === 'scholarships'
                      ? `${item.student?.firstName || ''} ${item.student?.lastName || ''} \u2014 Scholarship Review`
                      : approvalTab === 'admissionForms'
                      ? `${item.personalDetails?.fullName || item.student?.firstName || 'N/A'} \u2014 Application Form`
                      : `Document: ${item.documentType || item.type || 'N/A'}`
                    }
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                    {item.trackingId && <span className="font-mono">{item.trackingId}</span>}
                    {item.program?.name && <span>{item.program.name}</span>}
                    {item.status && <span className={`px-1.5 py-0.5 rounded-full font-bold ${stageColor(item.status)}`}>{item.status?.replace(/_/g, ' ')}</span>}
                    <span>{timeAgo(item.createdAt || item.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setDecisionModal({ type: approvalType, id: item._id, item }); setDecisionForm({ decision: 'APPROVE', reason: '', scholarshipPct: item.scholarshipPercentage || 0 }); }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3 inline mr-0.5" /> Approve
                  </button>
                  <button
                    onClick={() => { setDecisionModal({ type: approvalType, id: item._id, item }); setDecisionForm({ decision: 'REJECT', reason: '', scholarshipPct: 0 }); }}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold transition-colors"
                  >
                    <XCircle className="w-3 h-3 inline mr-0.5" /> Reject
                  </button>
                  <button
                    onClick={() => { setDecisionModal({ type: approvalType, id: item._id, item }); setDecisionForm({ decision: 'REQUEST_CORRECTION', reason: '', scholarshipPct: 0 }); }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold transition-colors"
                  >
                    Correction
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(currentItems || []).length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">All Clear</p>
              <p className="text-xs text-slate-400 mt-1">No pending items in this category.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: SEARCH
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderSearch = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-brand-600" />
          <input
            type="text"
            placeholder="Search students, counselors, tracking IDs, applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSearch(searchQuery)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            autoFocus
          />
          <button
            onClick={() => fetchSearch(searchQuery)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {searchResults && (
        <div className="space-y-4">
          {searchResults.students?.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Students ({searchResults.students.length})
              </h4>
              <div className="space-y-1.5">
                {searchResults.students.map((s) => (
                  <div key={s._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900">{s.firstName} {s.lastName}</span>
                      <span className="ml-2 font-mono text-slate-400">{s.trackingId}</span>
                      <span className="ml-2 text-slate-400">{s.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${stageColor(s.currentStage)}`}>{s.currentStage?.replace(/_/g, ' ')}</span>
                      <button onClick={() => navigate(`/counselor/students/${s.trackingId}`)} className="text-brand-600 hover:text-brand-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.counselors?.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                Counselors ({searchResults.counselors.length})
              </h4>
              <div className="space-y-1.5">
                {searchResults.counselors.map((c) => (
                  <div key={c._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span className="ml-2 text-slate-400">{c.email}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.applications?.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Applications ({searchResults.applications.length})
              </h4>
              <div className="space-y-1.5">
                {searchResults.applications.map((a) => (
                  <div key={a._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900">{a.applicationId}</span>
                      <span className="ml-2 text-slate-400">{a.personalDetails?.fullName || 'N/A'}</span>
                      <span className="ml-2 font-mono text-slate-400">{a.trackingId}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${stageColor(a.status)}`}>{a.status?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.students?.length === 0 && searchResults.counselors?.length === 0 && searchResults.applications?.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-400">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: AUDIT
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderAudit = () => (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <ScrollText className="w-4 h-4 text-brand-600" />
        Institutional Audit Event Stream
        <span className="text-[10px] text-slate-400 font-normal">({fmt(auditMeta.total)} events)</span>
      </h3>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Action</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Tracking ID</th>
                <th className="p-3">Result</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-bold text-slate-800">{log.action?.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-slate-600">{log.actorType || '\u2014'}</td>
                  <td className="p-3 font-mono text-slate-500">{log.trackingId || '\u2014'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${log.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : log.result === 'FAILURE' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {log.result || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {auditMeta.pages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Page {auditMeta.page} of {auditMeta.pages}</span>
            <div className="flex gap-1">
              <button disabled={auditMeta.page <= 1} onClick={() => fetchAuditLogs(auditMeta.page - 1)} className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 font-bold text-slate-700">Prev</button>
              <button disabled={auditMeta.page >= auditMeta.pages} onClick={() => fetchAuditLogs(auditMeta.page + 1)} className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 font-bold text-slate-700">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // TAB: HEALTH
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderHealth = () => {
    const levelColor = (level) => {
      if (level === 'NORMAL') return 'bg-emerald-100 text-emerald-700';
      if (level === 'WARNING') return 'bg-amber-100 text-amber-700';
      if (level === 'CRITICAL') return 'bg-red-100 text-red-700';
      if (level === 'EMERGENCY') return 'bg-red-200 text-red-800';
      return 'bg-slate-100 text-slate-600';
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-600" />
          AWS Cost Protection &amp; System Health
        </h3>

        {costData?.state && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${levelColor(costData.state.currentLevel)}`}>
                  {costData.state.currentLevel}
                </span>
                <span className="text-xs text-slate-600">
                  Estimated Spend: <strong className="text-slate-900">${costData.state.currentCost?.toFixed(2) || '0.00'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchCostProtection} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button onClick={handleCostResume} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
                  <PlayCircle className="w-3 h-3 inline mr-0.5" /> Resume Services
                </button>
              </div>
            </div>

            {costData.state.thresholds && (
              <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="font-bold text-amber-800">${costData.state.thresholds.WARNING}</p>
                  <p className="text-amber-500">Warning</p>
                </div>
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                  <p className="font-bold text-red-800">${costData.state.thresholds.CRITICAL}</p>
                  <p className="text-red-500">Critical</p>
                </div>
                <div className="p-2.5 rounded-xl bg-red-100 border border-red-200">
                  <p className="font-bold text-red-900">${costData.state.thresholds.EMERGENCY}</p>
                  <p className="text-red-600">Emergency</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">Test Simulate:</span>
              {[10, 30, 50, 70, 90].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleCostSimulate(amt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        )}

        {costData?.recentCostLogs?.length > 0 && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 mb-2">Recent AWS Cost Events</h4>
            <div className="space-y-1.5">
              {costData.recentCostLogs.map((log) => (
                <div key={log._id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-700">{log.action?.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400">{timeAgo(log.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!costData && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Cost protection data unavailable</p>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderReassignModal = () => {
    if (!reassignModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setReassignModal(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-slate-900">Reassign Student to Counselor</h3>
          <p className="text-xs text-slate-500">
            Student: <strong>{reassignModal.firstName} {reassignModal.lastName}</strong> ({reassignModal.trackingId})
          </p>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Select New Counselor</label>
            <select
              value={reassignCounselorId}
              onChange={(e) => setReassignCounselorId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="">Select Counselor</option>
              {counselors.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setReassignModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">Cancel</button>
            <button onClick={handleReassign} disabled={!reassignCounselorId} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-40">Reassign</button>
          </div>
        </div>
      </div>
    );
  };

  const renderDecisionModal = () => {
    if (!decisionModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDecisionModal(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-slate-900">
            {decisionForm.decision === 'APPROVE' ? 'Approve' : decisionForm.decision === 'REJECT' ? 'Reject' : 'Request Correction'}
          </h3>

          {decisionForm.decision === 'APPROVE' && decisionModal.type === 'scholarship' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Scholarship Percentage</label>
              <input
                type="number"
                min={0}
                max={100}
                value={decisionForm.scholarshipPct}
                onChange={(e) => setDecisionForm({ ...decisionForm, scholarshipPct: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">
              {decisionForm.decision === 'APPROVE' ? 'Notes (Optional)' : 'Reason (Required)'}
            </label>
            <textarea
              rows={3}
              value={decisionForm.reason}
              onChange={(e) => setDecisionForm({ ...decisionForm, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
              placeholder={decisionForm.decision === 'APPROVE' ? 'Optional approval notes...' : 'Provide detailed reason...'}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setDecisionModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">Cancel</button>
            <button
              onClick={handleApprovalDecision}
              disabled={
                (decisionForm.decision === 'REJECT' || decisionForm.decision === 'REQUEST_CORRECTION') && !decisionForm.reason.trim()
              }
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-40 ${
                decisionForm.decision === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                decisionForm.decision === 'REJECT' ? 'bg-red-600 hover:bg-red-700' :
                'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              Confirm {decisionForm.decision?.replace(/_/g, ' ')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-amber-400" />
              Admissions Operations Command Center
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              GIET University &mdash; Real-Time Institutional Intelligence &amp; Decision Desk
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              <CircleDot className="w-3 h-3" /> Live
            </span>
          </div>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionMsg && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
          actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="p-0.5 rounded hover:bg-black/5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-slate-500 hover:text-brand-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'counselors' && renderCounselors()}
        {activeTab === 'at-risk' && renderAtRisk()}
        {activeTab === 'approvals' && renderApprovals()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'audit' && renderAudit()}
        {activeTab === 'health' && renderHealth()}
      </div>

      {/* Modals */}
      {renderReassignModal()}
      {renderDecisionModal()}
    </div>
  );
};
