import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { Payment } from '../../api';

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.getPayments().then((res) => { setPayments(res.data.payments); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const updateStatus = async (id: number, status: string) => { await adminApi.updatePaymentStatus(id, status); setPayments(payments.map(p => p.id === id ? { ...p, status } : p)); };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Manage Payments</h1><p className="text-sm text-gray-500 mt-1">{payments.length} total payments</p></div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Receipt</th>
                <th className="text-left p-4 font-medium text-gray-500">Student</th>
                <th className="text-left p-4 font-medium text-gray-500">Program</th>
                <th className="text-left p-4 font-medium text-gray-500">Amount</th>
                <th className="text-left p-4 font-medium text-gray-500">Method</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
                <th className="text-left p-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-xs font-mono text-gray-600">{p.receiptNumber}</td>
                  <td className="p-4 font-medium text-gray-900">{p.firstName} {p.lastName}</td>
                  <td className="p-4 text-gray-500">{p.internshipTitle}</td>
                  <td className="p-4 font-medium text-gray-900">₹{p.amount.toLocaleString()}</td>
                  <td className="p-4 text-gray-500">{p.method}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : p.status === 'pending' ? 'bg-amber-50 text-slate-800 border border-slate-200' : p.status === 'refunded' ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>{p.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {p.status === 'pending' && (<>
                        <button onClick={() => updateStatus(p.id, 'completed')} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Approve</button>
                        <button onClick={() => updateStatus(p.id, 'failed')} className="text-red-500 hover:text-red-600 text-xs font-medium">Reject</button>
                      </>)}
                      {p.status === 'completed' && (<button onClick={() => updateStatus(p.id, 'refunded')} className="text-slate-800 hover:text-slate-900 text-xs font-medium">Refund</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
