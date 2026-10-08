import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../api';
import type { PartnerListItem } from '../../api';
import { usePopup } from '../../context/PopupContext';
import NewPartnerModal from '../../components/admin/NewPartnerModal';

const fmtMoney = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const popup = usePopup();

  const load = () => {
    adminApi.getPartners()
      .then((res) => setPartners(res.data.partners))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) =>
      `${p.partnerName} ${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q)
    );
  }, [partners, query]);

  const totals = useMemo(() => ({
    students: partners.reduce((n, p) => n + p.students, 0),
    revenue: partners.reduce((n, p) => n + p.paidAmount, 0),
    pending: partners.reduce((n, p) => n + p.pendingAmount, 0),
    documents: partners.reduce((n, p) => n + p.documents, 0),
  }), [partners]);

  if (loading) {
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
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors"
        >
          <Plus size={16} />
          Add Partner
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <th className="text-left p-4 font-medium text-gray-500">Pending</th>
                  <th className="text-left p-4 font-medium text-gray-500">Documents</th>
                  <th className="text-left p-4 font-medium text-gray-500">Last Activity</th>
                  <th className="text-left p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
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
      </div>

      <NewPartnerModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={load}
      />
    </div>
  );
}
