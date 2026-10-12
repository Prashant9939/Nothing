import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { ContactMessage, PayoutRequest } from '../../api';
import { usePopup } from '../../context/PopupContext';
import { InboxIcon, RefreshCwIcon, MailIcon, PhoneIcon, ReplyIcon, TrashIcon } from '@animateicons/react/lucide';

const fmtMoney = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const payoutStatusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const priorityTag: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const formatDate = (iso: string) => {
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const SUBJECT_LABELS: Record<string, string> = {
  general: 'General Inquiry',
  program: 'Program Information',
  payment: 'Payment Issue',
  certificate: 'Certificate Verification',
  technical: 'Technical Support',
  partnership: 'Partnership Inquiry',
  other: 'Other',
};

const subjectLabel = (subject: string) =>
  SUBJECT_LABELS[subject] || subject || 'No Subject';

export default function AdminIssues() {
  const popup = usePopup();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const [msgs, reqs] = await Promise.all([
        adminApi.getContactMessages(),
        adminApi.getPayoutRequests(),
      ]);
      setMessages(msgs.data.messages);
      setUnread(msgs.data.unread);
      setPayouts(reqs.data.requests);
    } catch {
      popup.error('Could not load messages. Please try again.', 'Load Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps, react/set-state-in-effect

  const toggleStatus = async (m: ContactMessage) => {
    const next = m.status === 'new' ? 'read' : 'new';
    setBusyId(m.id);
    try {
      await adminApi.updateContactMessageStatus(m.id, next);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: next } : x)));
      setUnread((prev) => prev + (next === 'new' ? 1 : -1));
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the message.', 'Update Failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (m: ContactMessage) => {
    const ok = await popup.confirm(`Delete message from "${m.name}"? This cannot be undone.`, {
      title: 'Delete Message',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setBusyId(m.id);
    try {
      const res = await adminApi.deleteContactMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (m.status === 'new') setUnread((prev) => Math.max(0, prev - 1));
      popup.success(res.data.message || 'Message deleted.', 'Message Deleted');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not delete the message.', 'Delete Failed');
    } finally {
      setBusyId(null);
    }
  };

  const pendingPayouts = payouts.filter((r) => r.status === 'pending').length;

  const updatePayout = async (id: number, patch: { status?: PayoutRequest['status']; priority?: PayoutRequest['priority'] }) => {
    setBusyId(id);
    try {
      const res = await adminApi.updatePayoutRequest(id, patch);
      setPayouts((prev) => prev.map((r) => (r.id === id ? { ...r, ...res.data.request } : r)));
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the payout request.', 'Update Failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  const visible = filter === 'new' ? messages.filter((m) => m.status === 'new') : messages;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-1">
            {messages.length} message{messages.length === 1 ? '' : 's'} from the Contact page
            {unread > 0 && <span className="text-blue-600 font-medium"> · {unread} new</span>}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCwIcon size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
        {([['all', 'All'], ['new', 'New only']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key ? 'bg-slate-800 text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Payout requests — partners asking for a commission cash-out */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Payout Requests</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Partners requesting a payout of their earned commission
              {pendingPayouts > 0 && <span className="text-amber-600 font-medium"> · {pendingPayouts} pending</span>}
            </p>
          </div>
        </div>
        {payouts.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No payout requests yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payouts.map((r) => (
              <div key={r.id} className={`p-5 flex flex-wrap items-start justify-between gap-3 ${r.status === 'pending' ? 'bg-amber-50/40' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {r.partnerName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                      {Number(r.commissionPercent || 0)}% commission
                    </span>
                    <select
                      value={r.priority}
                      onChange={(e) => updatePayout(r.id, { priority: e.target.value as PayoutRequest['priority'] })}
                      disabled={busyId === r.id}
                      title="Set priority"
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide cursor-pointer focus:outline-none ${priorityTag[r.priority] || priorityTag.normal}`}
                    >
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${payoutStatusBadge[r.status] || ''}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{r.email}</span>
                    {r.upiId && (
                      <span className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                        UPI: {r.upiId}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.note && <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-line">{r.note}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base font-bold text-gray-900 mr-1">{fmtMoney(r.amount)}</span>
                  {r.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => updatePayout(r.id, { status: 'approved' })}
                        disabled={busyId === r.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updatePayout(r.id, { status: 'rejected' })}
                        disabled={busyId === r.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => updatePayout(r.id, { status: 'pending' })}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        {visible.length === 0 ? (
          <div className="p-14 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <InboxIcon size={22} className="text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              {filter === 'new' ? 'No new messages' : 'No messages yet'}
            </p>
            <p className="text-xs text-gray-500 max-w-xs">
              Messages submitted through the Contact page will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map((m) => (
              <div key={m.id} className={`p-5 ${m.status === 'new' ? 'bg-blue-50/40' : ''}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.status === 'new' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      <span className={`text-sm text-gray-900 ${m.status === 'new' ? 'font-bold' : 'font-semibold'}`}>
                        {m.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                        {subjectLabel(m.subject)}
                      </span>
                      {m.status === 'new' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-semibold uppercase tracking-wide">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${subjectLabel(m.subject)}`)}`}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-slate-900"
                      >
                        <MailIcon size={12} />
                        {m.email}
                      </a>
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-slate-900">
                          <PhoneIcon size={12} />
                          {m.phone}
                        </a>
                      )}
                      <span className="text-xs text-gray-500">{formatDate(m.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${subjectLabel(m.subject)}`)}`}
                      title="Reply by email"
                      className="p-2 rounded-lg text-slate-500 hover:bg-gray-100 hover:text-slate-800 transition-colors"
                    >
                      <ReplyIcon size={15} />
                    </a>
                    <button
                      onClick={() => { void toggleStatus(m); }}
                      disabled={busyId === m.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Mark as {m.status === 'new' ? 'read' : 'new'}
                    </button>
                    <button
                      onClick={() => { void remove(m); }}
                      disabled={busyId === m.id}
                      title="Delete message"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mt-3 whitespace-pre-line leading-relaxed">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
