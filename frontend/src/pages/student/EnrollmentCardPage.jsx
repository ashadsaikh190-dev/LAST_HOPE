import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { IdCard, ShieldCheck, Download, Printer, GraduationCap, Loader2, Sparkles } from 'lucide-react';

export const EnrollmentCardPage = () => {
  const { student } = useAuth();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollment = async () => {
      try {
        setLoading(true);
        const res = await api.get('/enrollment/me');
        if (res.data.success && res.data.data) {
          setEnrollment(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollment();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Official Student Enrollment Card</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent institutional credential issued after verified admissions completion
              </p>
            </div>
          </div>

          {enrollment && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Card</span>
            </button>
          )}
        </div>

        {enrollment ? (
          <div className="flex flex-col items-center space-y-6">
            {/* Student ID Card Visual (Credit card aspect ratio / Sleek University style) */}
            <div className="w-full max-w-md rounded-3xl bg-gradient-to-tr from-slate-950 via-brand-950 to-brand-900 text-white p-7 shadow-2xl ring-1 ring-white/10 relative overflow-hidden space-y-5">
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                    <GraduationCap className="w-5 h-5 text-brand-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight">GIET UNIVERSITY</h3>
                    <p className="text-[9px] text-brand-300 font-semibold tracking-wider uppercase">Official Student Card</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-bold text-emerald-300">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ACTIVE</span>
                </div>
              </div>

              {/* Card Main Body */}
              <div className="space-y-4 relative z-10">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Enrollment Number</span>
                  <p className="text-xl font-mono font-black tracking-wider text-emerald-400">
                    {enrollment.enrollmentNumber}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">Student Name</span>
                    <p className="font-bold text-white text-sm">
                      {student?.firstName} {student?.lastName}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">Tracking ID</span>
                    <p className="font-mono text-xs font-semibold text-slate-300">
                      {enrollment.trackingId}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">Degree Program</span>
                    <p className="font-semibold text-xs text-white">
                      {enrollment.program?.name} ({enrollment.program?.code})
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">Batch & Academic Year</span>
                    <p className="font-semibold text-xs text-white">
                      {enrollment.batch} ({enrollment.academicYear})
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer with QR simulation */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 relative z-10">
                <span>Issued: {new Date(enrollment.generatedAt).toLocaleDateString()}</span>
                <span className="font-mono">VERIFIED ENROLLMENT</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <IdCard className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Enrollment Number Not Issued Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Official Enrollment Numbers are generated automatically by the institutional backend service once your application, document verification, and admission approval are finalized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
