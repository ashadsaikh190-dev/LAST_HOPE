import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Search, User, FileText, IdCard, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const StudentSearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/counselor/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        setResults(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const students = results?.students || [];
  const applications = results?.applications || [];
  const enrollments = results?.enrollments || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Search Header */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Search className="w-6 h-6 text-brand-600" />
            Universal Student Lifecycle Search
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Query student database by Student Tracking ID, Official Enrollment Number, Application ID, Name, Phone, or Email
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. STU-2026-..., GIET2026CSE001247, APP-2026-..., rahul@example.com..."
              className="w-full pl-12 pr-4 py-3.5 text-xs font-medium rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Search</span>}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Search Results ({students.length + applications.length + enrollments.length} Matches Found)
            </h2>
          </div>

          {students.length === 0 && applications.length === 0 && enrollments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
              No matching records found in institutional database for "{query}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student._id}
                  onClick={() => navigate(`/counselor/students/${student.trackingId}`)}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-400 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold group-hover:scale-105 transition-transform">
                        {student.firstName?.[0]}
                        {student.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono">{student.email}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                      {student.currentStage}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tracking ID:</span>
                      <span className="font-mono font-bold text-brand-700">{student.trackingId}</span>
                    </div>
                    {student.officialEnrollmentNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Enrollment No:</span>
                        <span className="font-mono font-bold text-emerald-700">{student.officialEnrollmentNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Program:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {student.selectedProgram?.name || 'General Admission'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-xs font-bold text-brand-600 gap-1 pt-1">
                    <span>Inspect 360° Record</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
