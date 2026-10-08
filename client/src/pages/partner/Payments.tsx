import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { partnerApi } from '../../api';
import type { PartnerDetail } from '../../api';
import { downloadFile } from '../../utils/downloadFile';
import { usePopup } from '../../context/PopupContext';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtMoney = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const paymentBadge = (status: string | null) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border border-amber-100';
  if (status === 'failed') return 'bg-red-50 text-red-600 border border-red-100';
  if (status === 'refunded') return 'bg-slate-100 text-slate-700 border border-slate-200';
  return 'bg-gray-50 text-gray-500 border border-gray-200';
};

export default function PartnerPayments() {
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const popup = usePopup();

  const load = useCallback(() => {
    partnerApi.getDashboard()
      .then((res) => setDetail(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load payments.');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const runDownload = async (url: string, filename: string) => {
    setDownloading(filename);
    try {
      await downloadFile(url, filename);
    } catch (err) {
      popup.error((err as Error).message, 'Download Failed');
    } finally {
      setDownloading(null);
    }
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Payments unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const { kpis, payments } = detail;

  const stats = [
    { label: 'Paid Revenue', value: fmtMoney(kpis.paidAmount), sub: `${kpis.paidCount} successful payments` },
    { label: 'Pending Amount', value: fmtMoney(kpis.pendingAmount), sub: 'awaiting payment' },
    { label: 'Total Transactions', value: payments.length, sub: 'all recorded payments' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Every payment tied to your referred registrations</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {payments.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No payments recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-500">Date</th>
                  <th className="text-left p-4 font-medium text-gray-500">Receipt</th>
                  <th className="text-left p-4 font-medium text-gray-500">Student</th>
                  <th className="text-left p-4 font-medium text-gray-500">Program</th>
                  <th className="text-left p-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left p-4 font-medium text-gray-500">Method</th>
                  <th className="text-left p-4 font-medium text-gray-500">Status</th>
                  <th className="text-left p-4 font-medium text-gray-500">Download</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-500 text-xs">{formatDate(p.paidAt || p.createdAt)}</td>
                    <td className="p-4 text-xs font-mono text-gray-600">{p.receiptNumber || '—'}</td>
                    <td className="p-4 font-medium text-gray-900">{p.studentFirstName} {p.studentLastName}</td>
                    <td className="p-4 text-gray-500">{p.programTitle}</td>
                    <td className="p-4 font-medium text-gray-900">{fmtMoney(p.amount)}</td>
                    <td className="p-4 text-gray-500">{p.method}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="p-4">
                      {p.status === 'completed' ? (
                        <button
                          onClick={() => runDownload(`/api/student/download/receipt/${p.id}`, `receipt-${p.receiptNumber || p.id}.pdf`)}
                          disabled={!!downloading}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait"
                        >
                          <Download size={13} />
                          {downloading === `receipt-${p.receiptNumber || p.id}.pdf` ? 'Downloading…' : 'Receipt'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
