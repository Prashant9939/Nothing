import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentApi, announcementApi } from '../../api';
import type { Announcement, DashboardResponse, Enrollment, ProfileCompletion } from '../../api';
import {
  RocketIcon, BookOpenIcon, ClipboardIcon, StarIcon, ArrowRightIcon, TrendingUpIcon,
  ClockIcon, WalletIcon, UserIcon, CheckIcon, MegaphoneIcon, HourglassIcon, PlayIcon,
  MessageCircleIcon, MailIcon, BookOpenTextIcon, CircleCheckIcon, CalendarDaysIcon,
  ExternalLinkIcon, ListChecksIcon, TimerIcon,
} from '@animateicons/react/lucide';
import { PageSkeleton, EmptyState, Button, Card, Badge } from '../../components/ui';
import { categoryImages } from '../../categories';
import { WHATSAPP_CHANNEL_URL } from '../../constants';

const iconChip = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl';

function parseDateSafe(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw);
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)
    ? new Date(`${s.replace(' ', 'T')}Z`)
    : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const formatTime = (iso: string) => {
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const PROFILE_LABELS: Record<string, string> = {
  phone: 'Phone number',
  university: 'University',
  college: 'College',
  course: 'Course',
  year: 'Year',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getDashboard().then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton label="Loading your dashboard..." />;

  if (loadError || !data) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title="Couldn't load your dashboard"
        description="Something went wrong while fetching your data. Check your connection and try again."
        action={<Button onClick={load}>Retry</Button>}
      />
    );
  }

  const { enrollments, payments, exams, certificates, profileCompletion, nextExam, daysLeft, announcements, announcementsUnread, announcementsTotal } = data;

  const activeEnrollment = enrollments.find(e => e.status === 'active');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const primary: Enrollment | null = activeEnrollment ?? completedEnrollments[0] ?? enrollments[0] ?? null;

  const steps = buildSteps({ primary, payments, exams, certificates });

  const stats = [
    { label: 'Enrolled', value: enrollments.length, icon: <RocketIcon size={17} />, color: 'bg-violet-50 text-violet-600' },
    { label: 'In Progress', value: enrollments.filter(e => e.status === 'active').length, icon: <TrendingUpIcon size={17} />, color: 'bg-sky-50 text-sky-600' },
    { label: 'Completed', value: completedEnrollments.length, icon: <ClipboardIcon size={17} />, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Certificates', value: certificates.length, icon: <StarIcon size={17} />, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <Hero user={user} activeEnrollment={activeEnrollment} completedCount={completedEnrollments.length} daysLeft={daysLeft} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} hover className="flex items-center gap-3 p-4">
            <span className={`${iconChip} ${s.color}`}>{s.icon}</span>
            <div className="min-w-0">
              <div className="text-2xl font-bold leading-none text-slate-900">{s.value}</div>
              <div className="mt-1 truncate text-xs text-slate-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {activeEnrollment ? (
            <ActiveCard enrollment={activeEnrollment} payments={payments} exams={exams} certificates={certificates} />
          ) : completedEnrollments.length > 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-center shadow-soft">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <StarIcon size={24} />
              </div>
              <h3 className="mb-1 font-bold text-slate-900">All Caught Up!</h3>
              <p className="mb-4 text-sm text-slate-500">You've completed all enrolled programs. Enroll in a new one!</p>
              <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                Browse Programs <ArrowRightIcon size={14} />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <RocketIcon size={24} />
              </div>
              <h3 className="mb-1 font-bold text-slate-900">Ready for Your Next Step?</h3>
              <p className="mb-4 text-sm text-slate-500">Pick a track to start learning and working toward your certificate.</p>
              <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                Select a Track <ArrowRightIcon size={14} />
              </Link>
            </div>
          )}

          <NextStepsCard steps={steps} />

          <AnnouncementsCard initial={announcements} initialUnread={announcementsUnread} total={announcementsTotal} />
        </div>

        <div className="min-w-0 space-y-6">
          <ExamCountdownCard nextExam={nextExam} exams={exams} hasEnrollment={enrollments.length > 0} />
          <ProfileCard completion={profileCompletion} />
          <SupportCard />
        </div>
      </div>

      {/* Completed Programs */}
      {completedEnrollments.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Completed Programs</h2>
            <span className="text-xs text-slate-500">{completedEnrollments.length} total</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedEnrollments.map(enrollment => {
              const payment = payments.find(p => p.enrollmentId === enrollment.id);
              const exam = exams.find(e => e.enrollmentId === enrollment.id);
              const cert = certificates.find(c => c.enrollmentId === enrollment.id);
              return (
                <div key={enrollment.id} className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-orange-200/80 hover:shadow-lift">
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-5 py-4 text-white">
                    <img
                      src={categoryImages.default}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
                    <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-orange-500/20 blur-3xl transition-all duration-500 group-hover:bg-orange-500/35" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm">
                          <StarIcon size={15} />
                        </span>
                        <h4 className="truncate text-sm font-semibold">{enrollment.internshipTitle}</h4>
                      </div>
                      <Badge tone="success" className="shrink-0 border-emerald-400/30 bg-emerald-500/15 text-emerald-300!">
                        <CircleCheckIcon size={11} /> Done
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2 p-5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Payment</span>
                      <span className={payment?.status === 'completed' ? 'font-medium text-emerald-700' : 'text-slate-800'}>
                        {payment?.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Exam Score</span>
                      <span className={exam?.score != null ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                        {exam?.score != null ? `${exam.score}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Grade</span>
                      <span className="font-bold text-slate-800">{cert?.grade || '-'}</span>
                    </div>
                    <div className="pt-2">
                      <Link
                        to="/student/documents"
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      >
                        View Documents <ArrowRightIcon size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Hero ============================ */

function Hero({ user, activeEnrollment, completedCount, daysLeft }: {
  user: { firstName?: string; lastName?: string } | null;
  activeEnrollment?: Enrollment;
  completedCount: number;
  daysLeft: number | null;
}) {
  const [hour] = useState(() => new Date().getHours());
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const progress = activeEnrollment?.progress ?? 0;
  const urgent = daysLeft != null && daysLeft <= 7;

  const subtitle = activeEnrollment
    ? `Currently learning: ${activeEnrollment.internshipTitle}`
    : completedCount > 0
      ? 'All programs completed — great work!'
      : 'Pick a track to start your internship journey.';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-lift sm:p-8">
      <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.10),transparent_55%)]" />
      <div className="relative z-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-emerald-200/80">{greeting}, welcome back</span>
            {activeEnrollment && daysLeft != null && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${
                urgent ? 'border-amber-400/40 bg-amber-500/20 text-amber-200' : 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200'
              }`}>
                <CalendarDaysIcon size={12} /> {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold drop-shadow-lg sm:text-2xl">{user?.firstName} {user?.lastName}</h1>
          <p className="mt-1 text-sm text-white/65">{subtitle}</p>
          {activeEnrollment && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/15 sm:w-48">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-emerald-300">{progress}%</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {activeEnrollment ? (
            <>
              <Link to="/student/learning" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-soft transition-all hover:-translate-y-0.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
                Continue Learning <ArrowRightIcon size={14} />
              </Link>
              <Link to="/student/documents" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
                Documents
              </Link>
            </>
          ) : (
            <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-soft transition-all hover:-translate-y-0.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
              {completedCount > 0 ? 'Browse Programs' : 'Explore Programs'} <ArrowRightIcon size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================= Active program ========================= */

function ActiveCard({ enrollment, payments, exams, certificates }: { enrollment: Enrollment; payments: DashboardResponse['payments']; exams: DashboardResponse['exams']; certificates: DashboardResponse['certificates'] }) {
  const payment = payments.find(p => p.enrollmentId === enrollment.id);
  const exam = exams.find(e => e.enrollmentId === enrollment.id);
  const cert = certificates.find(c => c.enrollmentId === enrollment.id);
  const topics = enrollment.topics?.split(',') || [];
  const progress = enrollment.progress || 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-shadow duration-300 hover:shadow-lift">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white">
        <img
          src={categoryImages.default}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <BookOpenIcon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{enrollment.internshipTitle}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
                <ClockIcon size={12} /> {topics.length} modules
              </p>
            </div>
          </div>
          <Badge tone="info" className="shrink-0 border-blue-400/30 bg-blue-500/15 text-blue-200!">
            Active
          </Badge>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-500">Progress</span>
            <span className="font-semibold text-slate-900">{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Payment', done: payment?.status === 'completed', text: payment?.status === 'completed' ? 'Paid' : 'Pending' },
            { label: 'Exam', done: exam?.status === 'completed', text: exam?.score != null ? `${exam.score}%` : 'Pending' },
            { label: 'Certificate', done: !!cert, text: cert?.grade || 'Pending' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border p-3 text-center transition-colors ${s.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`text-sm font-semibold ${s.done ? 'text-emerald-700' : 'text-slate-600'}`}>{s.text}</div>
              <div className="mt-0.5 text-[10px] font-medium text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link to="/student/learning" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40">
            Continue <ArrowRightIcon size={14} />
          </Link>
          <Link to="/student/documents" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ========================== Next steps ========================== */

interface Step {
  title: string;
  desc: string;
  to: string;
  cta: string;
  icon: ReactNode;
  done: boolean;
}

function buildSteps({ primary, payments, exams, certificates }: {
  primary: Enrollment | null;
  payments: DashboardResponse['payments'];
  exams: DashboardResponse['exams'];
  certificates: DashboardResponse['certificates'];
}): Step[] {
  const forPrimary = <T extends { enrollmentId: number | null }>(rows: T[]): T | undefined =>
    primary ? rows.find(r => r.enrollmentId === primary.id) : undefined;

  const payment = forPrimary(payments);
  const paid = !!payment && payment.status === 'completed';
  const pendingPayment = primary
    ? payments.find(p => p.enrollmentId === primary.id && p.status === 'pending')
    : undefined;
  const exam = forPrimary(exams);
  const examDone = exam?.status === 'completed' || exam?.status === 'failed';
  const cert = forPrimary(certificates);
  const progress = primary?.progress ?? 0;

  return [
    {
      title: 'Choose a program',
      desc: primary ? primary.internshipTitle || 'Program selected' : 'Browse tracks and enroll in one',
      to: '/student/select-track',
      cta: 'Select a Track',
      icon: <RocketIcon size={15} />,
      done: !!primary,
    },
    {
      title: 'Complete payment',
      desc: paid ? `Paid${payment?.receiptNumber ? ` · ${payment.receiptNumber}` : ''}` : 'Unlock learning and documents',
      to: pendingPayment ? `/student/pay/${pendingPayment.id}` : '/student/select-track',
      cta: 'Complete Payment',
      icon: <WalletIcon size={15} />,
      done: paid,
    },
    {
      title: 'Finish learning modules',
      desc: paid ? `${progress}% complete` : 'Available after payment',
      to: '/student/learning',
      cta: 'Continue Learning',
      icon: <BookOpenIcon size={15} />,
      done: paid && progress >= 100,
    },
    {
      title: 'Pass the final exam',
      desc: exam
        ? (exam.score != null && examDone
            ? `Scored ${exam.score}%`
            : exam.status === 'failed'
              ? 'Not passed — contact support'
              : 'In progress')
        : 'Unlocks at 100% modules',
      to: '/student/exam-page',
      cta: 'Go to Exam',
      icon: <ClipboardIcon size={15} />,
      done: examDone,
    },
    {
      title: 'Download certificate',
      desc: cert ? `Grade ${cert.grade}` : 'Issued after passing the exam',
      to: '/student/documents',
      cta: 'View Documents',
      icon: <StarIcon size={15} />,
      done: !!cert,
    },
  ];
}

function NextStepsCard({ steps }: { steps: Step[] }) {
  const currentIdx = steps.findIndex(s => !s.done);
  const allDone = currentIdx === -1;

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`${iconChip} bg-emerald-50 text-emerald-600`}><ListChecksIcon size={17} /></span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Your Roadmap</h3>
            <p className="text-xs text-slate-500">
              {allDone ? 'Every step completed' : `Step ${currentIdx + 1} of ${steps.length}`}
            </p>
          </div>
        </div>
        {allDone && <Badge tone="success"><CircleCheckIcon size={11} /> All done</Badge>}
      </div>

      <ol className="space-y-1">
        {steps.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isTodo = !s.done && !isCurrent;
          return (
            <li key={s.title} className={`relative flex items-start gap-3 rounded-xl p-3 ${isCurrent ? 'border border-emerald-200/70 bg-emerald-50/60' : ''}`}>
              {i < steps.length - 1 && (
                <span
                  className={`absolute left-[26px] top-[46px] h-[calc(100%-28px)] w-px ${s.done ? 'bg-emerald-300' : 'bg-slate-200'}`}
                  aria-hidden="true"
                />
              )}
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                s.done
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)]'
                  : isCurrent
                    ? 'border-emerald-500 bg-white text-emerald-600'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                {s.done ? <CheckIcon size={13} /> : s.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${isTodo ? 'text-slate-500' : 'text-slate-900'}`}>{s.title}</p>
                  {s.done && <Badge tone="success">Done</Badge>}
                  {isCurrent && <Badge tone="warning">Current</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
                {isCurrent && (
                  <Link
                    to={s.to}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  >
                    {s.cta} <ArrowRightIcon size={12} />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ======================== Exam countdown ======================== */

function ExamCountdownCard({ nextExam, exams, hasEnrollment }: {
  nextExam: DashboardResponse['nextExam'];
  exams: DashboardResponse['exams'];
  hasEnrollment: boolean;
}) {
  const target = useMemo(() => parseDateSafe(nextExam?.scheduledAt), [nextExam?.scheduledAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target || target.getTime() <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const latestResult = exams.find(e => e.status === 'completed' || e.status === 'failed');

  let body: ReactNode;

  if (nextExam && nextExam.status === 'in_progress') {
    body = (
      <div className="space-y-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-700">
          Your attempt is in progress — jump back in before time runs out.
        </div>
        <Link
          to={`/student/exam/${nextExam.enrollmentId}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
        >
          <PlayIcon size={14} /> Resume Exam
        </Link>
      </div>
    );
  } else if (nextExam && target) {
    const ms = Math.max(0, target.getTime() - now);
    const open = ms === 0;
    const unlocked = !!nextExam.courseCompleted;
    const total = Math.floor(ms / 1000);
    const units = [
      { label: 'Days', value: Math.floor(total / 86400) },
      { label: 'Hours', value: Math.floor((total % 86400) / 3600) },
      { label: 'Mins', value: Math.floor((total % 3600) / 60) },
      { label: 'Secs', value: total % 60 },
    ];

    body = (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2" role="timer" aria-label={open ? 'Exam window is open' : 'Time until exam'}>
          {units.map(u => (
            <div key={u.label} className={`rounded-xl border py-2 text-center ${open ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`text-lg font-bold leading-none ${open ? 'text-emerald-600' : 'text-slate-900'}`}>
                {open ? '00' : String(u.value).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[9px] font-medium uppercase tracking-wider text-slate-500">{u.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon size={13} className="text-slate-500" />
            {target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}
            {target.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TimerIcon size={13} className="text-slate-500" /> {nextExam.duration} min
          </span>
        </div>

        {!unlocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            Complete all learning modules to unlock the exam ({nextExam.courseProgress || 0}% done).
          </div>
        )}

        <Link
          to={unlocked ? '/student/exam-page' : '/student/learning'}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 ${
            unlocked
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 focus-visible:ring-orange-500/40'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-emerald-500/40'
          }`}
        >
          {unlocked ? <><PlayIcon size={14} /> {open ? 'Start Exam Now' : 'Go to Exam'}</> : 'Go to Learning'}
        </Link>
      </div>
    );
  } else if (nextExam && !target) {
    body = (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          The exam date hasn't been announced yet. Complete your modules in the meantime.
        </div>
        <Link to="/student/learning" className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200">
          Go to Learning
        </Link>
      </div>
    );
  } else if (latestResult) {
    const passed = latestResult.status === 'completed';
    body = (
      <div className="space-y-3">
        <div className={`rounded-xl border p-3 text-center ${passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className={`text-xl font-bold ${passed ? 'text-emerald-700' : 'text-red-600'}`}>
            {latestResult.score != null ? `${latestResult.score}%` : passed ? 'Passed' : 'Not passed'}
          </div>
          <div className={`mt-0.5 text-[11px] font-medium ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
            {passed ? 'Exam completed' : 'Exam failed'}
          </div>
        </div>
        <Link to="/student/documents" className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200">
          View Documents <ArrowRightIcon size={13} />
        </Link>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
          <HourglassIcon size={22} className="mx-auto text-slate-400" />
          <p className="mt-2 text-xs font-medium text-slate-500">No exam scheduled yet</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {hasEnrollment ? 'Finish your learning modules to unlock it.' : 'Enroll in a program to get certified.'}
          </p>
        </div>
        <Link
          to={hasEnrollment ? '/student/learning' : '/student/select-track'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
        >
          {hasEnrollment ? 'Go to Learning' : 'Select a Track'} <ArrowRightIcon size={13} />
        </Link>
      </div>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`${iconChip} bg-orange-50 text-orange-600`}><HourglassIcon size={17} /></span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Exam Countdown</h3>
            <p className="text-xs text-slate-500">
              {nextExam
                ? nextExam.internshipTitle || 'Upcoming exam'
                : latestResult
                  ? 'Last attempt'
                  : 'Nothing scheduled'}
            </p>
          </div>
        </div>
        {nextExam?.status === 'in_progress' && <Badge tone="info">Live</Badge>}
      </div>
      {body}
    </Card>
  );
}

/* ======================== Profile completion ======================== */

function ProfileCard({ completion }: { completion: ProfileCompletion }) {
  const { pct, missing } = completion;
  const complete = pct >= 100;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`${iconChip} bg-blue-50 text-blue-600`}><UserIcon size={17} /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
          <p className="truncate text-xs text-slate-500">
            {complete ? 'Everything is filled in' : `${missing.length} ${missing.length === 1 ? 'item' : 'items'} left to add`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <CompletionRing pct={pct} />
        <div className="min-w-0 flex-1">
          {complete ? (
            <p className="flex items-start gap-2 text-xs font-medium text-emerald-700">
              <CircleCheckIcon size={15} className="mt-px shrink-0" />
              Your profile is complete — nice!
            </p>
          ) : (
            <ul className="space-y-1.5">
              {missing.map(field => (
                <li key={field} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                  {PROFILE_LABELS[field] || field}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        to="/student/edit-profile"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        {complete ? 'View Profile' : 'Complete Profile'} <ArrowRightIcon size={13} />
      </Link>
    </Card>
  );
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const complete = pct >= 100;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className={`${complete ? 'text-emerald-500' : 'text-blue-500'} transition-all duration-700`}
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${complete ? 'text-emerald-600' : 'text-slate-900'}`}
        role="status"
        aria-label={`Profile ${pct}% complete`}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ========================= Announcements ========================= */

function AnnouncementsCard({ initial, initialUnread, total }: { initial: Announcement[]; initialUnread: number; total: number }) {
  const [items, setItems] = useState<Announcement[]>(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [expanded, setExpanded] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    setLoadingAll(true);
    try {
      const res = await announcementApi.list();
      setItems(res.data.announcements);
      setUnread(res.data.unread);
    } catch {
      // keep the initial three if the full list fails to load
    } finally {
      setLoadingAll(false);
      setExpanded(true);
    }
  };

  const openItem = async (a: Announcement) => {
    if (a.read) return;
    setItems(prev => prev.map(x => x.id === a.id ? { ...x, read: true } : x));
    setUnread(u => Math.max(0, u - 1));
    try {
      await announcementApi.markRead(a.id);
    } catch {
      announcementApi.list().then(r => {
        setItems(r.data.announcements);
        setUnread(r.data.unread);
      }).catch(() => {});
    }
  };

  const display = expanded ? items : items.slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`${iconChip} bg-amber-50 text-amber-600`}><MegaphoneIcon size={17} /></span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Announcements</h3>
              {unread > 0 && <Badge tone="warning">{unread} new</Badge>}
            </div>
            <p className="text-xs text-slate-500">Latest news from the team</p>
          </div>
        </div>
        {(expanded || total > 3) && (
          <Button variant="ghost" size="sm" onClick={toggle} loading={loadingAll}>
            {expanded ? 'Show less' : 'View all'}
          </Button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {display.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-slate-500">No announcements yet.</p>
        )}
        {display.map(a => (
          <button
            key={a.id}
            onClick={() => openItem(a)}
            className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors ${a.read ? 'hover:bg-slate-50' : 'bg-orange-50/40 hover:bg-orange-50/70'}`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.read ? 'bg-slate-200' : 'bg-orange-500'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-sm ${a.read ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>{a.title}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{formatTime(a.createdAt)}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{a.message}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ============================ Support ============================ */

function SupportCard() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`${iconChip} bg-emerald-50 text-emerald-600`}><MessageCircleIcon size={17} /></span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Need help?</h3>
          <p className="text-xs text-slate-500">We're just a message away</p>
        </div>
      </div>

      <div className="space-y-2">
        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#25D366] to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.25)] transition-all hover:-translate-y-0.5 hover:from-[#20c25c] hover:to-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <MessageCircleIcon size={16} />
          <span className="flex-1">Join WhatsApp Channel</span>
          <ExternalLinkIcon size={13} className="opacity-80" />
        </a>
        <Link
          to="/contact"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <MailIcon size={16} className="text-slate-500" />
          <span className="flex-1">Contact Support</span>
          <ArrowRightIcon size={13} className="text-slate-400" />
        </Link>
        <Link
          to="/faq"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <BookOpenTextIcon size={16} className="text-slate-500" />
          <span className="flex-1">FAQ & Guides</span>
          <ArrowRightIcon size={13} className="text-slate-400" />
        </Link>
      </div>
    </Card>
  );
}
