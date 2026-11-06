import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Clock, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import { studentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';
import type { Payment } from '../../api';
import { PageSkeleton, EmptyState, Button } from '../../components/ui';

// Loads checkout.razorpay.com once and resolves when it is ready to use
function loadRazorpayCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

// payments.expiresAt is stored as UTC 'YYYY-MM-DD HH24:MI:SS' (no zone)
function parseUtc(value?: string | null): number {
  if (!value) return NaN;
  const s = String(value).trim().replace(' ', 'T');
  return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
}

export default function Payment() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const popup = usePopup();
  const { user } = useAuth();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [now, setNow] = useState(() => Date.now());
  // True while a charge that Razorpay already captured is waiting to be
  // confirmed by our server (the webhook settles it within seconds).
  const [confirming, setConfirming] = useState(false);
  const lastAttemptRef = useRef<{ orderId: string; paymentId: string } | null>(null);

  // This page always reads FRESH. Razorpay's webhook — and the order-reuse
  // self-heal in POST /pay/:id/order — can flip an invoice to 'completed'
  // server-side while this tab still holds a cached 'pending' copy, which
  // would leave a Pay button (and a 409 loop) on an already-paid invoice.
  const fetchPayment = (silent = false): Promise<Payment | null> => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    return studentApi
      .getDashboard({ force: true })
      .then((res) => {
        // The URL param is the opaque linkToken for new links; legacy
        // /student/pay/<number> links (sequential payment id) still resolve.
        const ref = String(paymentId ?? '');
        const numeric = /^\d+$/.test(ref);
        const p = res.data.payments.find((pay: Payment) =>
          (pay.linkToken && pay.linkToken === ref) || (numeric && pay.id === Number(ref))) || null;
        if (p?.linkToken && numeric && p.linkToken !== ref) {
          // Swap the sequential id out of the address bar so the public URL
          // never shows how many payments the site has; the param change
          // re-runs load() with the token.
          navigate(`/student/pay/${p.linkToken}`, { replace: true });
          return null;
        }
        setPayment(p);
        if (!silent) setLoading(false);
        return p;
      })
      .catch(() => {
        if (!silent) {
          setLoadError(true);
          setLoading(false);
        }
        return null;
      });
  };

  const load = () => { fetchPayment(false); };

  useEffect(() => { load(); }, [paymentId]);

  // The checkout handler only runs AFTER Razorpay captured the charge, so a
  // failed verify means the money already moved and only our confirmation is
  // missing. The webhook completes it server-side within seconds — poll for
  // that instead of ending on "contact support" for an invoice that is about
  // to show as paid by itself.
  useEffect(() => {
    if (!confirming) return;
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      attempt += 1;
      const p = await fetchPayment(true);
      if (cancelled) return;
      if (p && p.status !== 'pending') {
        setConfirming(false);
        setProcessing(false);
        // 'completed' -> success screen; 'failed'/'refunded' fall through to
        // their own screens below, which is the honest end state.
        if (p.status === 'completed') setSuccess(true);
        return;
      }
      if (attempt >= 15) {
        setConfirming(false);
        setProcessing(false);
        popup.error(
          `Razorpay took the payment but our servers have not confirmed it yet. It is normally settled automatically within a few minutes — reload this page shortly. Your Razorpay payment id: ${lastAttemptRef.current?.paymentId || 'unknown'}`,
          'Payment Not Confirmed Yet',
        );
        return;
      }
      timer = setTimeout(tick, 3000);
    };

    timer = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [confirming]);

  // Tick once a second while an unpaid invoice is open so the countdown stays
  // live; the server enforces the same deadline independently.
  useEffect(() => {
    if (!payment || payment.status !== 'pending' || success) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [payment, success]);

  const expiresMs = parseUtc(payment?.expiresAt);
  const timeLeft = Number.isNaN(expiresMs) ? null : Math.max(0, Math.floor((expiresMs - now) / 1000));
  const expired = !!payment && (payment.status === 'failed' || (payment.status === 'pending' && timeLeft !== null && timeLeft <= 0));

  useEffect(() => {
    if (success && countdown > 0) { const timer = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(timer); }
    else if (success && countdown === 0) { navigate('/student/learning'); }
  }, [success, countdown, navigate]);

  const verifyAndComplete = async (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) => {
    await studentApi.verifyPayment(payment!.id, { razorpay_order_id, razorpay_payment_id, razorpay_signature });
    setSuccess(true);
    setProcessing(false);
  };

  const handlePay = async () => {
    if (!payment || processing) return;
    setProcessing(true);
    try {
      // 1. Server creates the Razorpay order (amount is fixed server-side)
      const { data } = await studentApi.createPaymentOrder(payment.id);

      // The server always creates real Razorpay orders — if the response
      // isn't one, the server is running without keys (stale process / .env)
      if (!data.orderId || !data.keyId) {
        popup.error('Payment service is not configured. Restart the server so it picks up your Razorpay keys from .env.', 'Payment Not Configured');
        setProcessing(false);
        return;
      }

      // 2. Open the real Razorpay checkout with that order
      await loadRazorpayCheckout();
      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'IQ Intern',
        description: payment.internshipTitle || 'Internship payment',
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#10b981' },
        // 3. Razorpay signs the result — 4. server verifies the signature
        handler: async (response: any) => {
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;
          // One automatic retry for transient failures (network blip, cold
          // start, 5xx, axios timeout): verify is idempotent server-side
          // (signature check + completed-status guard) and the charge is
          // already captured here — it must not be stranded by a blip.
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              await verifyAndComplete(razorpay_order_id, razorpay_payment_id, razorpay_signature);
              return;
            } catch (err: any) {
              const transient = !err.response
                || [502, 503, 504].includes(err.response?.status)
                || ['ECONNABORTED', 'ETIMEDOUT'].includes(err.code);
              if (attempt === 1 && transient) {
                await new Promise((r) => setTimeout(r, 1500));
                continue;
              }
              // The charge is captured (this handler only runs on a successful
              // checkout), so never dead-end on "contact support": keep the
              // button in a confirming state and let the webhook settle it.
              lastAttemptRef.current = { orderId: razorpay_order_id, paymentId: razorpay_payment_id };
              setConfirming(true);
              popup.notify(
                err.response?.data?.error ||
                  'Your bank may have debited the amount. We are confirming it with Razorpay now — this page will update automatically.',
                { kind: 'info', title: 'Confirming Your Payment' },
              );
              return;
            }
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.on('payment.failed', (response: any) => {
        popup.error(response?.error?.description || 'The payment failed. Please try again.', 'Payment Failed');
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      popup.error(err.response?.data?.error || err.message || 'Payment failed. Please try again.', 'Payment Failed');
      setProcessing(false);
      // 410 = the invoice's time limit ran out server-side; 409 = the payment
      // was already completed/refunded (e.g. healed from the order route).
      // Reload so the page swaps its Pay button for the right end state.
      if (err.response?.status === 410 || err.response?.status === 409) load();
    }
  };

  if (loading) return <PageSkeleton label="Preparing your payment..." />;

  if (loadError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load this payment"
          description="Something went wrong while fetching payment details. Please try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <EmptyState
          icon={<CreditCard size={22} />}
          title="Payment not found"
          description="This payment record doesn't exist or has been removed."
          action={<Link to="/student" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800">Back to Dashboard</Link>}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-soft">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-slate-500 mb-6">Your payment has been processed successfully</p>
          <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-5 text-left">
            <div className="mb-3 flex justify-between items-center"><span className="text-sm text-slate-500">Amount Paid</span><span className="text-lg font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</span></div>
            <div className="mb-3 flex justify-between items-center"><span className="text-sm text-slate-500">Receipt No.</span><span className="font-mono text-sm text-slate-900">{payment.receiptNumber}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Program</span><span className="text-sm font-medium text-slate-900">{payment.internshipTitle}</span></div>
          </div>
          <p className="mb-4 text-sm text-slate-500">Redirecting to learning page in {countdown} seconds...</p>
          <Button className="w-full" onClick={() => navigate('/student/learning')}>Go to Learning Now</Button>
        </div>
      </div>
    );
  }

  if (payment && payment.status === 'completed') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-soft">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Completed</h1>
          <p className="text-slate-500 mb-6">This payment has already been processed successfully.</p>
          <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-5 text-left">
            <div className="mb-3 flex justify-between items-center"><span className="text-sm text-slate-500">Amount Paid</span><span className="text-lg font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Receipt No.</span><span className="font-mono text-sm text-slate-900">{payment.receiptNumber}</span></div>
          </div>
          <Button className="w-full" onClick={() => navigate('/student/learning')}>Go to Learning</Button>
        </div>
      </div>
    );
  }

  if (payment && payment.status === 'refunded') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <EmptyState
          icon={<Landmark size={22} />}
          title="Payment Refunded"
          description="This payment has been refunded, so the access it granted has been revoked. Select the track again if you would like to re-enroll."
          action={
            <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800">Select a Track</Link>
          }
        />
      </div>
    );
  }

  if (payment && expired) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <EmptyState
          icon={<Clock size={22} />}
          title="Payment Time Limit Expired"
          description="This payment was not completed within the time limit, so it has been marked unsuccessful. No certificate or documents are available for it. Select the track again to start a new payment."
          action={
            <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800">Select a Track Again</Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <CreditCard size={28} />
            </div>
            <h2 className="text-xl font-bold">Complete Payment</h2>
            <p className="mt-1 text-sm text-slate-300">Secure payment via Razorpay</p>
          </div>
          <div className="p-6">
            <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-3 flex justify-between items-center"><span className="text-sm text-slate-500">Program</span><span className="text-sm font-medium text-slate-900">{payment.internshipTitle}</span></div>
              <div className="mb-3 flex justify-between items-center"><span className="text-sm text-slate-500">Receipt No.</span><span className="font-mono text-sm text-slate-900">{payment.receiptNumber}</span></div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-3"><span className="font-semibold text-slate-900">Total Amount</span><span className="text-2xl font-bold text-slate-900">₹{payment.amount.toLocaleString()}</span></div>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-slate-900">Payment Method</p>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500 bg-emerald-50/60 p-4 ring-1 ring-emerald-500/40">
                <Landmark size={18} className="text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">Razorpay</p>
                  <p className="text-xs text-slate-500">UPI · Cards · Netbanking</p>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600" aria-hidden="true">
                  <Check size={13} className="text-white" />
                </span>
              </div>
            </div>

            {timeLeft !== null && (
              <p className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                <Clock size={13} className="shrink-0" />
                Complete payment within{' '}
                <span className="font-mono font-semibold">
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
                {' '}or this payment expires
              </p>
            )}

            <Button className="w-full" loading={processing} onClick={handlePay} icon={!processing ? <ShieldCheck size={15} /> : undefined}>
              {processing ? (confirming ? 'Confirming your payment…' : 'Processing...') : `Pay ₹${payment.amount.toLocaleString()}`}
            </Button>
            <p className="mt-4 text-center text-xs text-slate-500">Payments are processed securely by Razorpay. Your payment details are never stored on our servers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
