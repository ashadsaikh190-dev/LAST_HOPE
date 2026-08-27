import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { OCRDiffViewer } from '../../components/counselor/OCRDiffViewer';
import { FolderOpen, FileCheck2, CheckCircle2, XCircle, Loader2, Cpu, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DocumentReviewDesk = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchReviewQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/counselor/cases?category=DOCUMENT_AMBIGUITY');
      // Or fetch all documents that need review
      const docRes = await api.get('/documents');
      if (docRes.data.success) {
        setDocuments(docRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const handleManualOverride = async (docId, newStatus) => {
    try {
      await api.post(`/counselor/documents/${docId}/verify-override`, {
        status: newStatus,
        notes: `Counselor manual verification decision: ${newStatus}`,
      });
      await fetchReviewQueue();
      setSelectedDoc(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <FileCheck2 className="w-6 h-6 text-brand-600" />
          Document Verification Review Desk
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review Amazon Textract OCR extractions, inspect consistency mismatches, and apply manual verification overrides
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Document Verification Desk & OCR Audits...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Document Verification Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No documents currently pending review. Documents uploaded by students via the portal will automatically undergo Amazon Textract OCR and appear here with consistency validation diffs.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/student"
              className="px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Go to Student Portal to Upload</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => {
            const verif = doc.verification;
            const isMismatch = doc.status === 'MISMATCH' || doc.status === 'NEEDS_REVIEW';

            return (
              <div
                key={doc._id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {doc.documentType?.replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      Tracking ID: {doc.trackingId}
                    </h3>
                    {doc.student && (
                      <p className="text-xs text-slate-600 font-medium">
                        Student: {doc.student.firstName} {doc.student.lastName} ({doc.student.email})
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      doc.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isMismatch
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                {verif ? (
                  <OCRDiffViewer
                    verification={verif}
                    application={doc.application}
                    documentViewUrl={doc.viewUrl}
                    documentType={doc.documentType}
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-400 text-center">
                    Pending OCR analysis
                  </div>
                )}

                {/* Counselor Action Override Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/counselor/students/${doc.trackingId}`}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    Inspect Full Student Record
                  </Link>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleManualOverride(doc._id, 'REJECTED')}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleManualOverride(doc._id, 'VERIFIED')}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Verified</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
