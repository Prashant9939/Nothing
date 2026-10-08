import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlusIcon, UsersIcon, FileTextIcon, CreditCardIcon } from '@animateicons/react/lucide';
import { partnerApi } from '../../api';
import type { PartnerDetail, PartnerStudentRow } from '../../api';
import RegisterStudentModal from '../../components/partner/RegisterStudentModal';
import StudentDetailModal from '../../components/partner/StudentDetailModal';

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

export default function PartnerDashboard() {
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [selected, setSelected] = useState<PartnerStudentRow | null>(null);

  const load = useCallback(() => {
    partnerApi.getDashboard()
      .then((res) => setDetail(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load your dashboard.');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <Link to="/" className="inline-block mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all">
            Back to Home
          </Link>
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

  const { partner, kpis, students, payments } = detail;
  const suspended = partner.accountStatus === 'suspended';

  const activeStudentCount = new Set(
    students
      .filter((s) => s.enrollmentStatus === 'active' || s.enrollmentStatus === 'completed')
      .map((s) => s.studentId)
  ).size;

  const stats = [
    { label: 'Students', value: kpis.students, sub: `${activeStudentCount} active` },
    { label: 'Registrations', value: kpis.registrations, sub: 'referred enrollments' },
    { label: 'Paid Revenue', value: fmtMoney(kpis.paidAmount), sub: `${kpis.paidCount} payments` },
    { label: 'Pending Amount', value: fmtMoney(kpis.pendingAmount), sub: 'awaiting payment' },
    { label: 'Documents', value: kpis.documents, sub: `${kpis.certificates} certificates` },
    { label: 'Partner Sign-ins', value: kpis.logins, sub: kpis.lastLogin ? `last: ${formatDate(kpis.lastLogin)}` : 'no sign-ins yet' },
  ];

  const recentStudents = students.slice(0, 5);
  const recentPayments = payments.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a2332] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 shadow-[0_4px_16px_rgba(249,115,22,0.4)]">
            {partner.firstName?.[0]}{partner.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-orange-400">Partner Portal</p>
            <h1 className="text-xl sm:text-2xl font-bold drop-shadow-lg">
              {partner.partnerName || `${partner.firstName} ${partner.lastName}`}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{partner.email} · {partner.phone || 'no phone'}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {!suspended && (
              <button
                onClick={() => setShowRegister(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-[0_4px_16px_rgba(249,115,22,0.35)] transition-all"
              >
                <UserPlusIcon size={15} />
                Register Student
              </button>
            )}
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${suspended ? 'bg-red-500/20 text-red-300 ring-1 ring-red-400/30' : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'}`}>
              {partner.accountStatus}
            </span>
          </div>
        </div>
        {suspended && (
          <p className="mt-4 text-sm text-red-300 bg-red-500/10 ring-1 ring-red-400/20 rounded-xl px-4 py-3">
            Your partner account is suspended. Contact IQIntern support to restore access.
          </p>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent students */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center">
                <UsersIcon size={16} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Recent Students</h3>
                <p className="text-xs text-gray-500">Latest students referred by your institute</p>
              </div>
            </div>
            <Link to="/partner/students" className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              View all
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              No students referred yet — register your first student to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-500">Student</th>
                    <th className="text-left p-4 font-medium text-gray-500">Program</th>
                    <th className="text-left p-4 font-medium text-gray-500 hidden sm:table-cell">Enrolled</th>
                    <th className="text-left p-4 font-medium text-gray-500">Payment</th>
                    <th className="text-left p-4 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={`${s.studentId}-${s.enrollmentId ?? 'none'}`} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{s.studentFirstName} {s.studentLastName}</div>
                        <div className="text-xs text-gray-500">{s.studentEmail}</div>
                      </td>
                      <td className="p-4 text-gray-500">{s.programTitle || '—'}</td>
                      <td className="p-4 text-gray-500 text-xs hidden sm:table-cell">{formatDate(s.enrolledAt)}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadge(s.paymentStatus)}`}>
                          {s.paymentStatus || 'unpaid'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => setSelected(s)} className="text-orange-600 hover:text-orange-700 text-xs font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2.5">
              {!suspended && (
                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-left hover:border-orange-300 hover:bg-orange-50 transition-all group"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
                    <UserPlusIcon size={15} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Register Student</p>
                    <p className="text-xs text-gray-500">Enroll a new student under your Partner ID</p>
                  </div>
                </button>
              )}
              <Link
                to="/partner/documents"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-left hover:border-orange-300 hover:bg-orange-50 transition-all"
              >
                <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileTextIcon size={15} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">View Documents</p>
                  <p className="text-xs text-gray-500">Download offer letters, certificates & more</p>
                </div>
              </Link>
              <Link
                to="/partner/payments"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-left hover:border-orange-300 hover:bg-orange-50 transition-all"
              >
                <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <CreditCardIcon size={15} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Payment History</p>
                  <p className="text-xs text-gray-500">Track paid, pending and refunded amounts</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent payments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Recent Payments</h3>
              <Link to="/partner/payments" className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                View all
              </Link>
            </div>
            {recentPayments.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No payments yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.studentFirstName} {p.studentLastName}</p>
                      <p className="text-xs text-gray-500 truncate">{p.programTitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{fmtMoney(p.amount)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${paymentBadge(p.status)}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RegisterStudentModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onCreated={load}
      />
      {selected && (
        <StudentDetailModal
          student={selected}
          students={students}
          payments={payments}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
