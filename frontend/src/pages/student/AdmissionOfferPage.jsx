import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Award, CheckCircle2, FileText, ArrowRight, ShieldCheck, Download, Loader2 } from 'lucide-react';

export const AdmissionOfferPage = () => {
  const { student } = useAuth();
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admission/me');
        if (res.data.success && res.data.data) {
          setAdmission(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmission();
  }, []);

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
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Institutional Admission Offer</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official letter of acceptance and scholarship entitlement
              </p>
            </div>
          </div>

          {admission && (
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {admission.status}
            </span>
          )}
        </div>

        {admission ? (
          <div className="space-y-6">
            {/* Offer Letter Paper Style Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-50 to-white border-2 border-slate-200 shadow-md space-y-6 font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">GIET UNIVERSITY</h2>
                  <p className="text-[11px] text-slate-500">Office of Undergraduate Admissions & Academic Affairs</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-slate-800">Date of Offer:</span>
                  <p className="text-slate-500">{new Date(admission.offerDate || admission.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <p>
                  Dear <strong>{student?.firstName} {student?.lastName}</strong> (Student Tracking ID: <code>{student?.trackingId}</code>),
                </p>
                <p>
                  On behalf of the Admissions Board, we are delighted to offer you provisional admission to the{' '}
                  <strong className="text-brand-900">{admission.program?.name} ({admission.program?.code})</strong> degree program for the academic session 2026-2027.
                </p>
                <p>
                  Your academic credentials, 10th/12th marksheets, and identity proof have been verified.
                </p>
                {admission.scholarshipPercentage > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                    🎉 Merit Scholarship: You have been awarded a <strong>{admission.scholarshipPercentage}% fee scholarship</strong> on your first-year tuition.
                  </div>
                )}
                <p className="italic text-slate-500 pt-2 border-t border-slate-100">
                  Approved By: {admission.decisionBy} | Decision Notes: "{admission.decisionNotes}"
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                to="/enrollment"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
              >
                <span>View Official Enrollment Card</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Admission Review in Progress</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your application and document verification are currently being evaluated. Once verified and approved, your official offer letter and enrollment number will be published here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
