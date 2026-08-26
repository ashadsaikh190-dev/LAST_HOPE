import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../contexts/SocketContext';
import { UploadModal } from '../../components/documents/UploadModal';
import { ReplacementModal } from '../../components/documents/ReplacementModal';
import {
  FolderOpen,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Eye,
  History,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const DocumentsPage = () => {
  const { socket } = useSocket();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUploadDocType, setActiveUploadDocType] = useState(null);
  const [activeReplaceDoc, setActiveReplaceDoc] = useState(null);
  const [selectedDocHistory, setSelectedDocHistory] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Listen to live document status and Textract OCR verification events via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleDocUpdate = (data) => {
      console.log('[Socket Document Event]', data);
      fetchDocuments();
    };

    socket.on('document:status', handleDocUpdate);
    socket.on('verification:update', handleDocUpdate);

    return () => {
      socket.off('document:status', handleDocUpdate);
      socket.off('verification:update', handleDocUpdate);
    };
  }, [socket]);

  const loadVersionHistory = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/versions`);
      if (res.data.success) {
        setVersionHistory(res.data.data);
        setSelectedDocHistory(docId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-brand-600" />
            Student Document Verification Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Amazon S3 private storage & Amazon Textract automated OCR consistency validation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
            {documents.filter((d) => d.status === 'VERIFIED').length}/{documents.length} Verified
          </span>
          <button
            onClick={() => setActiveUploadDocType('MARKSHEET_12TH')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>+ Upload Document</span>
          </button>
        </div>
      </div>

      {/* Empty State or Loading */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading documents from Amazon S3...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Your Application Documents</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Please upload your 10th marksheet, 12th marksheet, transfer certificate, and identity proof to begin automated Amazon Textract OCR verification.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setActiveUploadDocType('MARKSHEET_12TH')}
              className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Select & Upload Document</span>
            </button>
          </div>
        </div>
      ) : (
        /* Documents Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => {
            const isVerified = doc.status === 'VERIFIED';
            const isProcessing = doc.status === 'PROCESSING';
            const isMismatch = doc.status === 'MISMATCH' || doc.status === 'NEEDS_REVIEW';
            const isNotUploaded = doc.status === 'NOT_UPLOADED';

            const verif = doc.verification;

            return (
              <div
                key={doc._id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
              >
              {/* Document Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                    {doc.isRequired ? 'Mandatory Document' : 'Optional Document'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {doc.documentType?.replace(/_/g, ' ')}
                  </h3>
                  {doc.currentVersion && (
                    <span className="inline-block text-[11px] text-slate-400 font-mono">
                      Current Version: <strong>v{doc.currentVersion.versionNumber || 1}</strong> (
                      {doc.currentVersion.fileName})
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isVerified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isProcessing
                      ? 'bg-brand-50 text-brand-700 border border-brand-200 animate-pulse'
                      : isMismatch
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isNotUploaded
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isProcessing && <Clock className="w-3.5 h-3.5 animate-spin" />}
                  {isMismatch && <AlertTriangle className="w-3.5 h-3.5" />}
                  {doc.status}
                </span>
              </div>

              {/* Textract OCR Findings Card */}
              {verif && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-brand-600" />
                      Textract OCR Extraction
                    </span>
                    <span className="text-brand-700">Confidence: {verif.confidenceScore}%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                    <div>
                      <span>Name: </span>
                      <strong className="text-slate-900">{verif.extractedData?.name || 'Detected'}</strong>
                    </div>
                    <div>
                      <span>Percentage: </span>
                      <strong className="text-slate-900">
                        {verif.extractedData?.percentage ? `${verif.extractedData.percentage}%` : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span>Board: </span>
                      <strong className="text-slate-900">{verif.extractedData?.board || 'N/A'}</strong>
                    </div>
                    <div>
                      <span>Passing Year: </span>
                      <strong className="text-slate-900">{verif.extractedData?.passingYear || 'N/A'}</strong>
                    </div>
                  </div>

                  {verif.mismatchDetails && verif.mismatchDetails.length > 0 && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 space-y-0.5">
                      <p className="font-bold">⚠️ Flagged Mismatch:</p>
                      {verif.mismatchDetails.map((m, i) => (
                        <p key={i}>
                          Field <em>{m.field}</em>: Document ({m.documentValue}) differs from Form (
                          {m.applicationValue})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {doc.viewUrl && (
                    <a
                      href={doc.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View S3 File</span>
                    </a>
                  )}
                  {doc.currentVersion && (
                    <button
                      onClick={() => loadVersionHistory(doc._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>
                  )}
                </div>

                {isNotUploaded ? (
                  <button
                    onClick={() => setActiveUploadDocType(doc.documentType)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm shadow-brand-500/20"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveReplaceDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace Document</span>
                  </button>
                )}
              </div>

              {/* Version History Drawer */}
              {selectedDocHistory === doc._id && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800 pb-1 border-b border-slate-200">
                    <span>Version History Audit</span>
                    <button
                      onClick={() => setSelectedDocHistory(null)}
                      className="text-slate-400 hover:text-slate-600 text-[10px]"
                    >
                      Close
                    </button>
                  </div>
                  {versionHistory.map((v) => (
                    <div key={v._id} className="flex justify-between items-center py-1 text-[11px]">
                      <div>
                        <span className="font-mono font-bold text-brand-700">v{v.versionNumber}</span> -{' '}
                        <span className="text-slate-700">{v.fileName}</span>
                        {v.replacementReason && (
                          <p className="text-[10px] text-slate-400 italic">Reason: {v.replacementReason}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          v.status === 'CURRENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={Boolean(activeUploadDocType)}
        onClose={() => setActiveUploadDocType(null)}
        documentType={activeUploadDocType}
        onUploadSuccess={() => fetchDocuments()}
      />

      {/* Replace Modal */}
      <ReplacementModal
        isOpen={Boolean(activeReplaceDoc)}
        onClose={() => setActiveReplaceDoc(null)}
        document={activeReplaceDoc}
        onReplacementSuccess={() => fetchDocuments()}
      />
    </div>
  );
};
