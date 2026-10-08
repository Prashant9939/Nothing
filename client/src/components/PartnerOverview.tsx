import { useMemo, useState } from 'react';
import type { PartnerDetail, PartnerStudentRow } from '../api';
import { XIcon } from '@animateicons/react/lucide';
import { Download, Search } from 'lucide-react';
import { usePopup } from '../context/PopupContext';
import { downloadFile } from '../utils/downloadFile';
import StudentDetailModal from './partner/StudentDetailModal';

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

const enrollmentLabel = (status: string) => (status === 'none' ? 'not enrolled' : status);

const activityDot: Record<string, string> = {
  login: 'bg-slate-400',
  registration: 'bg-blue-500',
  payment: 'bg-emerald-500',
  certificate: 'bg-amber-500',
};

type TabKey = 'students' | 'payments' | 'documents' | 'activity';

interface Props {
  data: PartnerDetail;
  // The partner's own portal hides the Activity timeline; the admin partner
  // detail screen keeps it.
  showActivity?: boolean;
}

export default function PartnerOverview({ data, showActivity = true }: Props) {
  const { kpis, students, payments, documents, activity } = data;
  const popup = usePopup();
  const [tab, setTab] = useState<TabKey>('students');
  const [selected, setSelected] = useState<PartnerStudentRow | null>(null);
  const [focusDocs, setFocusDocs] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Students tab search + filters
  const [query, setQuery] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [enrollFilter, setEnrollFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  const programs = useMemo(
    () => Array.from(new Set(students.map((s) => s.programTitle).filter(Boolean))).sort(),
    [students],
  );

  const enrollmentOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.enrollmentStatus || 'none'))).sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const name = `${s.studentFirstName} ${s.studentLastName}`.toLowerCase();
        if (!name.includes(q) && !s.studentEmail.toLowerCase().includes(q)) return false;
      }
      if (payFilter !== 'all' && (s.paymentStatus || 'unpaid') !== payFilter) return false;
      if (enrollFilter !== 'all' && (s.enrollmentStatus || 'none') !== enrollFilter) return false;
      if (programFilter !== 'all' && s.programTitle !== programFilter) return false;
      return true;
    });
  }, [students, query, payFilter, enrollFilter, programFilter]);

  const filtersActive = !!query || payFilter !== 'all' || enrollFilter !== 'all' || programFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setPayFilter('all');
    setEnrollFilter('all');
    setProgramFilter('all');
  };

  const selectClass =
    'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400';

  // Distinct students with an ongoing/completed enrollment (kpis.activeStudents
  // counts enrollments, which can exceed the student count on multi-track users).
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

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'students', label: 'Students', count: students.length },
    { key: 'payments', label: 'Payments', count: payments.length },
    { key: 'documents', label: 'Documents', count: documents.length },
    ...(showActivity ? [{ key: 'activity' as TabKey, label: 'Activity', count: activity.length }] : []),
  ];

  const emptyBox = (text: string) => (
    <div className="p-10 text-center text-sm text-gray-400">{text}</div>
  );

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

  const openStudent = (row: PartnerStudentRow, docs = false) => {
    setSelected(row);
    setFocusDocs(docs);
  };

  return (
    <div className="space-y-6">
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className={`ml-2 text-xs ${tab === t.key ? 'text-white/60' : 'text-gray-400'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Students */}
      {tab === 'students' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Search + filters */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by student name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              />
            </div>
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className={selectClass} aria-label="Filter by payment status">
              <option value="all">All payments</option>
              <option value="completed">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select value={enrollFilter} onChange={(e) => setEnrollFilter(e.target.value)} className={selectClass} aria-label="Filter by enrollment status">
              <option value="all">All enrollments</option>
              {enrollmentOptions.map((st) => (
                <option key={st} value={st}>{enrollmentLabel(st)}</option>
              ))}
            </select>
            {programs.length > 0 && (
              <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className={selectClass} aria-label="Filter by program">
                <option value="all">All programs</option>
                {programs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                <XIcon size={12} />
                Clear
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
              {filteredStudents.length} of {students.length} student{students.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="overflow-x-auto">
            {students.length === 0 ? emptyBox('No students referred by this partner yet.') : filteredStudents.length === 0 ? (
              emptyBox('No students match your search or filters.')
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-500">Student</th>
                    <th className="text-left p-4 font-medium text-gray-500">Program</th>
                    <th className="text-left p-4 font-medium text-gray-500">Enrolled</th>
                    <th className="text-left p-4 font-medium text-gray-500">Progress</th>
                    <th className="text-left p-4 font-medium text-gray-500">Payment</th>
                    <th className="text-left p-4 font-medium text-gray-500">Certificate</th>
                    <th className="text-left p-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={`${s.studentId}-${s.enrollmentId ?? 'none'}`} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{s.studentFirstName} {s.studentLastName}</div>
                        <div className="text-xs text-gray-500">{s.studentEmail}</div>
                      </td>
                      <td className="p-4 text-gray-500">{s.programTitle || '—'}</td>
                      <td className="p-4 text-gray-500 text-xs">{formatDate(s.enrolledAt)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.progress || 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{s.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadge(s.paymentStatus)}`}>
                          {s.paymentStatus || 'unpaid'}{s.paymentAmount != null ? ` · ${fmtMoney(s.paymentAmount)}` : ''}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">{s.certificateId || '—'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openStudent(s)} className="text-orange-600 hover:text-orange-700 text-xs font-medium">View</button>
                          <button onClick={() => openStudent(s, true)} className="text-slate-700 hover:text-slate-900 text-xs font-medium">Documents</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {payments.length === 0 ? emptyBox('No payments recorded for this partner yet.') : (
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
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {documents.length === 0 ? emptyBox('No documents generated for this partner yet.') : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-500">Student</th>
                    <th className="text-left p-4 font-medium text-gray-500">Program</th>
                    <th className="text-left p-4 font-medium text-gray-500">Offer Letter</th>
                    <th className="text-left p-4 font-medium text-gray-500">Project Report</th>
                    <th className="text-left p-4 font-medium text-gray-500">Attendance</th>
                    <th className="text-left p-4 font-medium text-gray-500">Certificate</th>
                    <th className="text-left p-4 font-medium text-gray-500">Status</th>
                    <th className="text-left p-4 font-medium text-gray-500">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => {
                    const docStudent = students.find((s) => s.studentId === d.studentId);
                    return (
                      <tr key={d.enrollmentId} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{d.studentFirstName} {d.studentLastName}</td>
                        <td className="p-4 text-gray-500">{d.programTitle}</td>
                        <td className="p-4 text-xs font-mono text-gray-600">{d.offerNo || '—'}</td>
                        <td className="p-4 text-xs font-mono text-gray-600">{d.reportNo || '—'}</td>
                        <td className="p-4 text-xs font-mono text-gray-600">{d.attendanceNo || '—'}</td>
                        <td className="p-4 text-xs font-mono text-gray-600">{d.certificateId || '—'}{d.grade ? ` · ${d.grade}` : ''}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${d.paid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {d.paid ? 'verified' : 'unpaid'}
                          </span>
                        </td>
                        <td className="p-4">
                          {docStudent ? (
                            <button
                              onClick={() => openStudent(docStudent, true)}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              View Documents
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      {showActivity && tab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          {activity.length === 0 ? emptyBox('No activity recorded yet.') : (
            <ol className="relative border-l border-gray-200 ml-2 space-y-5">
              {activity.map((a, i) => (
                <li key={`${a.type}-${a.at}-${i}`} className="ml-4">
                  <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ring-4 ring-white ${activityDot[a.type] || 'bg-slate-400'}`} />
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-gray-900">{a.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">{a.type}</span>
                  </div>
                  {a.detail && <div className="text-xs text-gray-500 mt-0.5">{a.detail}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">{formatDate(a.at)}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Student detail modal */}
      {selected && (
        <StudentDetailModal
          student={selected}
          students={students}
          payments={payments}
          focusDocuments={focusDocs}
          onClose={() => {
            setSelected(null);
            setFocusDocs(false);
          }}
        />
      )}
    </div>
  );
}
