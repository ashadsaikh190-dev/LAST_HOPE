import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { ScrollText, Search, Filter, Loader2, ShieldCheck } from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [trackingFilter, setTrackingFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/admin/audit-logs?limit=100';
      if (actionFilter) url += `&action=${actionFilter}`;
      if (trackingFilter) url += `&trackingId=${trackingFilter}`;

      const res = await api.get(url);
      if (res.data.success) {
        setLogs(res.data.data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, trackingFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-brand-600" />
            Immutable Audit Trail & Compliance Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic event timeline tracking all logins, document uploads, OCR verifications, and state transitions
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by Tracking ID..."
            value={trackingFilter}
            onChange={(e) => setTrackingFilter(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor Type</th>
                <th className="p-4">Tracking ID</th>
                <th className="p-4">Result</th>
                <th className="p-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800 font-mono text-[11px]">
              {logs.map((l) => (
                <tr key={l._id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-400 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-bold text-brand-700">{l.action}</td>
                  <td className="p-4 text-slate-600">{l.actorType}</td>
                  <td className="p-4 font-bold text-slate-900">{l.trackingId || '-'}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        l.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {l.result}
                    </span>
                  </td>
                  <td className="p-4 text-[10px] text-slate-500 max-w-[240px] truncate">
                    {JSON.stringify(l.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
