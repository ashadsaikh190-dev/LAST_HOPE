import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, FileText, Cpu } from 'lucide-react';

export const OCRDiffViewer = ({ verification, application, documentViewUrl }) => {
  if (!verification) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
        No verification data available yet for this document.
      </div>
    );
  }

  const { extractedData, confidenceScore, status, mismatchDetails = [] } = verification;

  return (
    <div className="space-y-4">
      {/* Top Banner: Status & Confidence Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Amazon Textract OCR Engine</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  status === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : status === 'MISMATCH'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Automated entity extraction & consistency evaluation
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Confidence Score
          </span>
          <span
            className={`text-lg font-black ${
              confidenceScore >= 80 ? 'text-emerald-600' : confidenceScore >= 60 ? 'text-amber-600' : 'text-rose-600'
            }`}
          >
            {confidenceScore}%
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Application Form Values */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            Application Form Values
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">Full Name:</span>
              <span className="font-semibold text-slate-900">{application?.personalDetails?.fullName || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">12th Marks / Percentage:</span>
              <span className="font-semibold text-slate-900">{application?.academicDetails?.twelfthPercentage || 'N/A'}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">Passing Year:</span>
              <span className="font-semibold text-slate-900">{application?.academicDetails?.twelfthPassingYear || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Board / Council:</span>
              <span className="font-semibold text-slate-900">{application?.academicDetails?.twelfthBoard || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Textract Extracted OCR Values */}
        <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200 space-y-3">
          <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-brand-600" />
            Extracted Document OCR Data
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-brand-100">
              <span className="text-slate-500">Detected Name:</span>
              <span className="font-semibold text-slate-900">{extractedData?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-brand-100">
              <span className="text-slate-500">Detected Percentage:</span>
              <span className="font-semibold text-slate-900">{extractedData?.percentage !== null ? `${extractedData.percentage}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-brand-100">
              <span className="text-slate-500">Detected Passing Year:</span>
              <span className="font-semibold text-slate-900">{extractedData?.passingYear || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Detected Board:</span>
              <span className="font-semibold text-slate-900">{extractedData?.board || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mismatches and Anomaly Highlights */}
      {mismatchDetails && mismatchDetails.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Consistency Mismatches Flagged by Verification Engine</span>
          </div>
          <ul className="divide-y divide-amber-200 text-xs text-amber-900">
            {mismatchDetails.map((m, idx) => (
              <li key={idx} className="py-2 flex items-center justify-between">
                <span>Field: <strong>{m.field}</strong></span>
                <span>Document: <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">{m.documentValue}</code> vs Form: <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">{m.applicationValue}</code></span>
                <span className="text-[10px] font-bold text-amber-700">Similarity: {m.matchScore}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Document View Link */}
      {documentViewUrl && (
        <div className="text-right">
          <a
            href={documentViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-brand-600" />
            Inspect Original S3 Document Scan
          </a>
        </div>
      )}
    </div>
  );
};
