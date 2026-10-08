import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { User } from '../../api';

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { adminApi.getAdmins().then((res) => { setAdmins(res.data.users); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = admins.filter(a => `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Admin Accounts</h1><p className="text-sm text-gray-500 mt-1">{admins.length} admin accounts</p></div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search admins..." className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600 transition-all" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Name</th>
                <th className="text-left p-4 font-medium text-gray-500">Email</th>
                <th className="text-left p-4 font-medium text-gray-500">Phone</th>
                <th className="text-left p-4 font-medium text-gray-500">Role</th>
                <th className="text-left p-4 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{a.firstName} {a.lastName}</td>
                  <td className="p-4 text-gray-500">{a.email}</td>
                  <td className="p-4 text-gray-500">{a.phone || 'N/A'}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Admin
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-gray-500">No admin accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
