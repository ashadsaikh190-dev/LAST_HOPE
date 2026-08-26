import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { OCRDiffViewer } from '../../components/counselor/OCRDiffViewer';
import {
  User,
  FileText,
  FolderOpen,
  CreditCard,
  Award,
  IdCard,
  ScrollText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export const StudentDetail360 = () => {
  const { trackingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [approving, setApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [scholarshipPct, setScholarshipPct] = useState(0);

  const fetchStudent360 = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/counselor/students/${trackingId}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent360();
  }, [trackingId]);

  const handleApproveAdmission = async () => {
    if (!data?.application?._id) return;
    setApproving(true);
    try {
      const res = await api.post(`/admission/${data.application._id}/approve`, {
        scholarshipPercentage: scholarshipPct,
        decisionNotes: approvalNotes || 'Approved following counselor verification of credentials',
      });
      if (res.data.success) {
        await fetchStudent360();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200">
        <h2 className="text-sm font-bold text-slate-800">Student Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">No record matching Tracking ID {trackingId}</p>
        <Link to="/counselor/search" className="mt-4 inline-block text-xs font-bold text-brand-600 underline">
          Back to Search
        </Link>
      </div>
    );
  }

  const {
    student,
    application,
    documents = [],
    verifications = [],
    payments = [],
    admission,
    enrollment,
    cases = [],
    conversations = [],
    timelineLogs = [],
    aiActions = [],
  } = data;

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview & Persona' },
    { id: 'APPLICATION', label: 'Application Form' },
    { id: 'DOCUMENTS', label: `Documents (${documents.length})` },
    { id: 'ADMISSION', label: 'Admission & Offer' },
    { id: 'ENROLLMENT', label: 'Enrollment Card' },
    { id: 'CONVERSATIONS', label: 'AI Interactions' },
    { id: 'TIMELINE', label: `Audit Trail (${timelineLogs.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/counselor/search"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-extrabold text-base shadow-md">
              {student.firstName?.[0]}
              {student.lastName?.[0]}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">
                  {student.firstName} {student.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {student.currentStage}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Tracking ID: <strong className="text-brand-700">{student.trackingId}</strong>
                {student.officialEnrollmentNumber && (
                  <span className="ml-3 text-emerald-700 font-bold">
                    | Enrollment: {student.officialEnrollmentNumber}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Approve Action */}
          {application && !enrollment && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleApproveAdmission}
                disabled={approving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {approving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Admission & Issue Enrollment</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 pt-3 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === t.id
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Overview & Persona */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Student Profile & Academics
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-900">{student.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-900">{student.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">12th Marks:</span>
                <span className="font-bold text-slate-900">{student.academicProfile?.twelfthMarks || 'N/A'}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">10th Marks:</span>
                <span className="font-bold text-slate-900">{student.academicProfile?.tenthMarks || 'N/A'}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Program Interest:</span>
                <span className="font-semibold text-brand-700">{student.selectedProgram?.name || 'General'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Dynamic AI Persona Profile
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Intent Level:</span>
                <span className="font-bold text-brand-700">{student.persona?.intentLevel || 'MODERATE'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Fee Concern Category:</span>
                <span className="font-bold text-amber-700">{student.persona?.feeConcern || 'STANDARD'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Document Anomaly Risk:</span>
                <span className="font-bold text-slate-900">{student.persona?.documentRisk || 'LOW'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Engagement Level:</span>
                <span className="font-bold text-emerald-700">{student.persona?.engagementLevel || 'PROACTIVE'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documents & Textract OCR */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-6">
          {documents.map((doc) => {
            const verif = verifications.find((v) => String(v.document) === String(doc._id) || String(v.document?._id) === String(doc._id));
            return (
              <div key={doc._id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">{doc.documentType?.replace(/_/g, ' ')}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {doc.status}
                  </span>
                </div>
                <OCRDiffViewer verification={verif} application={application} />
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Enrollment Card */}
      {activeTab === 'ENROLLMENT' && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
          {enrollment ? (
            <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-950 text-white space-y-4 shadow-xl text-left">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-300">Official Student Card</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">ENROLLED</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Enrollment Number</span>
                <p className="font-mono text-xl font-bold text-emerald-400">{enrollment.enrollmentNumber}</p>
              </div>
              <div className="text-xs space-y-1">
                <p><strong>Name:</strong> {student.firstName} {student.lastName}</p>
                <p><strong>Program:</strong> {enrollment.program?.name}</p>
                <p><strong>Batch:</strong> {enrollment.batch}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8">Official enrollment number has not been generated yet.</p>
          )}
        </div>
      )}

      {/* Tab: Audit Trail Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-brand-600" />
            Complete Chronological Event Trail
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {timelineLogs.map((log) => (
              <div key={log._id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="px-2 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-600">
                      {log.actorType}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
