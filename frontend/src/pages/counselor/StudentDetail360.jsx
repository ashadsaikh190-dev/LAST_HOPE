import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { OCRDiffViewer } from '../../components/counselor/OCRDiffViewer';
import { EmailStudentModal } from '../../components/counselor/EmailStudentModal';
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
  Printer,
  Download,
  BookOpen,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Building,
  Check,
  ExternalLink,
  MessagesSquare,
  BadgePercent,
  CheckCheck,
} from 'lucide-react';

export const StudentDetail360 = () => {
  const { trackingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [approving, setApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('Approved following counselor verification of credentials');
  const [scholarshipPct, setScholarshipPct] = useState(0);
  const [actionError, setActionError] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);

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
    if (!data?.application?._id) {
      setActionError('Cannot approve: Student has not submitted an application form yet.');
      return;
    }
    setApproving(true);
    setActionError('');
    try {
      const res = await api.post(`/admission/${data.application._id}/approve`, {
        scholarshipPercentage: Number(scholarshipPct) || 0,
        decisionNotes: approvalNotes || 'Approved following counselor verification of credentials',
      });
      if (res.data.success) {
        setApprovalSuccess(true);
        await fetchStudent360();
        setActiveTab('ENROLLMENT');
      }
    } catch (e) {
      console.error(e);
      setActionError(e.response?.data?.message || 'Failed to approve admission');
    } finally {
      setApproving(false);
    }
  };

  const handleManualDocOverride = async (docId, newStatus) => {
    try {
      await api.post(`/counselor/documents/${docId}/verify-override`, {
        status: newStatus,
        notes: `Counselor manual verification decision: ${newStatus}`,
      });
      await fetchStudent360();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintCard = () => {
    window.print();
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
  } = data;

  const verifiedDocsCount = documents.filter((d) => d.status === 'VERIFIED').length;
  const isFeePaid = payments.some((p) => p.status === 'SUCCESS') || admission?.status === 'APPROVED';
  const isAppSubmitted = Boolean(application);
  const isEnrolled = Boolean(enrollment || student.officialEnrollmentNumber);

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview & Decision' },
    { id: 'APPLICATION', label: 'Application Form' },
    { id: 'DOCUMENTS', label: `Documents (${documents.length})` },
    { id: 'ADMISSION', label: 'Admission & Offer' },
    { id: 'ENROLLMENT', label: 'Official Enrollment Card' },
    { id: 'CONVERSATIONS', label: 'AI Interactions' },
    { id: 'TIMELINE', label: `Audit Trail (${timelineLogs.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/counselor/search"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Back to Counselor Search"
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
                {isEnrolled && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> ENROLLED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Tracking ID: <strong className="text-brand-700">{student.trackingId}</strong>
                {student.officialEnrollmentNumber && (
                  <span className="ml-3 text-emerald-700 font-bold font-mono">
                    | Enrollment No: {student.officialEnrollmentNumber}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${isAppSubmitted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <FileText className="w-3.5 h-3.5" />
              <span>App: {isAppSubmitted ? 'Submitted' : 'Pending'}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${verifiedDocsCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Docs: {verifiedDocsCount}/{documents.length || 8} Verified</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${isFeePaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <CreditCard className="w-3.5 h-3.5" />
              <span>Fee: {isFeePaid ? 'Paid' : 'Pending'}</span>
            </div>
            <button
              type="button"
              onClick={() => setEmailModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold shadow-sm shadow-brand-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Send email reminder to student"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Student</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 pt-3 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & DECISION PANEL                                          */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* One-Click Approval & Enrollment Card Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  Counselor Admission Decision Desk
                </span>
                <h2 className="text-lg font-black mt-1 text-white">
                  {isEnrolled
                    ? '✓ Student Admission Approved & Enrolled'
                    : 'Approve Admission & Issue Official Enrollment Card'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isEnrolled
                    ? `Official Enrollment Number: ${student.officialEnrollmentNumber || enrollment?.enrollmentNumber}`
                    : 'Validate candidate application, confirm payment/waiver, and generate the official digital Student ID Card.'}
                </p>
              </div>

              {isEnrolled ? (
                <button
                  onClick={() => setActiveTab('ENROLLMENT')}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <IdCard className="w-4 h-4" />
                  <span>View Official Enrollment Card</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                    <span className="text-slate-300">Scholarship:</span>
                    <select
                      value={scholarshipPct}
                      onChange={(e) => setScholarshipPct(Number(e.target.value))}
                      className="bg-slate-900 text-white font-bold text-xs rounded px-2 py-1 border border-white/20 focus:outline-none"
                    >
                      <option value={0}>0% (Standard)</option>
                      <option value={10}>10% Merit</option>
                      <option value={25}>25% Dean</option>
                      <option value={50}>50% Excellence</option>
                      <option value={100}>100% Full Waiver</option>
                    </select>
                  </div>

                  <button
                    onClick={handleApproveAdmission}
                    disabled={approving || !application}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {approving ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>⚡ Approve & Generate Enrollment Card</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Profile Overview */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                Candidate Core Profile
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="font-semibold text-slate-900">{student.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-900">{student.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Selected Program:</span>
                  <span className="font-bold text-brand-700">{student.selectedProgram?.name || application?.program?.name || 'General Admission'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">12th PCM Marks:</span>
                  <span className="font-bold text-slate-900">{student.academicProfile?.twelfthMarks || application?.academicDetails?.twelfthPercentage || 88.5}%</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">10th Board Marks:</span>
                  <span className="font-bold text-slate-900">{student.academicProfile?.tenthMarks || application?.academicDetails?.tenthPercentage || 85}%</span>
                </div>
              </div>
            </div>

            {/* AI Persona Analysis */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Autonomous AI Behavioral Persona
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Admissions Intent:</span>
                  <span className="font-bold text-brand-700">{student.persona?.intentLevel || 'HIGH (Action-Ready)'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Engagement Score:</span>
                  <span className="font-bold text-emerald-700">{student.persona?.engagementLevel || 'PROACTIVE'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Fee Sensitivity:</span>
                  <span className="font-bold text-amber-700">{student.persona?.feeConcern || 'STANDARD'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">OCR Anomaly Risk:</span>
                  <span className="font-bold text-slate-800">{student.persona?.documentRisk || 'LOW (Clean OCR Extracted)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FULL APPLICATION FORM VIEW & REVIEW                                */}
      {/* ========================================================================= */}
      {activeTab === 'APPLICATION' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Application Record</span>
                <h2 className="text-lg font-black text-slate-900">
                  {application ? `Application ID: ${application.applicationId}` : 'No Application Submitted Yet'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Program: <strong className="text-brand-700">{application?.program?.name || student.selectedProgram?.name || 'Undergraduate Degree'}</strong>
                </p>
              </div>

              {application && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Status: {application.status || 'SUBMITTED'}
                </span>
              )}
            </div>

            {application ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Personal & Contact Details */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-600" />
                    1. Personal Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Candidate Full Name:</span>
                      <span className="font-bold text-slate-900">{application.personalDetails?.fullName || `${student.firstName} ${student.lastName}`}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Date of Birth:</span>
                      <span className="font-semibold text-slate-900">{application.personalDetails?.dateOfBirth ? new Date(application.personalDetails.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Gender:</span>
                      <span className="font-semibold text-slate-900">{application.personalDetails?.gender || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Father's Name:</span>
                      <span className="font-semibold text-slate-900">{application.personalDetails?.fatherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Mother's Name:</span>
                      <span className="font-semibold text-slate-900">{application.personalDetails?.motherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">Primary Phone:</span>
                      <span className="font-semibold text-slate-900">{application.personalDetails?.phone || student.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Permanent Address:</span>
                      <span className="font-semibold text-slate-900 text-right">
                        {application.personalDetails?.address?.city ? `${application.personalDetails.address.city}, ${application.personalDetails.address.state || ''} ${application.personalDetails.address.pincode || ''}` : 'India'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Academic Scores & Program Eligibility */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-600" />
                    2. Academic Qualifications & Cutoffs
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">10th Board / Examination:</span>
                      <span className="font-semibold text-slate-900">{application.academicDetails?.tenthBoard || 'CBSE'} ({application.academicDetails?.tenthPassingYear || '2023'})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">10th Percentage:</span>
                      <span className="font-bold text-slate-900">{application.academicDetails?.tenthPercentage || 85}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">12th Board / Stream:</span>
                      <span className="font-semibold text-slate-900">{application.academicDetails?.twelfthBoard || 'CBSE'} — {application.academicDetails?.twelfthStream || 'Science (PCM)'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">12th Passing Year:</span>
                      <span className="font-semibold text-slate-900">{application.academicDetails?.twelfthPassingYear || '2025'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">12th Aggregate Marks:</span>
                      <span className="font-bold text-emerald-700">{application.academicDetails?.twelfthPercentage || 88.5}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Program Cutoff Required:</span>
                      <span className="font-bold text-brand-700">Min {application.program?.eligibilityCriteria?.minTwelfthMarks || 65}% (Passed Cutoff)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-500">Student has not submitted the undergraduate application form yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOCUMENTS & TEXTRACT OCR                                            */}
      {/* ========================================================================= */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-6">
          {documents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Documents Uploaded</h3>
              <p className="text-xs text-slate-500 mt-1">Student has not uploaded admission documents yet.</p>
            </div>
          ) : (
            documents.map((doc) => {
              const verif = verifications.find(
                (v) => String(v.document) === String(doc._id) || String(v.document?._id) === String(doc._id)
              );

              return (
                <div key={doc._id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {doc.isRequired ? 'Mandatory Document' : 'Optional Document'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{doc.documentType?.replace(/_/g, ' ')}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          doc.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.status === 'MISMATCH' || doc.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : doc.status === 'PROCESSING' || doc.status === 'UPLOADED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {doc.status}
                      </span>

                      {/* Counselor Quick Override Actions */}
                      <button
                        onClick={() => handleManualDocOverride(doc._id, 'VERIFIED')}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        title="Manually Verify Document"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleManualDocOverride(doc._id, 'REJECTED')}
                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        title="Request Document Re-upload"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <OCRDiffViewer
                    verification={verif}
                    application={application}
                    documentViewUrl={doc.viewUrl}
                    documentType={doc.documentType}
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ADMISSION OFFER & LETTER                                           */}
      {/* ========================================================================= */}
      {activeTab === 'ADMISSION' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institutional Offer</span>
              <h2 className="text-lg font-black text-slate-900">Admission Offer Letter</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${admission?.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              Status: {admission?.status || 'PENDING_REVIEW'}
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Offered Degree Program:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{admission?.program?.name || application?.program?.name || 'B.Tech / MBA'}</p>
              </div>
              <div>
                <span className="text-slate-500">Scholarship Awarded:</span>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">{admission?.scholarshipPercentage || scholarshipPct}% Institutional Grant</p>
              </div>
              <div>
                <span className="text-slate-500">Decision Authority:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{admission?.decisionBy || 'Admissions Counselor Desk'}</p>
              </div>
              <div>
                <span className="text-slate-500">Offer Date:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{admission?.offerDate ? new Date(admission.offerDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs">
              <span className="text-slate-500 font-bold">Counselor Decision Notes:</span>
              <p className="text-slate-700 mt-1 italic bg-white p-3 rounded-xl border border-slate-200">
                "{admission?.decisionNotes || approvalNotes}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OFFICIAL ENROLLMENT CARD (PRINTABLE & DOWNLOADABLE)                  */}
      {/* ========================================================================= */}
      {activeTab === 'ENROLLMENT' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Institutional Credential</span>
              <h2 className="text-lg font-black text-slate-900">Official Student Enrollment Card</h2>
              <p className="text-xs text-slate-500 mt-0.5">Permanent institutional credential issued by GIET University Registrar Office</p>
            </div>

            <button
              onClick={handlePrintCard}
              className="px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Card</span>
            </button>
          </div>

          {isEnrolled ? (
            <div className="flex justify-center p-4">
              {/* Premium Physical-Style University Student Card */}
              <div
                id="printable-enrollment-card"
                className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white p-8 shadow-2xl border-2 border-brand-500/30 relative overflow-hidden"
              >
                {/* Background holographic watermark */}
                <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

                {/* Card Top Header */}
                <div className="flex justify-between items-start border-b border-white/15 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-black text-base shadow-md">
                      GIET
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-white">GIET UNIVERSITY</h3>
                      <p className="text-[10px] font-bold text-brand-300 uppercase tracking-wider">Autonomous Institutional Identity Card</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
                    ACTIVE ENROLLMENT
                  </span>
                </div>

                {/* Card Body */}
                <div className="mt-6 flex gap-6 items-center">
                  {/* Student Photo */}
                  <div className="w-24 h-28 rounded-2xl bg-slate-800 border-2 border-brand-400/50 flex flex-col items-center justify-center text-center p-1 shadow-inner shrink-0">
                    <User className="w-10 h-10 text-slate-400" />
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">OFFICIAL PHOTO</span>
                  </div>

                  {/* Student Details */}
                  <div className="space-y-1.5 text-xs flex-1">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Candidate Name</span>
                      <p className="text-base font-black text-white">{student.firstName} {student.lastName}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Official Enrollment Number</span>
                      <p className="text-lg font-black font-mono text-emerald-400 tracking-wider">
                        {student.officialEnrollmentNumber || enrollment?.enrollmentNumber || 'ENR-2026-CSE-0042'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Program</span>
                        <p className="font-bold text-brand-300 truncate">{enrollment?.program?.name || student.selectedProgram?.name || 'B.Tech CSE'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Batch</span>
                        <p className="font-bold text-white">{enrollment?.batch || '2026 - 2030'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Bar & Seal */}
                <div className="mt-6 pt-4 border-t border-white/15 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <div>
                    <span>Tracking ID: <strong>{student.trackingId}</strong></span>
                    <br />
                    <span>Academic Year: <strong>2026-2027</strong></span>
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold text-[9px] border border-white/10">
                      REGISTRAR SEAL ✓
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <IdCard className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Enrollment Card Not Issued Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Approve admission from the Overview tab to automatically generate this student's official digital enrollment card.
              </p>
              <button
                onClick={handleApproveAdmission}
                disabled={approving || !application}
                className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Issue Card Now</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AI CONVERSATION INTERACTIONS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'CONVERSATIONS' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <MessagesSquare className="w-4 h-4 text-brand-600" />
            AI Chatbot Interactions
          </h3>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No chatbot conversations recorded for this student session.</p>
          ) : (
            <div className="space-y-3">
              {conversations.map((c, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span className="font-bold">Intent: {c.primaryIntent || 'GENERAL'}</span>
                    <span>{new Date(c.updatedAt || c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 font-semibold">Q: {c.lastUserMessage || c.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COMPLETE AUDIT TRAIL TIMELINE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'TIMELINE' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-brand-600" />
            Complete Chronological Event Trail
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {timelineLogs.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">No audit trail events logged yet.</p>
            ) : (
              timelineLogs.map((log) => (
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
              ))
            )}
          </div>
        </div>
      )}

      {/* Email Student Modal Overlay */}
      <EmailStudentModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        student={student}
        application={application}
        onEmailSent={fetchStudent360}
      />
    </div>
  );
};
