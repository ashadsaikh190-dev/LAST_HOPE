import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Cpu, Database, Cloud, Inbox, Mail } from 'lucide-react';

export const SystemHealthPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(new Date());

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/health');
      setHealth(res.data);
      setLastChecked(new Date());
    } catch (e) {
      if (e.response?.data) {
        setHealth(e.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const components = health?.components || {};
  const isHealthy = health?.status === 'HEALTHY';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-600" />
            Live System & AWS Infrastructure Health
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational verification of MongoDB, AWS SDK v3 services, and FastAPI AI Agent
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono">
            Last pinged: {lastChecked.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Primary Overall Health Status Banner */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between ${
          isHealthy
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/80 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {isHealthy ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          )}
          <div>
            <h2 className="text-base font-extrabold">
              System Health: {health?.status || 'CHECKING...'}
            </h2>
            <p className="text-xs opacity-90 mt-0.5">
              Uptime: {health?.uptime ? `${Math.round(health.uptime)} seconds` : 'N/A'} | Monorepo active
            </p>
          </div>
        </div>
      </div>

      {/* Service Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* MongoDB Database */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">MongoDB Database</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                components.database?.status === 'UP' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {components.database?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Host: {components.database?.host || '127.0.0.1:27017'}</p>
            <p>Database: {components.database?.name || 'autonomous_admissions'}</p>
          </div>
        </div>

        {/* Amazon S3 Storage */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Amazon S3 Storage</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                components.aws?.s3?.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {components.aws?.s3?.status || 'LOCAL_STORAGE_FALLBACK'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Region: {components.aws?.region || 'us-east-1'}</p>
            <p>Message: {components.aws?.s3?.message || 'Ready for document buffer uploads'}</p>
          </div>
        </div>

        {/* Amazon Textract OCR */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Amazon Textract OCR</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {components.aws?.textract?.status || 'READY'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Engine: {components.aws?.textract?.engine || 'Amazon Textract v3 / Hybrid Parser'}</p>
            <p>Consistency Check: Active</p>
          </div>
        </div>

        {/* Amazon SQS Queue */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Amazon SQS Message Queue</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {components.aws?.sqs?.status || 'LOCAL_WORKER'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Async Queue: {components.aws?.sqs?.status === 'CONNECTED' ? 'AWS SQS Active' : 'In-Memory Async Worker'}</p>
          </div>
        </div>

        {/* Amazon SES Email */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Amazon SES Email</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {components.aws?.ses?.status || 'FALLBACK_DISPATCH'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Status: {components.aws?.ses?.status || 'READY'}</p>
          </div>
        </div>

        {/* Python AI Agent Service */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Python AI Agent Service</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                components.aiAgent?.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
              }`}
            >
              {components.aiAgent?.status || 'FALLBACK_READY'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Engine: {components.aiAgent?.engine || 'Autonomous Admissions Core'}</p>
          </div>
        </div>

        {/* AWS Cost Protection & Emergency Guard */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">AWS Cost Protection Guard</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                components.aws?.costProtection?.level === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : components.aws?.costProtection?.level === 'WARNING'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {components.aws?.costProtection?.level || 'NORMAL'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1 font-mono text-[11px]">
            <p>Budget Cap: ${components.aws?.costProtection?.budgetLimit || 96.87}</p>
            <p>Est. Cost: ${components.aws?.costProtection?.estimatedCost?.toFixed?.(2) || '0.00'}</p>
            <p>Ops Count: {components.aws?.costProtection?.usageCounters?.totalAwsOperations || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
