import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../api/axios';
import { StatusStepper } from '../../components/common/StatusStepper';
import {
  FileText,
  FolderOpen,
  CreditCard,
  Award,
  IdCard,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const StudentDashboard = () => {
  const { student, refreshStudentProfile } = useAuth();
  const { socket } = useSocket();
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [appRes, docsRes] = await Promise.all([
        api.get('/applications/me'),
        api.get('/documents'),
      ]);

      if (appRes.data.success) {
        setApplication(appRes.data.data);
      }
      if (docsRes.data.success) {
        setDocuments(docsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen to live lifecycle stage and document status updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleStageChange = () => {
      refreshStudentProfile();
      fetchDashboardData();
    };

    const handleDocStatus = () => {
      fetchDashboardData();
    };

    socket.on('lifecycle:stage_changed', handleStageChange);
    socket.on('document:status', handleDocStatus);
    socket.on('enrollment:generated', handleStageChange);

    return () => {
      socket.off('lifecycle:stage_changed', handleStageChange);
      socket.off('document:status', handleDocStatus);
      socket.off('enrollment:generated', handleStageChange);
    };
  }, [socket]);

  const verifiedDocsCount = documents.filter((d) => d.status === 'VERIFIED').length;
  const totalDocsCount = documents.length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-bold uppercase tracking-wider">
              Student Admissions Portal
            </span>
            <span className="text-xs text-slate-300 font-mono">ID: {student?.trackingId}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {student?.firstName} {student?.lastName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Your admission journey is managed autonomously with real-time verification and intelligent assistance.
          </p>
        </div>

        {student?.officialEnrollmentNumber ? (
          <div className="relative z-10 flex flex-col items-center p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Official Enrollment</span>
            <span className="text-lg font-black tracking-tight text-white mt-0.5">
              {student.officialEnrollmentNumber}
            </span>
            <Link
              to="/enrollment"
              className="mt-2 text-xs font-bold text-emerald-300 hover:text-white underline flex items-center gap-1"
            >
              View Student ID Card <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <Link
            to={application ? '/documents' : '/application'}
            className="relative z-10 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-brand-900 font-bold text-xs shadow-lg hover:bg-slate-50 hover:scale-105 transition-all"
          >
            <span>{application ? 'Continue Document Verification' : 'Start Application'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Real-time Lifecycle Stage Machine Stepper */}
      <StatusStepper currentStage={student?.currentStage || 'REGISTERED'} />

      {/* Grid: Application Card & Document Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Application Details or CTA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Application Overview</h3>
                  <p className="text-xs text-slate-500">
                    {application ? `Application ID: ${application.applicationId}` : 'No application submitted yet'}
                  </p>
                </div>
              </div>

              {application && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {application.status?.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {application ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-slate-400 font-medium">Selected Program</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {application.program?.name} ({application.program?.code})
                    </p>
                    <span className="text-slate-500 font-medium">{application.program?.department} Department</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-slate-400 font-medium">Academic Year</span>
                    <p className="font-bold text-slate-900 text-sm">{application.academicYear}</p>
                    <span className="text-slate-500 font-medium">Full-time On-campus</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Submitted on: {new Date(application.submissionDate || application.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    to="/application"
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    View Full Application Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8 space-y-3">
                <p className="text-xs text-slate-500">
                  You have not submitted an admission application yet. Start your application in a few minutes.
                </p>
                <Link
                  to="/application"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 hover:bg-brand-700"
                >
                  <FileText className="w-4 h-4" />
                  <span>Start Admission Application</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Action Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/documents"
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform mb-3">
                <FolderOpen className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Upload & Verify Docs</h4>
              <p className="text-[11px] text-slate-500 mt-1">Amazon Textract automated OCR extraction & consistency check</p>
            </Link>

            <Link
              to="/payment"
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Application & Fee Payment</h4>
              <p className="text-[11px] text-slate-500 mt-1">Idempotent verified fee processing and instant official receipts</p>
            </Link>

            <Link
              to="/admission"
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Admission & Offer Letter</h4>
              <p className="text-[11px] text-slate-500 mt-1">Institutional merit decisions & official Enrollment Cards</p>
            </Link>
          </div>
        </div>

        {/* Right Col: Live Document Verification Checklist */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-brand-600" />
                Document Checklist
              </h3>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                {verifiedDocsCount}/{totalDocsCount} Verified
              </span>
            </div>

            <div className="space-y-2.5">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No document requirements loaded yet.</p>
              ) : (
                documents.map((doc) => {
                  const isVerified = doc.status === 'VERIFIED';
                  const isProcessing = doc.status === 'PROCESSING';
                  const isMismatch = doc.status === 'MISMATCH' || doc.status === 'NEEDS_REVIEW';

                  return (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 text-[11px]">
                          {doc.documentType?.replace(/_/g, ' ')}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {doc.currentVersion ? `Version v${doc.currentVersion.versionNumber || 1}` : 'Pending Upload'}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isProcessing
                            ? 'bg-brand-50 text-brand-700 border border-brand-200 animate-pulse'
                            : isMismatch
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isVerified && <CheckCircle2 className="w-3 h-3" />}
                        {isProcessing && <Clock className="w-3 h-3 animate-spin" />}
                        {isMismatch && <AlertTriangle className="w-3 h-3" />}
                        {doc.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <Link
              to="/documents"
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors block text-center"
            >
              <span>Manage & Replace Documents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
