import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { adminApi } from '../../api';
import type { PartnerInterest, PartnerListItem } from '../../api';
import { usePopup } from '../../context/PopupContext';
import NewPartnerModal from '../../components/admin/NewPartnerModal';
import Pagination, { PAGE_SIZE } from '../../components/admin/Pagination';

const fmtMoney = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Commission payouts carry decimals (5% of ₹199 = ₹9.95) — show them exactly.
const fmtCommission = (pct: number, amount: number) =>
  `${Number(pct || 0)}% · ₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Status pill for an interest application.
const statusChip = (s: PartnerInterest['status']) =>
  s === 'approved'
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : s === 'rejected'
      ? 'bg-red-50 text-red-600 border-red-100'
      : 'bg-amber-50 text-amber-600 border-amber-100';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Newest of the partner's recorded events — powers the "Last activity" column.
const lastActivity = (p: PartnerListItem) =>
  [p.lastLogin, p.lastRegistration].filter(Boolean).sort().pop() || p.createdAt;

export default function AdminPartners() {
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  // "New Partners" tab: applications submitted from the public /partners page.
  const [tab, setTab] = useState<'new' | 'partners'>('partners');
  const [requests, setRequests] = useState<PartnerInterest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqFilter, setReqFilter] = useState<'all' | PartnerInterest['status']>('all');
  // Commission ceiling from Admin → Settings (default 10%).
  const [maxCommission, setMaxCommission] = useState(10);
  // Set when the modal was opened from an application, so creating the
  // partner also marks that application approved.
  const [prefill, setPrefill] = useState<{ partnerName: string; fullName: string; email: string; phone: string } | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const navigate = useNavigate();
  const popup = usePopup();

  const load = () => {
    adminApi.getPartners()
      .then((res) => setPartners(res.data.partners))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadRequests = (isFirst = false) => {
    adminApi.getPartnerInterest()
      .then((res) => {
        setRequests(res.data.requests);
        setPendingCount(res.data.pending);
        // Surface new applications straight away on the first load.
        if (isFirst && res.data.pending > 0) setTab('new');
      })
      .catch(() => {})
      .finally(() => setReqLoading(false));
  };

  useEffect(() => {
    load();
    loadRequests(true);
    adminApi.getSettings()
      .then((res) => {
        const cap = Number(res.data?.settings?.maxCommissionPercent);
        if (Number.isFinite(cap)) setMaxCommission(cap);
      })
      .catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [query]);

  const removePartner = async (p: PartnerListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await popup.confirm(
      `Delete ${p.partnerName || p.email}? Their registered students stay in the system, but this partner will lose access permanently.`,
      { title: 'Delete Partner', confirmLabel: 'Delete' }
    );
    if (!ok) return;
    try {
      await adminApi.deletePartner(p.id);
      setPartners((prev) => prev.filter((x) => x.id !== p.id));
      popup.success(`${p.partnerName || p.email} was deleted.`, 'Partner Deleted');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not delete this partner. Please try again.', 'Delete Failed');
    }
  };

  // Reject an application (approve happens through the create-partner modal,
  // which is what finally sets the status to approved).
  const setRequestStatus = async (r: PartnerInterest, status: PartnerInterest['status']) => {
    if (status === 'rejected') {
      const ok = await popup.confirm(
        `Reject ${r.name}'s application from ${r.organization || 'their organisation'}?`,
        { title: 'Reject Application', confirmLabel: 'Reject' }
      );
      if (!ok) return;
    }
    try {
      await adminApi.updatePartnerInterest(r.id, { status });
      popup.success(
        status === 'rejected' ? 'Application marked as rejected.' : 'Application moved back to pending.',
        'Application Updated'
      );
      loadRequests();
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the application.', 'Update Failed');
    }
  };

  // Open the create-partner modal with the applicant's details filled in.
  const startApprove = (r: PartnerInterest) => {
    setPrefill({
      partnerName: r.organization || '',
      fullName: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
    });
    setApprovingId(r.id);
    setShowCreate(true);
  };

  // Runs only after a partner account was actually created.
  const handleCreated = async () => {
    const id = approvingId;
    setApprovingId(null);
    setPrefill(null);
    if (id != null) {
      try { await adminApi.updatePartnerInterest(id, { status: 'approved' }); } catch { /* non-fatal: partner exists */ }
      loadRequests();
    }
    load();
  };

  const closeCreate = () => {
    setShowCreate(false);
    setApprovingId(null);
    setPrefill(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) =>
      `${p.partnerName} ${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q)
    );
  }, [partners, query]);

  const visibleRequests = useMemo(
    () => (reqFilter === 'all' ? requests : requests.filter((r) => r.status === reqFilter)),
    [requests, reqFilter]
  );

  // Client-side pagination: partners stay a small, fully-loaded set (the stats
  // tiles above always cover every partner), so we just slice the filtered list.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totals = useMemo(() => ({
    students: partners.reduce((n, p) => n + p.students, 0),
    revenue: partners.reduce((n, p) => n + p.paidAmount, 0),
    commission: partners.reduce((n, p) => n + Number(p.commissionAmount || 0), 0),
    pending: partners.reduce((n, p) => n + p.pendingAmount, 0),
    documents: partners.reduce((n, p) => n + p.documents, 0),
  }), [partners]);

  if (loading || reqLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Partners', value: partners.length },
    { label: 'Students Referred', value: totals.students },
    { label: 'Paid Revenue', value: fmtMoney(totals.revenue) },
    { label: 'Commission Payout', value: fmtMoney(totals.commission) },
    { label: 'Pending Amount', value: fmtMoney(totals.pending) },
    { label: 'Documents', value: totals.documents },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Track every partner's referrals, payments and activity</p>
        </div>
        <button
          onClick={() => { setPrefill(null); setApprovingId(null); setShowCreate(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors"
        >
          <Plus size={16} />
          Add Partner
        </button>
      </div>

      {/* Applications from the public /partners page vs partner accounts */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { key: 'new', label: 'New Partners', count: pendingCount },
          { key: 'partners', label: 'Partners', count: partners.length },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'text-orange-600 border-orange-500'
                : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            {t.label}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                t.key === 'new' && t.count > 0
                  ? 'bg-orange-100 text-orange-700 font-semibold'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'partners' && (
      <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search partners..."
          className="w-full max-w-sm px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
        />
        <span className="text-xs text-gray-400 shrink-0">{filtered.length} of {partners.length}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              {partners.length === 0
                ? 'No partners yet. Partner accounts appear here once created.'
                : 'No partners match your search.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-500">Partner</th>
                  <th className="text-left p-4 font-medium text-gray-500">Status</th>
                  <th className="text-left p-4 font-medium text-gray-500">Students</th>
                  <th className="text-left p-4 font-medium text-gray-500">Registrations</th>
                  <th className="text-left p-4 font-medium text-gray-500">Paid</th>
                  <th className="text-left p-4 font-medium text-gray-500">Commission</th>
                  <th className="text-left p-4 font-medium text-gray-500">Pending</th>
                  <th className="text-left p-4 font-medium text-gray-500">Documents</th>
                  <th className="text-left p-4 font-medium text-gray-500">Last Activity</th>
                  <th className="text-left p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/partners/${p.id}`)}
                    className="border-t border-gray-100 hover:bg-orange-50/40 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
                          {p.firstName?.[0]}{p.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{p.partnerName || `${p.firstName} ${p.lastName}`}</div>
                          <div className="text-xs text-gray-500 truncate">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.accountStatus === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {p.accountStatus}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">{p.students}</td>
                    <td className="p-4 text-gray-600">{p.registrations}</td>
                    <td className="p-4 font-medium text-gray-900">{fmtMoney(p.paidAmount)}</td>
                    <td className="p-4 font-medium text-orange-600">
                      {p.commissionPercent > 0 ? fmtCommission(p.commissionPercent, p.commissionAmount) : '—'}
                    </td>
                    <td className="p-4 text-gray-600">{fmtMoney(p.pendingAmount)}</td>
                    <td className="p-4 text-gray-600">{p.documents}</td>
                    <td className="p-4 text-xs text-gray-500">{formatDate(lastActivity(p))}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/partners/${p.id}`); }}
                          className="text-orange-600 hover:text-orange-700 text-xs font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => removePartner(p, e)}
                          className="text-red-500 hover:text-red-600 text-xs font-medium inline-flex items-center gap-1"
                          title="Delete partner account"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={safePage} pages={totalPages} total={filtered.length} noun="partners" onPage={setPage} />
      </div>
      </>
      )}

      {/* Applications submitted from the public /partners page */}
      {tab === 'new' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReqFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    reqFilter === f
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f}
                  <span className="ml-1.5 opacity-70">
                    {f === 'all' ? requests.length : requests.filter((r) => r.status === f).length}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{visibleRequests.length} of {requests.length}</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {visibleRequests.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-400">
                  {requests.length === 0
                    ? 'No applications yet. Interest forms submitted on the /partners page appear here.'
                    : 'No applications match this filter.'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-500">Applicant</th>
                      <th className="text-left p-4 font-medium text-gray-500">Organisation</th>
                      <th className="text-left p-4 font-medium text-gray-500">Contact</th>
                      <th className="text-left p-4 font-medium text-gray-500">About</th>
                      <th className="text-left p-4 font-medium text-gray-500">Applied</th>
                      <th className="text-left p-4 font-medium text-gray-500">Status</th>
                      <th className="text-left p-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100 hover:bg-orange-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {(r.name || '?')[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">{r.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[14rem]" title={r.email}>{r.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{r.organization || '—'}</div>
                          {r.city && <div className="text-xs text-gray-500">{r.city}</div>}
                        </td>
                        <td className="p-4 text-gray-600 whitespace-nowrap">{r.phone || '—'}</td>
                        <td className="p-4">
                          <p className="text-xs text-gray-500 truncate max-w-[18rem]" title={r.message}>
                            {r.message || '—'}
                          </p>
                        </td>
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border whitespace-nowrap ${statusChip(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            {r.status !== 'approved' && (
                              <button
                                onClick={() => startApprove(r)}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-medium inline-flex items-center gap-1"
                                title="Approve — opens the create-partner form pre-filled with these details"
                              >
                                <Check size={13} />
                                Approve
                              </button>
                            )}
                            {r.status !== 'rejected' && (
                              <button
                                onClick={() => setRequestStatus(r, 'rejected')}
                                className="text-red-500 hover:text-red-600 text-xs font-medium inline-flex items-center gap-1"
                              >
                                <X size={13} />
                                Reject
                              </button>
                            )}
                            {r.status === 'rejected' && (
                              <button
                                onClick={() => setRequestStatus(r, 'pending')}
                                className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <NewPartnerModal
        open={showCreate}
        onClose={closeCreate}
        onCreated={handleCreated}
        prefill={prefill ?? undefined}
        maxCommission={maxCommission}
      />
    </div>
  );
}
