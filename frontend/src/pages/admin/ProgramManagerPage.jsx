import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BookOpen, Plus, Loader2, CheckCircle2, AlertCircle, Edit, Trash2 } from 'lucide-react';

export const ProgramManagerPage = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: 'Computer Science',
    degree: 'B.Tech',
    durationYears: 4,
    tuitionFee: 100000,
    applicationFee: 1000,
    seatCapacity: 120,
    eligibilityCriteria: {
      minTenthMarks: 50,
      minTwelfthMarks: 60,
      requiredSubjects: ['Physics', 'Mathematics'],
      preferredStream: 'Science',
    },
    applicationDeadline: '2026-10-31',
    description: '',
  });

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/programs');
      if (res.data.success) {
        setPrograms(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/programs', formData);
      if (res.data.success) {
        await fetchPrograms();
        setIsCreating(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-600" />
            Institutional Program Catalog & Criteria Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure active university degrees, fees, cutoffs, and required document rules
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Cancel' : 'Create New Program'}</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">Define New Academic Program</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Program Code</label>
              <input
                type="text"
                required
                placeholder="e.g. ROBOTICS"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Program Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. B.Tech in Robotics & Automation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Annual Tuition Fee (₹)</label>
              <input
                type="number"
                required
                value={formData.tuitionFee}
                onChange={(e) => setFormData({ ...formData, tuitionFee: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
            >
              Save Program to Catalog
            </button>
          </div>
        </form>
      )}

      {/* Program Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Degree Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Annual Fee</th>
                <th className="p-4">12th Min Cutoff</th>
                <th className="p-4">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {programs.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-brand-700">{p.code}</td>
                  <td className="p-4 font-bold text-slate-900">{p.name}</td>
                  <td className="p-4 text-slate-600">{p.department}</td>
                  <td className="p-4 font-bold text-emerald-700">₹{p.tuitionFee?.toLocaleString('en-IN')}</td>
                  <td className="p-4">{p.eligibilityCriteria?.minTwelfthMarks}%</td>
                  <td className="p-4 font-bold">{p.enrolledCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
