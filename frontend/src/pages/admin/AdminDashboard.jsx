import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Activity,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  DollarSign,
  Cpu,
  Mail,
  Inbox,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [costLoading, setCostLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, costRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/cost-protection').catch(() => ({ data: { success: false } })),
      ]);

      if (analyticsRes.data.success) {
        setData(analyticsRes.data.data);
      }
      if (costRes.data?.success) {
        setCostData(costRes.data.data);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateCost = async (amount) => {
    try {
      setCostLoading(true);
      setActionMessage(null);
      const res = await api.post('/admin/cost-protection/simulate', { amount, enableTestMode: true });
      if (res.data.success) {
        setActionMessage({ type: 'success', text: `Simulated cost updated to $${amount}.00. New Status: ${res.data.data.currentLevel}` });
        await fetchDashboardData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Failed to simulate cost.' });
    } finally {
      setCostLoading(false);
    }
  };

  const handleResumeServices = async () => {
    if (!window.confirm('Are you sure you want to verify budget safety and RESUME all AWS services?')) {
      return;
    }
    try {
      setCostLoading(true);
      setActionMessage(null);
      const res = await api.post('/admin/cost-protection/resume', {
        notes: 'Admin approved restoration after budget audit.',
      });
      if (res.data.success) {
        setActionMessage({ type: 'success', text: 'All AWS services have been successfully resumed.' });
        await fetchDashboardData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Failed to resume services.' });
    } finally {
      setCostLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const {
    totalUsers = 0,
    totalStudents = 0,
    totalApplications = 0,
    totalPrograms = 0,
    stageDistribution = [],
    programDistribution = [],
  } = data || {};

  const state = costData?.state || {};
  const currentLevel = state.currentLevel || 'NORMAL';
  const estimatedCost = state.estimatedCost !== undefined ? Number(state.estimatedCost) : 0.0;
  const budgetLimit = state.thresholds?.budgetLimit || 96.87;
  const targetLimit = state.thresholds?.targetLimit || 50.0;
  const warningThreshold = state.thresholds?.warning || 30.0;
  const criticalThreshold = state.thresholds?.critical || 40.0;
  const emergencyThreshold = state.thresholds?.emergency || 50.0;
  const hardProtectionThreshold = state.thresholds?.hardProtection || 60.0;
  const services = state.services || {};
  const usageCounters = state.usageCounters || {};
  const applicationLimits = state.applicationLimits || {};
  const isBillingAvailable = state.isBillingDataAvailable;

  const getLevelBadgeStyles = (lvl) => {
    switch (lvl) {
      case 'NORMAL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse';
      case 'CRITICAL':
        return 'bg-orange-50 text-orange-700 border-orange-300 animate-pulse';
      case 'EMERGENCY':
        return 'bg-rose-100 text-rose-800 border-rose-400 font-bold animate-pulse';
      case 'HARD_PROTECTION':
        return 'bg-red-950 text-red-200 border-red-700 font-black tracking-widest animate-pulse';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-brand-600" />
            Institutional Administration & Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time database analytics, workflow management, and autonomous AWS Cost Protection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/health"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Inspect AWS & System Health</span>
          </Link>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] font-bold underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AWS COST PROTECTION & EMERGENCY SHUTDOWN CONTROL PANEL */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-50 text-brand-700">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-black text-slate-900">AWS Cost Protection & Emergency Safety</h2>
                <span className={`px-3 py-0.5 rounded-full text-xs font-black border uppercase tracking-wider ${getLevelBadgeStyles(currentLevel)}`}>
                  AWS STATUS: {currentLevel.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-Layer Budget Defense protecting USD ${budgetLimit.toFixed(2)} Absolute Credit (Target Cap: ${targetLimit.toFixed(2)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(currentLevel === 'HARD_PROTECTION' || currentLevel === 'EMERGENCY' || currentLevel === 'CRITICAL' || currentLevel === 'WARNING') && (
              <button
                onClick={handleResumeServices}
                disabled={costLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESUME AWS SERVICES</span>
              </button>
            )}
          </div>
        </div>

        {/* Prominent Hard Protection / Emergency / Critical Active Banners */}
        {currentLevel === 'HARD_PROTECTION' && (
          <div className="p-4 rounded-2xl bg-red-950 border border-red-700 text-red-100 flex items-start gap-3 shadow-md">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-300">HARD PROTECTION LOCK ACTIVE ($60+ CAP REACHED)</h4>
              <p className="text-xs mt-1 text-red-200">
                All billable and outbound AWS services (Textract OCR, outbound SES emails, SQS dispatch, optional background jobs) have been strictly locked.
                Zero data loss: All MongoDB records, S3 student documents, and audit logs remain completely intact and preserved. Administrator approval required to resume.
              </p>
            </div>
          </div>
        )}

        {currentLevel === 'EMERGENCY' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wide">EMERGENCY COST PROTECTION MODE ACTIVE ($50+)</h4>
              <p className="text-xs mt-1 text-rose-800">
                Non-essential AWS workloads (Textract, outbound SES emails, SQS dispatch) have been paused to safeguard remaining credits.
                Core student portal features remain available. Administrator review required before resumption.
              </p>
            </div>
          </div>
        )}

        {currentLevel === 'CRITICAL' && (
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-300 text-orange-900 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wide">AWS COST PROTECTION ACTIVE ($40+)</h4>
              <p className="text-xs mt-1 text-orange-800">
                Usage is in CRITICAL range ($40+). Automatic Textract OCR is paused with fallback to offline hybrid parsing; scheduled automation emails are suspended.
              </p>
            </div>
          </div>
        )}

        {/* Cost Progress & Thresholds Bar */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Estimated Project AWS Cost:</span>
              {isBillingAvailable ? (
                <span className="text-base font-black text-slate-900 font-mono">
                  ${estimatedCost.toFixed(2)}
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Billing information may be delayed.
                </span>
              )}
              {state.isSimulated && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                  SIMULATION ACTIVE
                </span>
              )}
            </div>

            <div className="text-slate-500 text-[11px] font-mono">
              Absolute Credit: <strong className="text-slate-900">${budgetLimit.toFixed(2)}</strong> (Safety Buffer: ${(budgetLimit - hardProtectionThreshold).toFixed(2)})
            </div>
          </div>

          {/* Visual Multi-Threshold Bar */}
          <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden flex relative">
            <div
              className={`h-full transition-all duration-500 ${
                currentLevel === 'HARD_PROTECTION'
                  ? 'bg-red-800'
                  : currentLevel === 'EMERGENCY'
                  ? 'bg-rose-600'
                  : currentLevel === 'CRITICAL'
                  ? 'bg-orange-500'
                  : currentLevel === 'WARNING'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, (estimatedCost / budgetLimit) * 100))}%` }}
            />
          </div>

          <div className="grid grid-cols-5 text-[10px] text-slate-500 pt-1 font-mono">
            <div>Normal: &lt;${warningThreshold.toFixed(0)}</div>
            <div className="text-center text-amber-700 font-semibold">Warning: ≥${warningThreshold.toFixed(0)}</div>
            <div className="text-center text-orange-700 font-semibold">Critical: ≥${criticalThreshold.toFixed(0)}</div>
            <div className="text-center text-rose-700 font-semibold">Emergency: ≥${emergencyThreshold.toFixed(0)}</div>
            <div className="text-right text-red-900 font-bold">Hard Cap: ≥${hardProtectionThreshold.toFixed(0)}</div>
          </div>
        </div>

        {/* Service Circuit Breaker Matrix & Application Counters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AWS Services Status */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              AWS Service Circuit Breakers
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" /> Textract OCR
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${services.textract?.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {services.textract?.enabled ? 'ENABLED' : 'BLOCKED'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> SES Email
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${services.ses?.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {services.ses?.enabled ? 'ENABLED' : 'BLOCKED'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5 text-amber-600" /> SQS Queues
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${services.sqs?.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {services.sqs?.enabled ? 'ENABLED' : 'BLOCKED'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" /> Scheduled Jobs
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${services.scheduledJobs?.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {services.scheduledJobs?.enabled ? 'ENABLED' : 'PAUSED'}
                </span>
              </div>
            </div>
          </div>

          {/* Defense Layer 2: Application Usage Limits */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Application Usage Limits (Layer 2 Defense)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50">
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Textract Docs:</span>
                  <strong className="text-slate-900 font-mono">{usageCounters.textractCalls || 0} / {applicationLimits.maxTextractDocuments || 50}</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full" style={{ width: `${Math.min(100, ((usageCounters.textractCalls || 0) / (applicationLimits.maxTextractDocuments || 50)) * 100)}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50">
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Emails Sent:</span>
                  <strong className="text-slate-900 font-mono">{usageCounters.emailsSent || 0} / {applicationLimits.maxEmails || 200}</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, ((usageCounters.emailsSent || 0) / (applicationLimits.maxEmails || 200)) * 100)}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50">
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>SQS Messages:</span>
                  <strong className="text-slate-900 font-mono">{usageCounters.sqsMessages || 0} / {applicationLimits.maxSqsMessages || 500}</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full" style={{ width: `${Math.min(100, ((usageCounters.sqsMessages || 0) / (applicationLimits.maxSqsMessages || 500)) * 100)}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50">
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Total AWS Ops:</span>
                  <strong className="text-slate-900 font-mono">{usageCounters.totalAwsOperations || 0} / {applicationLimits.maxAwsOperations || 1000}</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full" style={{ width: `${Math.min(100, ((usageCounters.totalAwsOperations || 0) / (applicationLimits.maxAwsOperations || 1000)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zero-Cost Testing / Simulation Controls */}
        <div className="p-4 rounded-2xl bg-brand-50/40 border border-brand-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black text-brand-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-brand-600" />
              Zero-Cost Simulation Suite (Testing & Evaluation)
            </span>
            <p className="text-[11px] text-brand-700 mt-0.5">
              Simulate budget usage levels to verify emergency shutdown without incurring real AWS charges
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleSimulateCost(20)}
              disabled={costLoading}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 shadow-sm"
            >
              $20 Normal
            </button>
            <button
              onClick={() => handleSimulateCost(30)}
              disabled={costLoading}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200 shadow-sm"
            >
              $30 Warning
            </button>
            <button
              onClick={() => handleSimulateCost(40)}
              disabled={costLoading}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-orange-50 text-orange-700 text-[11px] font-bold border border-orange-200 shadow-sm"
            >
              $40 Critical
            </button>
            <button
              onClick={() => handleSimulateCost(50)}
              disabled={costLoading}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200 shadow-sm"
            >
              $50 Emergency
            </button>
            <button
              onClick={() => handleSimulateCost(60)}
              disabled={costLoading}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-red-50 text-red-700 text-[11px] font-bold border border-red-300 shadow-sm"
            >
              $60 Hard Protection
            </button>
            <button
              onClick={() => handleSimulateCost(90)}
              disabled={costLoading}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-red-100 text-red-900 text-[11px] font-bold border border-red-400 shadow-sm"
            >
              $90 Cap Breach
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
          <p className="text-2xl font-black text-slate-900">{totalStudents}</p>
          <span className="text-[10px] text-brand-600 font-medium">Verified Registrations</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Applications</span>
          <p className="text-2xl font-black text-slate-900">{totalApplications}</p>
          <span className="text-[10px] text-brand-600 font-medium">Submitted Intake</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Programs</span>
          <p className="text-2xl font-black text-slate-900">{totalPrograms}</p>
          <span className="text-[10px] text-slate-400 font-medium">Degree Offerings</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AWS Cost Status</span>
          <p className={`text-2xl font-black ${currentLevel === 'NORMAL' ? 'text-emerald-600' : currentLevel === 'WARNING' ? 'text-amber-600' : currentLevel === 'CRITICAL' ? 'text-orange-600' : 'text-rose-600'}`}>
            {currentLevel}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            {currentLevel === 'NORMAL' ? 'All Services Up' : 'Cost Protection Active'}
          </span>
        </div>
      </div>

      {/* Stage Breakdown & Program Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            Admissions Lifecycle Stage Distribution
          </h3>

          <div className="space-y-2.5">
            {stageDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No students enrolled yet.</p>
            ) : (
              stageDistribution.map((item) => (
                <div key={item.stage} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 text-xs">
                  <span className="font-semibold text-slate-800">{item.stage?.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                    {item.count} Students
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-600" />
            Program Intake Popularity
          </h3>

          <div className="space-y-2.5">
            {programDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No program selections recorded yet.</p>
            ) : (
              programDistribution.map((item) => (
                <div key={item.programCode} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 text-xs">
                  <span className="font-semibold text-slate-800">{item.programName} ({item.programCode})</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {item.count} Applicants
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
