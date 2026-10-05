import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api';
import type { Enrollment, Payment } from '../../api';
import NewRegistrationModal from '../../components/admin/NewRegistrationModal';
import { UsersIcon, BookOpenIcon, TrendingUpIcon, DollarSignIcon, ClockIcon, ClipboardIcon, StarIcon, ActivityIcon, UserPlusIcon } from "@animateicons/react/lucide";

interface DashboardStats { totalStudents: number; totalInternships: number; totalEnrollments: number; totalRevenue: number; pendingPayments: number; completedExams: number; certificatesIssued: number; activeStudents: number; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReg, setShowNewReg] = useState(false);

  const load = () => { adminApi.getDashboard().then((res) => { setStats(res.data.stats); setRecentEnrollments(res.data.recentEnrollments); setRecentPayments(res.data.recentPayments); setLoading(false); }).catch(() => setLoading(false)); };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  const statCards = [
    { label: 'Students', value: stats?.totalStudents || 0, icon: <UsersIcon size={18} />, color: 'text-slate-700 bg-slate-100' },
    { label: 'Internships', value: stats?.totalInternships || 0, icon: <BookOpenIcon size={18} />, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Enrollments', value: stats?.totalEnrollments || 0, icon: <TrendingUpIcon size={18} />, color: 'text-blue-700 bg-blue-50' },
    { label: 'Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: <DollarSignIcon size={18} />, color: 'text-slate-700 bg-slate-100' },
    { label: 'Pending', value: stats?.pendingPayments || 0, icon: <ClockIcon size={18} />, color: 'text-slate-900 bg-slate-100' },
    { label: 'Exams Passed', value: stats?.completedExams || 0, icon: <ClipboardIcon size={18} />, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Certificates', value: stats?.certificatesIssued || 0, icon: <StarIcon size={18} />, color: 'text-slate-700 bg-slate-100' },
    { label: 'Active Now', value: stats?.activeStudents || 0, icon: <ActivityIcon size={18} />, color: 'text-blue-700 bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner - 3D dark */}
      <div className="bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a2332] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/3 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/3 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-white/65 text-xs font-medium mb-1">Admin Panel</p>
            <h1 className="text-xl sm:text-2xl font-bold drop-shadow-lg">Welcome back, {user?.firstName}</h1>
            <p className="text-white/65 text-sm mt-1">Here's what's happening across your platform today.</p>
          </div>
          <button
            onClick={() => setShowNewReg(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5"
          >
            <UserPlusIcon size={16} />
            New Registration
          </button>
        </div>
      </div>

      {/* Stats Grid - 3D cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}>{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity - 3D panels */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Enrollments</h3>
            <span className="text-xs text-gray-500">{recentEnrollments.length} total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentEnrollments.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
                    {e.firstName?.[0]}{e.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.firstName} {e.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{e.internshipTitle}</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${e.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : e.status === 'completed' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Payments</h3>
            <span className="text-xs text-gray-500">{recentPayments.length} total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
                    ₹
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">₹{p.amount.toLocaleString()} • {p.internshipTitle}</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : p.status === 'pending' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>{p.status}</span>
              </div>
            ))}
            </div>
          </div>
        </div>

      <NewRegistrationModal open={showNewReg} onClose={() => setShowNewReg(false)} onCreated={load} />
    </div>
  );
}
