import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
  FileCheck,
  CreditCard,
  Award,
} from 'lucide-react';

const STAGES = [
  { id: 'REGISTERED', label: 'Registered' },
  { id: 'APPLICATION_STARTED', label: 'Application Started' },
  { id: 'APPLICATION_COMPLETED', label: 'App Submitted' },
  { id: 'DOCUMENT_VERIFICATION', label: 'Doc Verification' },
  { id: 'ELIGIBILITY_CHECK', label: 'Eligibility Check' },
  { id: 'PAYMENT_PENDING', label: 'Fee Payment' },
  { id: 'ADMISSION_APPROVED', label: 'Admission Approved' },
  { id: 'ENROLLED', label: 'Official Enrolled' },
];

export const StatusStepper = ({ currentStage }) => {
  const getStageIndex = (stage) => {
    switch (stage) {
      case 'REGISTERED':
      case 'LEAD':
        return 0;
      case 'APPLICATION_STARTED':
        return 1;
      case 'APPLICATION_COMPLETED':
      case 'DOCUMENTS_PENDING':
        return 2;
      case 'DOCUMENT_VERIFICATION':
        return 3;
      case 'ELIGIBILITY_CHECK':
        return 4;
      case 'PAYMENT_PENDING':
        return 5;
      case 'ADMISSION_REVIEW':
      case 'ADMISSION_APPROVED':
        return 6;
      case 'ENROLLMENT_GENERATED':
      case 'ENROLLED':
        return 7;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Admissions Lifecycle Conversion Progress</h2>
          <p className="text-xs text-slate-500 mt-0.5">Autonomous state tracking & verified transitions</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
          Stage: {currentStage?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Responsive Horizontal Stepper */}
      <div className="relative flex items-center justify-between w-full overflow-x-auto py-2 scrollbar-none">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-100 -z-0" />
        <div
          className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-brand-600 transition-all duration-700 -z-0"
          style={{ width: `${(currentIndex / (STAGES.length - 1)) * 95}%` }}
        />

        {STAGES.map((s, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center min-w-[90px] text-center px-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                    : isCurrent
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-md shadow-brand-500/30 scale-110 animate-pulse'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 animate-spin-slow" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              <span
                className={`text-[11px] font-semibold mt-2 ${
                  isCurrent
                    ? 'text-brand-700 font-bold'
                    : isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
