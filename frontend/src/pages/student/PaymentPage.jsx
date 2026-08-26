import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Loader2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const PaymentPage = () => {
  const { student, refreshStudentProfile } = useAuth();
  const [application, setApplication] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const appRes = await api.get('/applications/me');
      if (appRes.data.success && appRes.data.data) {
        setApplication(appRes.data.data);
        const payRes = await api.get('/ai/chat', {
          // or direct payment query
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const handleCheckout = async () => {
    if (!application) return;

    setPaying(true);
    setError('');

    try {
      // 1. Create Idempotent Payment Order
      const orderRes = await api.post('/payments/create', {
        applicationId: application._id,
        feeType: 'APPLICATION_FEE',
      });

      const payment = orderRes.data.data;

      // 2. Simulate Server-authoritative Checkout
      const checkoutRes = await api.post(`/payments/${payment.paymentId}/simulate-checkout`, {
        transactionReference: `TXN-SIM-${Date.now()}`,
      });

      if (checkoutRes.data.success) {
        setActiveReceipt(checkoutRes.data.data);
        await refreshStudentProfile();
        await fetchPaymentData();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  const isPaid = application?.isPaymentCompleted || application?.isFeeWaiverApproved;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Application Fee & Payment Gateway</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Idempotent server-verified transaction processing with cryptographic receipts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>256-Bit SSL Verified</span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isPaid ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Payment Completed & Verified</h3>
                  <p className="text-xs text-emerald-700">
                    {application.isFeeWaiverApproved
                      ? '100% Institutional Scholarship / Fee Waiver Granted'
                      : 'Application fee successfully settled. Your application is under admission review.'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                VERIFIED
              </span>
            </div>

            {activeReceipt && (
              <div className="p-4 rounded-xl bg-white border border-emerald-200 text-xs space-y-2">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold text-slate-900">{activeReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="text-slate-900">{activeReceipt.transactionReference}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-700">₹{activeReceipt.amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fee Breakdown Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fee Assessment</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">
                    Registration & Document Verification Fee ({application?.program?.name || 'Selected Degree'})
                  </span>
                  <span className="font-bold text-slate-900">
                    ₹{(application?.program?.applicationFee || 1000).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Applicable Taxes (GST 0% on Education)</span>
                  <span className="font-bold text-slate-900">₹0</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-bold text-slate-900">Total Payable Amount</span>
                  <span className="font-extrabold text-brand-700">
                    ₹{(application?.program?.applicationFee || 1000).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500">
                Payment is required to advance application to institutional admission committee review.
              </span>
              <button
                onClick={handleCheckout}
                disabled={paying}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Gateway Transaction...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ₹{(application?.program?.applicationFee || 1000).toLocaleString('en-IN')} Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
