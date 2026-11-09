import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Award, BadgeCheck, BarChart3, BookOpen, CalendarDays, Check,
  Download, FileSignature, FileText, FolderOpen, GraduationCap, MessageSquare,
  PenLine, Receipt, Wallet,
} from 'lucide-react';
import { studentApi } from '../../api';
import type { Enrollment, Payment, Exam, Certificate } from '../../api';
import { usePopup } from '../../context/PopupContext';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton, EmptyState, Button } from '../ui';
import DocCard from './DocCard';

const primaryLink = 'inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-6 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50';

type DocCategory = 'ACADEMIC' | 'LEGAL' | 'BILLING';
type FilterId = DocCategory | 'ALL';

const CATEGORY_FILTERS: { id: FilterId; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACADEMIC', label: 'Academic & Eval' },
  { id: 'LEGAL', label: 'Onboarding & Forms' },
  { id: 'BILLING', label: 'Billing & Cert' },
];

/* Footer segment of a supporting-document card, mirroring the mockup's
   short dossier-section labels. */
const FOOT_LABELS: Record<DocCategory, string | null> = {
  BILLING: 'Billing & Fee',
  LEGAL: null, // user-requested: no "Onboarding" label on these cards
  ACADEMIC: 'Evaluation',
};

interface DocDef {
  key: string;
  category: DocCategory;
  icon: ReactNode;
  title: string;
  meta: string;
  locked: boolean;
  lockReason?: string;
  href?: string;
  filename?: string;
}

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
  const [category, setCategory] = useState<FilterId>('ALL');
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);

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

  const fetchPdf = async (url: string, label: string, verb: 'Downloading' | 'Opening') => {
    const token = sessionStorage.getItem('token');
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        // A dropped connection must fail the spinner instead of spinning
        // forever: fetch has no default timeout and TCP retransmits for
        // many minutes before erroring on its own.
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.blob();
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
      popup.error(
        timedOut
          ? `${verb} ${label} timed out. Please check your connection and try again.`
          : `Could not ${verb === 'Downloading' ? 'download' : 'open'} ${label}. Please try again.`,
        verb === 'Downloading' ? 'Download Failed' : 'Preview Failed'
      );
      throw err;
    }
  };

  const download = async (url: string, filename: string) => {
    const finalName = studentName ? `${studentName} - ${filename}` : filename;
    const blob = await fetchPdf(url, finalName, 'Downloading');
    const a = document.createElement('a');
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = finalName;
    a.click();
    // Revoking synchronously can cancel the download before the browser
    // finishes reading the blob URL; give it a few seconds first.
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  };

  /* Preview returns a blob URL; DocCard opens the blank tab synchronously
     inside the click (popup blockers) and fills it with this URL. */
  const previewDoc = async (d: DocDef): Promise<string> => {
    if (!d.href) throw new Error('No file available');
    const blob = await fetchPdf(d.href, d.title, 'Opening');
    return URL.createObjectURL(blob);
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

  const header = <h1 className="sr-only">Documents</h1>;

  if (loading) return <>{header}<PageSkeleton label="Loading your documents..." /></>;

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
                ? <Link to={`/student/pay/${pending.linkToken || pending.id}`} className={primaryLink}>Complete Payment</Link>
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

  /* The ten official documents of the selected track — single source of truth
     for the grid, the category counts, the session meter and Download All. */
  const docs: DocDef[] = [
    {
      key: 'receipt', category: 'BILLING', icon: <Receipt size={18} />,
      title: 'Payment Receipt',
      meta: payment ? `Receipt #${payment.receiptNumber}` : 'Issued after payment',
      locked: !isPaid, lockReason: 'Complete payment to unlock',
      href: payment ? `/api/student/download/receipt/${payment.id}` : undefined,
      filename: payment ? `receipt-${payment.receiptNumber}.pdf` : undefined,
    },
    {
      key: 'offer', category: 'LEGAL', icon: <FileText size={18} />,
      title: 'Offer Letter', meta: 'Official internship offer letter',
      locked: !isPaid, lockReason: 'Complete payment to unlock',
      href: `/api/student/download/offer-letter/${selected.id}`,
      filename: `offer-letter-${selected.id}.pdf`,
    },
    {
      key: 'report', category: 'ACADEMIC', icon: <BarChart3 size={18} />,
      title: 'Internship Report', meta: 'Track & module-wise report with charts',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/project-report/${selected.id}`,
      filename: `internship-report-${selected.id}.pdf`,
    },
    {
      key: 'attendance', category: 'ACADEMIC', icon: <CalendarDays size={18} />,
      title: 'Attendance Sheet', meta: 'Complete attendance record',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/attendance/${selected.id}`,
      filename: `attendance-${selected.id}.pdf`,
    },
    {
      key: 'marksheet', category: 'ACADEMIC', icon: <GraduationCap size={18} />,
      title: 'Internship Marksheet', meta: 'Single-page marks, grade & result',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/marksheet/${selected.id}`,
      filename: `internship-marksheet-${selected.id}.pdf`,
    },
    {
      key: 'logbook', category: 'ACADEMIC', icon: <BookOpen size={18} />,
      title: 'Daily Log Book', meta: 'Day-wise activity record · multi-page',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/log-book/${selected.id}`,
      filename: `daily-log-book-${selected.id}.pdf`,
    },
    {
      key: 'consent', category: 'LEGAL', icon: <FileSignature size={18} />,
      title: 'Consent Form', meta: 'College permission letter for the internship',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/form/consent/${selected.id}`,
      filename: `consent-form-${selected.id}.pdf`,
    },
    {
      key: 'undertaking', category: 'LEGAL', icon: <PenLine size={18} />,
      title: 'Internship Undertaking', meta: 'Self-declaration & code of conduct',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/form/undertaking/${selected.id}`,
      filename: `undertaking-${selected.id}.pdf`,
    },
    {
      key: 'feedback', category: 'LEGAL', icon: <MessageSquare size={18} />,
      title: 'Feedback Form', meta: 'Share your experience of the program',
      locked: !isPassed, lockReason: 'Pass the exam to unlock',
      href: `/api/student/download/form/feedback/${selected.id}`,
      filename: `feedback-form-${selected.id}.pdf`,
    },
    {
      key: 'certificate', category: 'BILLING', icon: <Award size={18} />,
      title: 'Certificate',
      meta: cert ? `Grade ${cert.grade} · Score ${cert.score}%` : '',
      locked: !cert,
      lockReason: completed ? 'Certificate is being issued' : 'Pass the exam to earn your certificate',
      href: cert ? `/api/student/download/certificate/${cert.certificateId}` : undefined,
      filename: cert ? `certificate-${cert.certificateId}.pdf` : undefined,
    },
  ];

  const availableCount = docs.filter((d) => !d.locked).length;
  const countFor = (id: FilterId) =>
    id === 'ALL' ? docs.length : docs.filter((d) => d.category === id).length;
  const visibleDocs = docs.filter((d) => category === 'ALL' || d.category === category);
  // The certificate is showcased in the hero above — the grid lists only the
  // nine supporting documents (a clean 3×3 bento at xl).
  const gridDocs = visibleDocs.filter((d) => d.key !== 'certificate');
  const supportingCount = gridDocs.length;
  const dlKey = (key: string) => `${selected.id}:${key}`;
  const downloadedCount = docs.filter((d) => !d.locked && downloaded.has(dlKey(d.key))).length;

  const downloadDoc = async (d: DocDef) => {
    if (!d.href) return;
    await download(d.href, d.filename || `${d.key}.pdf`);
    setDownloaded((prev) => {
      const next = new Set(prev);
      next.add(dlKey(d.key));
      return next;
    });
  };

  const downloadAll = async () => {
    if (batch) return;
    const queue = docs.filter((d) => !d.locked && d.href);
    if (!queue.length) return;
    setBatch({ done: 0, total: queue.length });
    try {
      for (const d of queue) {
        await downloadDoc(d);
        setBatch((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      }
    } catch {
      // download() already surfaced the exact error to the user
    } finally {
      setBatch(null);
    }
  };

  const renderDoc = (d: DocDef) => {
    const seq = docs.indexOf(d) + 1;
    return (
      <DocCard
        key={d.key}
        icon={d.icon}
        title={d.title}
        seq={seq}
        categoryLabel={FOOT_LABELS[d.category]}
        tone={seq % 2 === 1 ? 'tint' : 'neutral'}
        locked={d.locked}
        lockReason={d.lockReason}
        onDownload={!d.locked && d.href ? () => downloadDoc(d) : undefined}
        onPreview={!d.locked && d.href ? () => previewDoc(d) : undefined}
      />
    );
  };

  return (
    <div className="space-y-6">
      {header}

      {/* Track switcher + session download meter */}
      <section className="flex flex-col justify-between gap-3.5 rounded-[22px] border border-sand bg-alabaster p-3.5 shadow-bento sm:p-4 lg:flex-row lg:items-center">
        {enrollments.length > 1 && (
          <div className="-mb-1 flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Select track">
            {enrollments.map((e) => {
              const isComplete = e.status === 'completed' || e.progress >= 100;
              const isSelected = e.id === selected.id;
              return (
                <button
                  key={e.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(e.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                    isSelected
                      ? 'border-noir bg-noir text-cream shadow-sm'
                      : 'border-sand bg-cream text-charcoal hover:border-sand-dark hover:text-ink'
                  }`}
                >
                  {isComplete && <Check size={13} className="text-burnt" />}
                  {e.internshipTitle}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-sand pt-2.5 lg:border-t-0 lg:pt-0">
          <div className="text-right">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-charcoal">Session Downloads</span>
            <span className="font-mono text-xs font-bold text-ink">{downloadedCount} of {availableCount} Downloaded</span>
          </div>
        </div>
      </section>

      {/* Active track heading + editorial filter / action bar */}
      <section className="flex flex-col gap-4 border-b border-sand pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{selected.internshipTitle}</h2>
            {completed ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-noir px-3.5 py-1 font-mono text-xs font-semibold text-cream shadow-sm">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-burnt opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-burnt" />
                </span>
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-sand bg-alabaster px-3.5 py-1 font-mono text-xs font-semibold text-charcoal">
                <span className="h-2 w-2 rounded-full bg-burnt" aria-hidden="true" />
                {selected.progress}% complete
              </span>
            )}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-charcoal sm:text-sm">
            <span>
              {availableCount === docs.length
                ? `${docs.length} Official PDF Documents Generated`
                : `${availableCount} of ${docs.length} Documents Available`}
            </span>
            {payment?.receiptNumber && (
              <>
                <span className="text-sand-dark" aria-hidden="true">•</span>
                <span className="font-mono text-xs text-ink">Receipt #{payment.receiptNumber}</span>
              </>
            )}
            {cert && (
              <>
                <span className="text-sand-dark" aria-hidden="true">•</span>
                <span className="font-mono text-xs font-semibold text-burnt">Grade {cert.grade} · Score {cert.score}%</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category filters with real per-category counts */}
          <div className="flex items-center overflow-x-auto rounded-xl border border-sand bg-alabaster p-1 text-xs font-medium">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                  category === c.id ? 'bg-noir font-semibold text-cream' : 'text-charcoal hover:text-ink'
                }`}
              >
                {c.label} ({countFor(c.id)})
              </button>
            ))}
          </div>

          {/* Primary CTA: download every unlocked document of this track */}
          <button
            type="button"
            onClick={downloadAll}
            disabled={!!batch || availableCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-burnt px-4 py-2.5 text-xs font-semibold text-cream shadow-md shadow-burnt/20 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50 disabled:translate-y-0 disabled:opacity-70"
          >
            {batch
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" aria-hidden="true" />
              : <Download size={16} />}
            <span>{batch ? `Downloading ${batch.done}/${batch.total}` : 'Download All PDF'}</span>
          </button>
        </div>
      </section>

      {/* Hero credential spotlight — issued certificate on the ink mesh */}
      {cert && (
        <section className="noir-mesh relative overflow-hidden rounded-[26px] border border-noir p-6 text-cream shadow-ink-spotlight sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 sm:items-center sm:gap-5">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-cream/20 bg-burnt text-cream shadow-lg shadow-burnt/30 sm:h-16 sm:w-16">
                <BadgeCheck size={26} />
                <span className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-widest">{cert.grade} Seal</span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/60">Certificate Issued</p>
                <h3 className="mt-1 font-display text-xl font-bold text-cream sm:text-2xl">
                  Grade {cert.grade} · Score {cert.score}%
                </h3>
                <p className="mt-1 text-sm text-cream/65">{selected.internshipTitle} dossier is verified and complete.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { const certDoc = docs.find((d) => d.key === 'certificate'); if (certDoc) void downloadDoc(certDoc); }}
                className="inline-flex items-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50"
              >
                <Download size={15} />
                Download Certificate
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Official supporting documents — section header + bento grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-7 w-2.5 shrink-0 rounded-full bg-burnt" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold uppercase leading-tight tracking-tight text-ink sm:text-xl">
              Official Supporting Documents
            </h3>
          </div>
          <span className="shrink-0 rounded-xl border border-sand bg-alabaster px-3.5 py-1.5 text-center shadow-bento">
            <span className="block font-display text-base font-bold leading-none text-ink">{supportingCount}</span>
            <span className="mt-0.5 block font-mono text-[10px] font-semibold uppercase leading-none text-charcoal">
              {supportingCount === 1 ? 'PDF' : 'PDFs'}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {gridDocs.map(renderDoc)}
        </div>
      </div>
    </div>
  );
}
