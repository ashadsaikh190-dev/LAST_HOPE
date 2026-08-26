import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BookOpen, Clock, Award, ShieldCheck, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProgramBrowser = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const res = await api.get('/programs');
        if (res.data.success) {
          setPrograms(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-brand-600" />
          Academic Degree Programs & Specializations
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Explore accredited undergraduate and postgraduate programs, tuition fees, and admission cutoffs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div
            key={program._id}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {program.code}
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">{program.durationYears} Years</span>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">{program.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{program.description}</p>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Tuition Fee:</span>
                  <span className="font-bold text-slate-900">₹{program.tuitionFee?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Min 12th Cutoff:</span>
                  <span className="font-bold text-slate-900">{program.eligibilityCriteria?.minTwelfthMarks}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Min 10th Cutoff:</span>
                  <span className="font-bold text-slate-900">{program.eligibilityCriteria?.minTenthMarks}%</span>
                </div>
              </div>
            </div>

            <Link
              to="/application"
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <span>Apply for {program.code}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
