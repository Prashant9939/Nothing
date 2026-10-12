import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { partnerApi } from '../../api';
import type { CommissionSummary } from '../../api';
import { usePopup } from '../../context/PopupContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

const fmtMoney = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
};

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all';

// "Commission & Payout" quick action: shows the partner their commission
// terms and lets them request a payout of the available amount. Payout
// requests are triaged by the admin in the Issues panel.
export default function CommissionModal({ open, onClose }: Props) {
  const popup = usePopup();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    partnerApi.getCommission()
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load your commission details.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!summary) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      popup.error('Enter a valid payout amount', 'Invalid Amount');
      return;
    }
    if (value > summary.available) {
      popup.error(`Amount exceeds your available commission of ${fmtMoney(summary.available)}`, 'Invalid Amount');
      return;
    }
    const upiId = upi.trim();
    if (!upiId || !/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,64}$/.test(upiId)) {
      popup.error('Enter a valid UPI ID (e.g. yourname@upi or 9876543210@okbank)', 'Invalid UPI ID');
      return;
    }
    setSubmitting(true);
    try {
      const res = await partnerApi.requestPayout({ amount: value, upiId, note: note.trim() });
      popup.success(res.data.message, 'Payout Requested');
      setAmount('');
      setUpi('');
      setNote('');
      load();
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not submit the payout request.', 'Request Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !submitting && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Commission & Payout</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your earned commission and payout requests</p>
          </div>
          <button onClick={() => !submitting && onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>
              <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          ) : summary ? (
            <div className="p-6 space-y-5">
              {/* Summary tiles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <div className="text-lg font-bold text-orange-600">{summary.commissionPercent}%</div>
                  <div className="text-xs text-orange-700/70 mt-0.5">Commission rate</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-lg font-bold text-gray-900">{fmtMoney(summary.earned)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total earned</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-lg font-bold text-gray-900">{fmtMoney(summary.requested)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Requested (pending + approved)</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="text-lg font-bold text-emerald-600">{fmtMoney(summary.available)}</div>
                  <div className="text-xs text-emerald-700/70 mt-0.5">Available to request</div>
                </div>
              </div>

              {/* Request form */}
              {summary.available > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-3 border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Request a Payout</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                      <input
                        type="number" min="1" step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={summary.available.toFixed(2)}
                        className={`${inputCls} pl-7`}
                        aria-label="Payout amount"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Submitting…' : 'Request Payout'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    placeholder="UPI ID * (e.g. yourname@upi or 9876543210@okbank)"
                    maxLength={100}
                    className={inputCls}
                    aria-label="UPI ID"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note for the admin (optional)"
                    maxLength={500}
                    className={inputCls}
                  />
                  <p className="text-xs text-gray-400">Your request is sent to the admin for review. You will see its status below.</p>
                </form>
              ) : (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
                  No commission available to cash out right now.
                </div>
              )}

              {/* Request history */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Payout Requests</p>
                {summary.requests.length === 0 ? (
                  <p className="text-sm text-gray-400">No payout requests yet.</p>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                    {summary.requests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{fmtMoney(r.amount)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${statusBadge[r.status] || ''}`}>
                              {r.status}
                            </span>
                          </div>
                          {r.note && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.note}</p>}
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {formatDate(r.createdAt)}{r.upiId ? ` · UPI: ${r.upiId}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
