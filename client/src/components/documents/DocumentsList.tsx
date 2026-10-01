import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Award, BarChart3, CalendarDays, Check, FileText, FolderOpen, Receipt, Wallet } from 'lucide-react';
import { studentApi } from '../../api';
import type { Enrollment, Payment, Exam, Certificate } from '../../api';
import { usePopup } from '../../context/PopupContext';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState, Button, Card, Badge } from '../ui';
import DocCard from './DocCard';

const primaryLink = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

export default function DocumentsList() {
  const popup = usePopup();
  const { user } = useAuth();
  const studentName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getDashboard().then((res) => {
      const all: Enrollment[] = res.data.enrollments;
      const allPayments: Payment[] = res.data.payments;
      const paidIds = new Set(
        allPayments.filter((p) => p.status === 'completed').map((p) => p.enrollmentId)
      );
      const paid = all.filter((e) => paidIds.has(e.id));
      setHiddenCount(all.length - paid.length);
      setEnrollments(paid);
      setPayments(allPayments);
      setExams(res.data.exams);
      setCertificates(res.data.certificates);
      const first = paid.find((e) => e.status === 'active') || paid[0];
      setSelectedId(first?.id ?? null);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const download = async (url: string, filename: string) => {
    const token = localStorage.getItem('token');
    const finalName = studentName ? `${studentName} - ${filename}` : filename;
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const a = document.createElement('a');
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = finalName;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      popup.error(`Could not download ${finalName}. Please try again.`, 'Download Failed');
      throw err;
    }
  };

  const state = (enrollmentId: number) => {
    const payment = payments.find((p) => p.enrollmentId === enrollmentId);
    const exam = exams.find((e) => e.enrollmentId === enrollmentId);
    const cert = certificates.find((c) => c.enrollmentId === enrollmentId);
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    const isPaid = payment?.status === 'completed';
    const isPassed = exam?.status === 'completed' || enrollment?.status === 'completed' || !!cert;
    return { payment, exam, cert, isPaid, isPassed };
  };

  const availableCount = enrollments.reduce((acc, e) => {
    const s = state(e.id);
    return acc + (s.isPaid ? 2 : 0) + (s.isPassed ? 2 : 0) + (s.cert ? 1 : 0);
  }, 0);
  const pendingPayments = payments.filter((p) => p.status === 'pending').length;
  const inProgress = enrollments.filter((e) => e.status === 'active').length;

  const header = <h1 className="sr-only">Documents</h1>;

  if (loading) return <>{header}<PageLoader label="Loading your documents..." /></>;

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load your documents"
          description="Something went wrong while fetching your data. Check your connection and try again."
          action={<Button variant="primary" onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  if (enrollments.length === 0) {
    if (hiddenCount > 0) {
      // Only an actually-payable (pending) invoice can be linked straight to
      // checkout; failed/expired ones must go through track selection again.
      const pending = payments.find((p) => p.status === 'pending');
      return (
        <div className="space-y-6">
          {header}
          <EmptyState
            icon={<Wallet size={22} />}
            title="Documents Locked"
            description={`Your ${hiddenCount > 1 ? 'programs are' : 'program is'} awaiting payment. Complete the payment to access receipts, offer letters, reports and certificates.`}
            action={
              pending
                ? <Link to={`/student/pay/${pending.id}`} className={primaryLink}>Complete Payment</Link>
                : <Link to="/student/select-track" className={primaryLink}>Select a Track</Link>
            }
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<FolderOpen size={22} />}
          title="No Documents Yet"
          description="Enroll in a program to access your documents."
          action={<Link to="/student/select-track" className={primaryLink}>Select a Track</Link>}
        />
      </div>
    );
  }

  const selected = enrollments.find((e) => e.id === selectedId) || enrollments[0];
  const { payment, cert, isPaid, isPassed } = state(selected.id);
  const completed = selected.status === 'completed';

  return (
    <div className="space-y-6">
      {header}

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<FileText size={18} />} label="Docs Available" value={availableCount} />
        <StatTile icon={<Award size={18} />} label="Certificates" value={certificates.length} tone="emerald" />
        <StatTile icon={<BarChart3 size={18} />} label="In Progress" value={inProgress} />
        <StatTile icon={<Wallet size={18} />} label={pendingPayments > 0 ? 'Pending Payment' : 'All Paid'} value={pendingPayments} tone={pendingPayments > 0 ? 'amber' : 'emerald'} />
      </div>

      {/* Track switcher (multiple enrollments) */}
      {enrollments.length > 1 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Select Track</h2>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Select track">
            {enrollments.map((e) => {
              const isComplete = e.status === 'completed' || e.progress >= 100;
              const isSelected = e.id === selected.id;
              return (
                <button
                  key={e.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(e.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : isComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {isComplete && <Check size={13} />}
                  {e.internshipTitle}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Track heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{selected.internshipTitle}</h2>
        {completed ? <Badge tone="success">Completed</Badge> : <Badge tone="info">{selected.progress}% complete</Badge>}
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DocCard
          icon={<Receipt size={18} />}
          tone="sky"
          title="Payment Receipt"
          meta={payment ? `Receipt #${payment.receiptNumber}` : 'Issued after payment'}
          locked={!isPaid}
          lockReason="Complete payment to unlock"
          onDownload={isPaid && payment ? () => download(`/api/student/download/receipt/${payment.id}`, `receipt-${payment.receiptNumber}.pdf`) : undefined}
        />
        <DocCard
          icon={<FileText size={18} />}
          tone="slate"
          title="Offer Letter"
          meta="Official internship offer letter"
          locked={!isPaid}
          lockReason="Complete payment to unlock"
          onDownload={isPaid ? () => download(`/api/student/download/offer-letter/${selected.id}`, `offer-letter-${selected.id}.pdf`) : undefined}
        />
        <DocCard
          icon={<BarChart3 size={18} />}
          tone="violet"
          title="Internship Report"
          meta="Track & module-wise report with charts"
          locked={!isPassed}
          lockReason="Pass the exam to unlock"
          onDownload={isPassed ? () => download(`/api/student/download/project-report/${selected.id}`, `internship-report-${selected.id}.pdf`) : undefined}
        />
        <DocCard
          icon={<CalendarDays size={18} />}
          tone="amber"
          title="Attendance Sheet"
          meta="Complete attendance record"
          locked={!isPassed}
          lockReason="Pass the exam to unlock"
          onDownload={isPassed ? () => download(`/api/student/download/attendance/${selected.id}`, `attendance-${selected.id}.pdf`) : undefined}
        />
        {cert ? (
          <DocCard
            highlight
            icon={<Award size={20} />}
            title="Certificate"
            meta={`Grade ${cert.grade} · Score ${cert.score}%`}
            onDownload={() => download(`/api/student/download/certificate/${cert.certificateId}`, `certificate-${cert.certificateId}.pdf`)}
          />
        ) : (
          <DocCard
            icon={<Award size={18} />}
            title="Certificate"
            meta=""
            locked
            lockReason={completed ? 'Certificate is being issued' : 'Pass the exam to earn your certificate'}
          />
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, tone = 'slate' }: {
  icon: ReactNode; label: string; value: number | string; tone?: 'slate' | 'emerald' | 'amber';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </Card>
  );
}
