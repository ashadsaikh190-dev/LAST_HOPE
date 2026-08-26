import React, { useState } from 'react';
import { UploadCloud, X, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export const UploadModal = ({ isOpen, onClose, documentType: initialDocType, onUploadSuccess }) => {
  const [selectedType, setSelectedType] = useState(initialDocType || 'MARKSHEET_12TH');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  React.useEffect(() => {
    if (initialDocType) setSelectedType(initialDocType);
  }, [initialDocType]);

  if (!isOpen) return null;

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must not exceed 10MB');
      return;
    }
    setError('');
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    const docTypeToUpload = initialDocType || selectedType;
    if (!docTypeToUpload) {
      setError('Please select a document type');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docTypeToUpload);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        onUploadSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Student Document</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Target: <span className="font-semibold text-brand-600">{(initialDocType || selectedType)?.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!initialDocType && (
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Document Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="MARKSHEET_10TH">10th Standard Marksheet</option>
              <option value="MARKSHEET_12TH">12th Standard Marksheet</option>
              <option value="TRANSFER_CERTIFICATE">Transfer Certificate / Migration</option>
              <option value="IDENTITY_PROOF">Identity Proof (Aadhaar / Passport / ID)</option>
              <option value="INCOME_CERTIFICATE">Income Certificate</option>
              <option value="CASTE_CERTIFICATE">Caste / Category Certificate</option>
              <option value="OTHER">Other Academic Record</option>
            </select>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          className={`mt-5 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-colors ${
            dragOver
              ? 'border-brand-500 bg-brand-50/50'
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-800 text-center">
            Drag & drop document here or click to browse
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Accepted formats: PDF, JPG, PNG (Max 10MB)</p>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="hidden"
            id="file-upload-input"
          />
          <label
            htmlFor="file-upload-input"
            className="mt-4 px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
          >
            Select File
          </label>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-brand-50 border border-brand-200 text-xs">
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-slate-800 truncate max-w-[260px]">
                {file.name}
              </span>
              <span className="text-[10px] text-slate-500">
                ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-sm shadow-brand-500/20 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading to S3 & Triggering Textract...</span>
              </>
            ) : (
              <span>Upload Document</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
