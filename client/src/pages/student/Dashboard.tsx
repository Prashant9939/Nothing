import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentApi, announcementApi } from '../../api';
import type { Announcement, DashboardResponse, Enrollment, ProfileCompletion } from '../../api';
import {
  RocketIcon, BookOpenIcon, ClipboardIcon, StarIcon, ArrowRightIcon, TrendingUpIcon,
  ClockIcon, UserIcon, MegaphoneIcon, HourglassIcon, PlayIcon,
  MessageCircleIcon, MailIcon, BookOpenTextIcon, CircleCheckIcon, CalendarDaysIcon,
  ExternalLinkIcon, TimerIcon,
} from '@animateicons/react/lucide';
import { PageSkeleton, EmptyState, Button, Badge } from '../../components/ui';
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
  const stats = [
    { label: 'Enrolled', value: enrollments.length, icon: <RocketIcon size={17} /> },
    { label: 'In Progress', value: enrollments.filter(e => e.status === 'active').length, icon: <TrendingUpIcon size={17} /> },
    { label: 'Completed', value: completedEnrollments.length, icon: <ClipboardIcon size={17} /> },
    { label: 'Certificates', value: certificates.length, icon: <StarIcon size={17} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Asymmetric 12-column bento grid: full-width hero (greeting + large
          name + merged profile), stats (4) + exam (3) + track (5),
          support (4) + announcements (8).
          Grid order doubles as the mobile stack order (time-sensitive exam
          sits directly under the stats). */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Hero user={user} activeEnrollment={activeEnrollment} completedCount={completedEnrollments.length} daysLeft={daysLeft} completion={profileCompletion} className="lg:col-span-12" />

        {/* Stats */}
        <div className="grid auto-rows-fr grid-cols-2 gap-4 lg:col-span-6 xl:col-span-4">
          {stats.map((s) => (
            <div key={s.label} className="bento-card flex flex-col justify-center rounded-[24px] border border-sand bg-alabaster p-4 shadow-bento">
              <div className="flex items-center gap-3">
                <span className={`${iconChip} border border-burnt/20 bg-burnt-tint text-burnt`}>{s.icon}</span>
                <div className="font-display text-3xl font-bold leading-none text-ink">{s.value}</div>
              </div>
              {/* label spans the full tile so it never truncates on narrow screens */}
              <div className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal">{s.label}</div>
            </div>
          ))}
        </div>

        <ExamCountdownCard className="lg:col-span-6 xl:col-span-3" nextExam={nextExam} exams={exams} hasEnrollment={enrollments.length > 0} />

        {activeEnrollment ? (
          <ActiveCard className="lg:col-span-6 xl:col-span-5" enrollment={activeEnrollment} payments={payments} exams={exams} certificates={certificates} />
        ) : completedEnrollments.length > 0 ? (
          <div className="bento-card flex flex-col items-center justify-center rounded-[24px] border border-sand bg-alabaster p-6 text-center shadow-bento lg:col-span-6 xl:col-span-5">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-burnt/20 bg-burnt-tint text-burnt">
              <StarIcon size={24} />
            </div>
            <h3 className="mb-1 font-display text-base font-semibold text-ink">All Caught Up!</h3>
            <p className="mb-4 text-sm text-charcoal">You've completed all enrolled programs. Enroll in a new one!</p>
            <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50">
              Browse Programs <ArrowRightIcon size={14} />
            </Link>
          </div>
        ) : (
          <div className="bento-card flex flex-col items-center justify-center rounded-[24px] border border-dashed border-sand-dark bg-alabaster p-6 text-center shadow-bento lg:col-span-6 xl:col-span-5">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-charcoal">
              <RocketIcon size={24} />
            </div>
            <h3 className="mb-1 font-display text-base font-semibold text-ink">Ready for Your Next Step?</h3>
            <p className="mb-4 text-sm text-charcoal">Pick a track to start learning and working toward your certificate.</p>
            <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50">
              Select a Track <ArrowRightIcon size={14} />
            </Link>
          </div>
        )}

        <SupportCard className="lg:col-span-6 xl:col-span-4" />

        <AnnouncementsCard className="lg:col-span-12 xl:col-span-8" initial={announcements} initialUnread={announcementsUnread} total={announcementsTotal} />
      </div>

      {/* Completed Programs */}
      {completedEnrollments.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">Completed Programs</h2>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal">{completedEnrollments.length} total</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {completedEnrollments.map(enrollment => {
              const payment = payments.find(p => p.enrollmentId === enrollment.id);
              const exam = exams.find(e => e.enrollmentId === enrollment.id);
              const cert = certificates.find(c => c.enrollmentId === enrollment.id);
              return (
                <div key={enrollment.id} className="bento-card flex flex-col rounded-[24px] border border-sand bg-alabaster p-5 shadow-bento transition-all duration-300 hover:-translate-y-1 hover:border-sand-dark hover:shadow-bento-hover">
                  {/* header: theme chip + title + orange Done pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`${iconChip} shrink-0 border border-burnt/20 bg-burnt-tint text-burnt`}>
                        <StarIcon size={16} />
                      </span>
                      <h4 className="truncate font-display text-sm font-semibold text-ink">{enrollment.internshipTitle}</h4>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-700">
                      <CircleCheckIcon size={11} /> Done
                    </span>
                  </div>

                  {/* compact stat strip — mono labels like the rest of the grid */}
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-sand pt-4">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal">Payment</div>
                      <div className={`mt-1 truncate text-sm font-semibold ${payment?.status === 'completed' ? 'text-orange-700' : 'text-ink'}`}>
                        {payment?.status === 'completed' ? 'Paid' : 'Pending'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal">Score</div>
                      <div className="mt-1 text-sm font-semibold text-ink">{exam?.score != null ? `${exam.score}%` : '-'}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal">Grade</div>
                      <div className="mt-1 text-sm font-bold text-ink">{cert?.grade || '-'}</div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <Link
                      to="/student/documents"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-sand bg-cream py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-sand-dark hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                    >
                      View Documents <ArrowRightIcon size={13} />
                    </Link>
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

function Hero({ user, activeEnrollment, completedCount, daysLeft, completion, className }: {
  user: { firstName?: string; lastName?: string } | null;
  activeEnrollment?: Enrollment;
  completedCount: number;
  daysLeft: number | null;
  completion: ProfileCompletion;
  className?: string;
}) {
  const [hour] = useState(() => new Date().getHours());
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const progress = activeEnrollment?.progress ?? 0;
  const urgent = daysLeft != null && daysLeft <= 7;
  const { pct, missing } = completion;
  const complete = pct >= 100;

  const subtitle = activeEnrollment
    ? `Currently learning: ${activeEnrollment.internshipTitle}`
    : completedCount > 0
      ? 'All programs completed — great work!'
      : 'Pick a track to start your internship journey.';

  return (
    <section className={`bento-card rounded-[24px] border border-sand bg-alabaster p-6 shadow-bento sm:p-7 ${className ?? ''}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
        {/* Greeting + extra-large name + primary CTA */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal">{greeting}, welcome back</span>
              {activeEnrollment && daysLeft != null && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                  urgent ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-burnt/30 bg-burnt-tint text-burnt'
                }`}>
                  <CalendarDaysIcon size={12} /> {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-4xl xl:text-6xl 2xl:text-7xl">{user?.firstName} {user?.lastName}</h1>
            <p className="mt-2 text-sm text-charcoal">{subtitle}</p>
            {activeEnrollment && (
              <div className="mt-4 flex max-w-md items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-dark/50">
                  <div
                    className="h-full rounded-full bg-burnt transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] font-semibold text-burnt">{progress}%</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeEnrollment ? (
              <>
                <Link to="/student/learning" className="inline-flex items-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50">
                  Continue Learning <ArrowRightIcon size={14} />
                </Link>
                <Link to="/student/documents" className="inline-flex items-center gap-2 rounded-xl border border-sand bg-cream px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-sand-dark hover:bg-alabaster focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
                  Documents
                </Link>
              </>
            ) : (
              <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50">
                {completedCount > 0 ? 'Browse Programs' : 'Explore Programs'} <ArrowRightIcon size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Profile completion — merged from its own card */}
        <div className="flex flex-col justify-center gap-4 border-t border-sand pt-6 lg:w-[330px] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-center gap-3">
            <span className={`${iconChip} shrink-0 border border-burnt/20 bg-burnt-tint text-burnt`}><UserIcon size={17} /></span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-semibold text-ink">Profile</h3>
              <p className="mt-0.5 font-mono text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-charcoal">
                {complete ? 'Everything is filled in' : `${missing.length} ${missing.length === 1 ? 'item' : 'items'} left to add`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CompletionRing pct={pct} />
            <div className="min-w-0 flex-1">
              {complete ? (
                <p className="flex items-start gap-2 text-xs font-medium text-orange-700">
                  <CircleCheckIcon size={15} className="mt-px shrink-0" />
                  Your profile is complete — nice!
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {missing.map(field => (
                    <li key={field} className="flex items-center gap-2 text-xs text-charcoal">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sand bg-cream py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-sand-dark hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            {complete ? 'View Profile' : 'Complete Profile'} <ArrowRightIcon size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ========================= Active program ========================= */

function ActiveCard({ className, enrollment, payments, exams, certificates }: { className?: string; enrollment: Enrollment; payments: DashboardResponse['payments']; exams: DashboardResponse['exams']; certificates: DashboardResponse['certificates'] }) {
  const payment = payments.find(p => p.enrollmentId === enrollment.id);
  const exam = exams.find(e => e.enrollmentId === enrollment.id);
  const cert = certificates.find(c => c.enrollmentId === enrollment.id);
  const topics = enrollment.topics?.split(',') || [];
  const progress = enrollment.progress || 0;

  return (
    <div className={`bento-card overflow-hidden rounded-[24px] border border-sand bg-alabaster shadow-bento ${className ?? ''}`}>
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white">
        <img
          src={categoryImages.default}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-burnt/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <BookOpenIcon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display font-semibold">{enrollment.internshipTitle}</h3>
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
            <span className="text-charcoal">Progress</span>
            <span className="font-semibold text-ink">{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-burnt shadow-[0_0_8px_rgba(217,84,30,0.45)] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Payment', done: payment?.status === 'completed', text: payment?.status === 'completed' ? 'Paid' : 'Pending' },
            { label: 'Exam', done: exam?.status === 'completed', text: exam?.score != null ? `${exam.score}%` : 'Pending' },
            { label: 'Certificate', done: !!cert, text: cert?.grade || 'Pending' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border p-3 text-center transition-colors ${s.done ? 'border-orange-200 bg-orange-50' : 'border-sand bg-cream'}`}>
              <div className={`text-sm font-semibold ${s.done ? 'text-orange-700' : 'text-charcoal'}`}>{s.text}</div>
              <div className="mt-0.5 text-[10px] font-medium text-charcoal">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link to="/student/learning" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-burnt py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:bg-burnt-dark hover:shadow-lg hover:shadow-burnt/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
            Continue <ArrowRightIcon size={14} />
          </Link>
          <Link to="/student/documents" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-sand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ======================== Exam countdown ======================== */

function ExamCountdownCard({ className, nextExam, exams, hasEnrollment }: {
  className?: string;
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-burnt py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/25 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
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
            <div key={u.label} className={`rounded-xl border py-2 text-center ${open ? 'border-orange-200 bg-orange-50' : 'border-sand bg-cream'}`}>
              <div className={`text-lg font-bold leading-none ${open ? 'text-orange-600' : 'text-ink'}`}>
                {open ? '00' : String(u.value).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[9px] font-medium uppercase tracking-wider text-charcoal">{u.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-charcoal">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon size={13} className="text-charcoal" />
            {target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}
            {target.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TimerIcon size={13} className="text-charcoal" /> {nextExam.duration} min
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
              ? 'bg-burnt text-cream shadow-md shadow-burnt/25 hover:bg-burnt-dark focus-visible:ring-burnt/40'
              : 'bg-cream text-charcoal hover:bg-sand focus-visible:ring-burnt/40'
          }`}
        >
          {unlocked ? <><PlayIcon size={14} /> {open ? 'Start Exam Now' : 'Go to Exam'}</> : 'Go to Learning'}
        </Link>
      </div>
    );
  } else if (nextExam && !target) {
    body = (
      <div className="space-y-3">
        <div className="rounded-xl border border-sand bg-cream p-3 text-xs text-charcoal">
          The exam date hasn't been announced yet. Complete your modules in the meantime.
        </div>
        <Link to="/student/learning" className="flex w-full items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-sand-dark">
          Go to Learning
        </Link>
      </div>
    );
  } else if (latestResult) {
    const passed = latestResult.status === 'completed';
    body = (
      <div className="space-y-3">
        <div className={`rounded-xl border p-3 text-center ${passed ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
          <div className={`text-xl font-bold ${passed ? 'text-orange-700' : 'text-red-600'}`}>
            {latestResult.score != null ? `${latestResult.score}%` : passed ? 'Passed' : 'Not passed'}
          </div>
          <div className={`mt-0.5 text-[11px] font-medium ${passed ? 'text-orange-600' : 'text-red-500'}`}>
            {passed ? 'Exam completed' : 'Exam failed'}
          </div>
        </div>
        <Link to="/student/documents" className="flex w-full items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-sand-dark">
          View Documents <ArrowRightIcon size={13} />
        </Link>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-sand bg-cream/70 p-4 text-center">
          <HourglassIcon size={22} className="mx-auto text-charcoal" />
          <p className="mt-2 text-xs font-medium text-charcoal">No exam scheduled yet</p>
          <p className="mt-0.5 text-[11px] text-charcoal">
            {hasEnrollment ? 'Finish your learning modules to unlock it.' : 'Enroll in a program to get certified.'}
          </p>
        </div>
        <Link
          to={hasEnrollment ? '/student/learning' : '/student/select-track'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-sand-dark"
        >
          {hasEnrollment ? 'Go to Learning' : 'Select a Track'} <ArrowRightIcon size={13} />
        </Link>
      </div>
    );
  }

  return (
    <section className={`bento-card rounded-[24px] border border-sand bg-alabaster p-5 shadow-bento ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`${iconChip} shrink-0 border border-burnt/20 bg-burnt-tint text-burnt`}><HourglassIcon size={17} /></span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold text-ink">Exam Countdown</h3>
            <p className="mt-0.5 truncate font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal">
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
    </section>
  );
}

/* ======================== Completion ring (shown in hero) ======================== */

function CompletionRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const complete = pct >= 100;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-sand" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className={`${complete ? 'text-burnt' : 'text-orange-300'} transition-all duration-700`}
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-sm font-bold ${complete ? 'text-burnt' : 'text-ink'}`}
        role="status"
        aria-label={`Profile ${pct}% complete`}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ========================= Announcements ========================= */

function AnnouncementsCard({ className, initial, initialUnread, total }: { className?: string; initial: Announcement[]; initialUnread: number; total: number }) {
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
    <section className={`bento-card overflow-hidden rounded-[24px] border border-sand bg-alabaster shadow-bento ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-sand px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`${iconChip} shrink-0 border border-burnt/20 bg-burnt-tint text-burnt`}><MegaphoneIcon size={17} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-sm font-semibold text-ink">Announcements</h3>
              {unread > 0 && <Badge tone="warning">{unread} new</Badge>}
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal">Latest news from the team</p>
          </div>
        </div>
        {(expanded || total > 3) && (
          <Button variant="ghost" size="sm" onClick={toggle} loading={loadingAll}>
            {expanded ? 'Show less' : 'View all'}
          </Button>
        )}
      </div>

      <div className="divide-y divide-sand">
        {display.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-charcoal">No announcements yet.</p>
        )}
        {display.map(a => (
          <button
            key={a.id}
            onClick={() => openItem(a)}
            className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors ${a.read ? 'hover:bg-cream' : 'bg-burnt-tint/50 hover:bg-burnt-tint'}`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.read ? 'bg-sand' : 'bg-burnt'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-sm ${a.read ? 'text-charcoal' : 'font-semibold text-ink'}`}>{a.title}</span>
                <span className="shrink-0 text-[10px] text-charcoal">{formatTime(a.createdAt)}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-charcoal">{a.message}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ============================ Support ============================ */

function SupportCard({ className }: { className?: string }) {
  return (
    <section className={`bento-card rounded-[24px] border border-sand bg-alabaster p-5 shadow-bento ${className ?? ''}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`${iconChip} shrink-0 border border-burnt/20 bg-burnt-tint text-burnt`}><MessageCircleIcon size={17} /></span>
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold text-ink">Need help?</h3>
          <p className="mt-0.5 truncate font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal">We're a message away</p>
        </div>
      </div>

      <div className="space-y-2">
        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl bg-burnt px-4 py-3 text-sm font-bold text-cream shadow-[0_8px_20px_rgba(217,84,30,0.25)] transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50"
        >
          <MessageCircleIcon size={16} />
          <span className="flex-1">Join WhatsApp</span>
          <ExternalLinkIcon size={13} className="opacity-80" />
        </a>
        <Link
          to="/contact"
          className="flex items-center gap-3 rounded-xl border border-sand bg-cream px-4 py-3 text-sm font-semibold text-charcoal transition-colors hover:border-sand-dark hover:bg-alabaster focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <MailIcon size={16} className="text-charcoal" />
          <span className="flex-1">Contact Support</span>
          <ArrowRightIcon size={13} className="text-charcoal" />
        </Link>
        <Link
          to="/faq"
          className="flex items-center gap-3 rounded-xl border border-sand bg-cream px-4 py-3 text-sm font-semibold text-charcoal transition-colors hover:border-sand-dark hover:bg-alabaster focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <BookOpenTextIcon size={16} className="text-charcoal" />
          <span className="flex-1">FAQ & Guides</span>
          <ArrowRightIcon size={13} className="text-charcoal" />
        </Link>
      </div>
    </section>
  );
}
