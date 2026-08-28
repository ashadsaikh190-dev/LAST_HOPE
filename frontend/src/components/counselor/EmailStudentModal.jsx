import React, { useState, useEffect, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { Mail, X, RotateCcw, Send, CheckCircle2, AlertCircle, Loader2, Settings, ChevronDown, ChevronUp, Key, ExternalLink, RefreshCw } from 'lucide-react';
import api from '../../api/axios';

export const EmailStudentModal = ({
  isOpen,
  onClose,
  student,
  application,
  onEmailSent,
}) => {
  const studentName = student
    ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'
    : 'Student';
  const studentEmail = student?.email || '';
  const trackingId = student?.trackingId || '';
  const programName =
    student?.selectedProgram?.name ||
    application?.program?.name ||
    'Undergraduate Degree Program';

  const defaultSubject = 'Complete Your Registration – GIET Admission Cell';

  const generateDefaultMessage = () => {
    return `Dear ${studentName},

This is a reminder from the GIET Admission Cell that your registration/admission process is not yet complete.

Please log in to the admission portal and complete the remaining steps at the earliest.

If you are facing any difficulty, please contact your admission counsellor.

Student Tracking ID:
${trackingId}

Program:
${programName}

Regards,
Ashad
Admission Counsellor
GIET Admission Cell
ashadsaikh7@gmail.com`;
  };

  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', text: '' }
  const [showConfig, setShowConfig] = useState(false);

  // EmailJS Credentials (reads from import.meta.env or localStorage)
  const [serviceId, setServiceId] = useState(
    () => localStorage.getItem('emailjs_service_id') || import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
  );
  const [templateId, setTemplateId] = useState(
    () => localStorage.getItem('emailjs_template_id') || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
  );
  const [publicKey, setPublicKey] = useState(
    () => localStorage.getItem('emailjs_public_key') || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
  );

  const isSendingRef = useRef(false);

  // Initialize or reset form when modal opens or student changes
  useEffect(() => {
    if (isOpen) {
      setSubject(defaultSubject);
      setMessage(generateDefaultMessage());
      setFeedback(null);
      setSending(false);
      isSendingRef.current = false;

      const currentServiceId = localStorage.getItem('emailjs_service_id') || import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
      const currentTemplateId = localStorage.getItem('emailjs_template_id') || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
      const currentPublicKey = localStorage.getItem('emailjs_public_key') || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

      setServiceId(currentServiceId);
      setTemplateId(currentTemplateId);
      setPublicKey(currentPublicKey);

      if (!currentServiceId || !currentTemplateId || !currentPublicKey) {
        setShowConfig(true);
      }
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const handleResetToDefault = () => {
    setSubject(defaultSubject);
    setMessage(generateDefaultMessage());
    setFeedback(null);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();

    // Prevent duplicate sending / double-click
    if (isSendingRef.current || sending) return;

    if (!studentEmail) {
      setFeedback({
        type: 'error',
        text: 'Student email address is not available.',
      });
      return;
    }

    const effectiveServiceId = (serviceId || '').trim();
    const effectiveTemplateId = (templateId || '').trim();
    const effectivePublicKey = (publicKey || '').trim();

    if (!effectiveServiceId || !effectiveTemplateId || !effectivePublicKey) {
      setShowConfig(true);
      setFeedback({
        type: 'error',
        text: 'Please provide your EmailJS Service ID, Template ID, and Public Key below to send.',
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setFeedback({
        type: 'error',
        text: 'Subject and message cannot be empty.',
      });
      return;
    }

    // Save to localStorage for convenience
    localStorage.setItem('emailjs_service_id', effectiveServiceId);
    localStorage.setItem('emailjs_template_id', effectiveTemplateId);
    localStorage.setItem('emailjs_public_key', effectivePublicKey);

    isSendingRef.current = true;
    setSending(true);
    setFeedback(null);

    const cleanEmail = (studentEmail || '').trim();

    const templateParams = {
      // Recipient Email Aliases (covers any EmailJS template field setup)
      to_email: cleanEmail,
      student_email: cleanEmail,
      email: cleanEmail,
      user_email: cleanEmail,
      recipient_email: cleanEmail,
      recipient: cleanEmail,
      to: cleanEmail,
      reply_to: 'ashadsaikh7@gmail.com',

      // Names
      to_name: studentName,
      student_name: studentName,
      name: studentName,
      user_name: studentName,
      from_name: 'Ashad (GIET Admission Cell)',
      counsellor_name: 'Ashad',
      counsellor_email: 'ashadsaikh7@gmail.com',

      // Application Details
      tracking_id: trackingId,
      program: programName,
      program_name: programName,
      subject: subject.trim(),
      message: message.trim(),
    };

    try {
      // Send email via EmailJS
      await emailjs.send(effectiveServiceId, effectiveTemplateId, templateParams, effectivePublicKey);

      setFeedback({
        type: 'success',
        text: `Email sent successfully to ${studentEmail}.`,
      });

      // Optionally log audit event in backend
      try {
        await api.post(`/counselor/students/${trackingId}/log-email`, {
          recipientEmail: studentEmail,
          subject: subject.trim(),
        });
      } catch (logErr) {
        console.error('[Audit Log] Failed to log email event:', logErr);
      }

      if (onEmailSent) {
        onEmailSent();
      }

      // Auto close modal after 2.5 seconds on success
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (error) {
      console.error('[EmailJS Error]', error);
      const rawErrorMsg =
        error?.text ||
        error?.message ||
        (typeof error === 'string' ? error : 'Unable to send email. Please verify your EmailJS keys and template parameters.');
      
      const isInvalidGrant =
        typeof rawErrorMsg === 'string' &&
        (rawErrorMsg.toLowerCase().includes('invalid grant') ||
         rawErrorMsg.toLowerCase().includes('reconnect your gmail'));

      setShowConfig(true);
      setFeedback({
        type: 'error',
        isInvalidGrant,
        text: isInvalidGrant
          ? 'Gmail_API: Invalid grant. Your Gmail connection in EmailJS has expired or was revoked by Google. Please reconnect your Gmail account.'
          : `EmailJS Error: ${rawErrorMsg}`,
        rawError: rawErrorMsg,
      });
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const handleSendViaBackend = async () => {
    if (isSendingRef.current || sending) return;

    if (!studentEmail) {
      setFeedback({
        type: 'error',
        text: 'Student email address is not available.',
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setFeedback({
        type: 'error',
        text: 'Subject and message cannot be empty.',
      });
      return;
    }

    isSendingRef.current = true;
    setSending(true);
    setFeedback(null);

    try {
      await api.post(`/counselor/students/${trackingId}/send-email`, {
        recipientEmail: studentEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      setFeedback({
        type: 'success',
        text: `Email dispatched successfully via backend server to ${studentEmail}.`,
      });

      if (onEmailSent) {
        onEmailSent();
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error('[Backend Send Error]', err);
      setFeedback({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to dispatch email via backend.',
      });
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Email Student
              </h2>
              <p className="text-xs text-slate-500">
                Send a personalized admission or registration reminder to{' '}
                <strong className="text-slate-800">{studentName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-4">
            {feedback.isInvalidGrant ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 shadow-sm space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-950">
                      Gmail Connection Expired (Invalid Grant)
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Google OAuth security has expired the Gmail connection in EmailJS. You can reconnect it on EmailJS or send directly via the backend server.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/80 rounded-xl border border-amber-200/60 text-[11px] text-slate-700 space-y-2">
                  <p className="font-bold text-slate-800">Quick Fix Options:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li><strong className="text-slate-800">Option 1:</strong> Click <strong className="text-brand-700">"Send via Backend Server"</strong> below to send right now without EmailJS.</li>
                    <li><strong className="text-slate-800">Option 2:</strong> Reconnect Gmail in EmailJS Dashboard (<code className="font-mono text-brand-700">{serviceId || 'service_sfsai1a'}</code>).</li>
                  </ol>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendViaBackend}
                    disabled={sending || !studentEmail}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send via Backend Server</span>
                  </button>

                  <a
                    href="https://dashboard.emailjs.com/admin/services"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    <span>Open EmailJS Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Form */}
        <form
          onSubmit={handleSendEmail}
          className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
        >
          {/* Recipient (To) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              To (Student Email)
            </label>
            <div className="relative">
              <input
                type="email"
                value={studentEmail || ''}
                readOnly
                placeholder="No email address available"
                className={`w-full px-4 py-2.5 rounded-xl border font-mono text-xs cursor-not-allowed ${
                  studentEmail
                    ? 'bg-slate-100/80 border-slate-200 text-slate-800'
                    : 'bg-rose-50/70 border-rose-200 text-rose-700'
                }`}
              />
              {!studentEmail && (
                <p className="text-[11px] font-bold text-rose-600 mt-1">
                  Student email address is not available.
                </p>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              disabled={sending}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          {/* Message Body */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={sending}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            </div>
            <textarea
              required
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Compose reminder message..."
              disabled={sending}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed transition-all resize-y"
            />
          </div>

          {/* Counsellor Identity Note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Sender:{' '}
              <strong className="text-slate-700">
                Ashad (GIET Admission Cell)
              </strong>{' '}
              &lt;ashadsaikh7@gmail.com&gt;
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              Tracking ID: {trackingId}
            </span>
          </div>

          {/* EmailJS Credentials Accordion */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] font-bold text-slate-700 hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-brand-600" />
                <span>EmailJS Service & API Credentials</span>
                {(!serviceId || !templateId || !publicKey) && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Configuration Needed
                  </span>
                )}
              </div>
              {showConfig ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showConfig && (
              <div className="p-4 pt-2 border-t border-slate-200 space-y-3 bg-white text-xs">
                <p className="text-[11px] text-slate-500">
                  Enter your EmailJS credentials from your dashboard (or set them in your <code className="font-mono text-brand-700">.env</code> file).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Service ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      placeholder="e.g. service_giet"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Template ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      placeholder="e.g. template_reminder"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Public Key <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder="e.g. user_xxx / public_key"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={sending}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending || !studentEmail}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
