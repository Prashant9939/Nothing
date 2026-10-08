import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../api';
import type { PartnerDetail as PartnerDetailData } from '../../api';
import { usePopup } from '../../context/PopupContext';
import PartnerOverview from '../../components/PartnerOverview';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function AdminPartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const popup = usePopup();
  const [detail, setDetail] = useState<PartnerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi.getPartner(Number(id))
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this partner.'))
      .finally(() => setLoading(false));
  }, [id]);

  const removePartner = async () => {
    if (!detail) return;
    const ok = await popup.confirm(
      `Delete ${detail.partner.partnerName || detail.partner.email}? Their registered students stay in the system, but this partner will lose access permanently.`,
      { title: 'Delete Partner', confirmLabel: 'Delete' }
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await adminApi.deletePartner(detail.partner.id);
      popup.success(`${detail.partner.partnerName || detail.partner.email} was deleted.`, 'Partner Deleted');
      navigate('/admin/partners');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not delete this partner. Please try again.', 'Delete Failed');
      setDeleting(false);
    }
  };

  const toggleStatus = async () => {
    if (!detail) return;
    const suspending = detail.partner.accountStatus === 'active';
    const ok = await popup.confirm(
      suspending
        ? `Suspend ${detail.partner.partnerName}? They will be logged out immediately and lose access until reactivated.`
        : `Activate ${detail.partner.partnerName}? They will be able to sign in again.`,
      { title: suspending ? 'Suspend Partner' : 'Activate Partner', confirmLabel: suspending ? 'Suspend' : 'Activate' }
    );
    if (!ok) return;
    setToggling(true);
    try {
      const res = await adminApi.updatePartnerStatus(detail.partner.id, suspending ? 'suspended' : 'active');
      setDetail({ ...detail, partner: { ...detail.partner, accountStatus: suspending ? 'suspended' : 'active' } });
      popup.success(res.data.message, 'Partner Updated');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the partner status. Please try again.', 'Update Failed');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/admin/partners')} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
          ← Back to Partners
        </button>
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-sm text-gray-500">{error || 'Partner not found'}</p>
        </div>
      </div>
    );
  }

  const { partner } = detail;
  const suspended = partner.accountStatus === 'suspended';

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/partners')} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
        ← Back to Partners
      </button>

      {/* Partner header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-[0_4px_16px_rgba(249,115,22,0.35)]">
          {partner.firstName?.[0]}{partner.lastName?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{partner.partnerName || `${partner.firstName} ${partner.lastName}`}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${suspended ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              {partner.accountStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {partner.email} · {partner.phone || 'no phone'} · Joined {formatDate(partner.createdAt)}
          </p>
        </div>
        <button
          onClick={toggleStatus}
          disabled={toggling}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
            suspended
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_12px_rgba(5,150,105,0.25)]'
              : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
          }`}
        >
          {toggling ? 'Updating...' : suspended ? 'Activate Partner' : 'Suspend Partner'}
        </button>
        <button
          onClick={removePartner}
          disabled={deleting}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 shadow-[0_4px_12px_rgba(220,38,38,0.25)] transition-all disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete Partner'}
        </button>
      </div>

      <PartnerOverview data={detail} />
    </div>
  );
}
