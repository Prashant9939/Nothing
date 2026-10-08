import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlusIcon } from '@animateicons/react/lucide';
import { Search, X } from 'lucide-react';
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

const enrollmentLabel = (status: string) => (status === 'none' ? 'not enrolled' : status);

const selectClass =
  'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400';

const EMPTY_ROWS: PartnerStudentRow[] = [];

export default function PartnerStudents() {
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [selected, setSelected] = useState<PartnerStudentRow | null>(null);
  const [focusDocs, setFocusDocs] = useState(false);

  const [query, setQuery] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [enrollFilter, setEnrollFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  const load = useCallback(() => {
    partnerApi.getDashboard()
      .then((res) => setDetail(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load students.');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const students = detail?.students ?? EMPTY_ROWS;
  const payments = detail?.payments ?? [];
  const suspended = detail?.partner.accountStatus === 'suspended';

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

  const openStudent = (row: PartnerStudentRow, docs = false) => {
    setSelected(row);
    setFocusDocs(docs);
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Students unavailable</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">All students referred and registered under your Partner ID</p>
        </div>
        {!suspended && (
          <button
            onClick={() => setShowRegister(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 shadow-[0_4px_16px_rgba(249,115,22,0.35)] transition-all"
          >
            <UserPlusIcon size={15} />
            Register Student
          </button>
        )}
      </div>

      {/* Table card */}
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
              <X size={12} />
              Clear
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
            {filteredStudents.length} of {students.length} student{students.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No students referred yet — register your first student to get started.</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No students match your search or filters.</div>
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
