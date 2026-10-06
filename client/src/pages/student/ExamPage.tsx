import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, CheckCircle2, ClipboardList,
  Clock, Frown, Lock, PartyPopper, PlayCircle,
} from 'lucide-react';
import { studentApi } from '../../api';
import type { Certificate, Enrollment, Exam } from '../../api';
import { PageHeader, PageSkeleton, EmptyState, Button } from '../../components/ui';

const primaryLink = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

const gradeFor = (score: number) =>
  score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

export default function ExamPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getDashboard().then((res) => {
      const active = (res.data.enrollments || []).filter(
        (e: Enrollment) => e.status === 'active' || e.status === 'completed'
      );
      setEnrollments(active);
      setExams(res.data.exams || []);
      setCertificates(res.data.certificates || []);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton label="Loading examination..." />;

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Examination" subtitle="Test your knowledge and earn your certificate" />
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load exam details"
          description="Something went wrong while fetching your exams. Please try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  const passed = exams.filter(e => e.status === 'completed');
  const upcoming = exams.filter(e => e.status !== 'completed');
  const examless = enrollments.filter(e => !exams.some(x => x.enrollmentId === e.id));

  if (enrollments.length === 0 && exams.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Examination" subtitle="Test your knowledge and earn your certificate" />
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="No Active Enrollment"
          description="Select a track first to access exams."
          action={<Link to="/student/select-track" className={primaryLink}>Select a Track <ArrowRight size={15} /></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Examination" subtitle="Test your knowledge and earn your certificate" />

      {passed.length > 0 && (
        <section>
          <SectionHeading
            title="Passed Exams"
            count={passed.length}
            icon={<CheckCircle2 className="h-4 w-4" />}
            iconClass="bg-emerald-100 text-emerald-600"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {passed.map(exam => (
              <PassedCard
                key={exam.id}
                exam={exam}
                certificate={certificates.find(c => c.enrollmentId === exam.enrollmentId)}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeading
            title="Upcoming Exams"
            count={upcoming.length}
            icon={<CalendarClock className="h-4 w-4" />}
            iconClass="bg-slate-100 text-slate-700"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {upcoming.map(exam => (
              <UpcomingCard key={exam.id} exam={exam} />
            ))}
          </div>
        </section>
      )}

      {examless.length > 0 && (
        <section>
          <SectionHeading
            title="Exam Not Available Yet"
            count={examless.length}
            noun="program"
            icon={<BookOpen className="h-4 w-4" />}
            iconClass="bg-slate-100 text-slate-700"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {examless.map(enrollment => (
              <div key={enrollment.id} className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 shadow-soft">
                <h3 className="text-sm font-semibold text-slate-900">{enrollment.internshipTitle}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  The final exam for this program hasn't been configured yet. It will appear here once available.
                </p>
                <Link to="/student/learning" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900">
                  Continue Learning <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {passed.length === 0 && upcoming.length === 0 && examless.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="No Exams Yet"
          description="Complete your learning modules to unlock your final exams."
          action={<Link to="/student/learning" className={primaryLink}>Go to Learning <ArrowRight size={15} /></Link>}
        />
      )}
    </div>
  );
}

function SectionHeading({ title, count, noun = 'exam', icon, iconClass }: {
  title: string;
  count: number;
  noun?: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <span className="text-xs text-slate-500">{count} {noun}{count === 1 ? '' : 's'}</span>
    </div>
  );
}

function PassedCard({ exam, certificate }: { exam: Exam; certificate?: Certificate }) {
  const score = exam.score ?? 0;
  const grade = certificate?.grade || gradeFor(score);
  const completedOn = formatDate(certificate?.issuedAt || exam.completedAt);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <PartyPopper size={18} />
        </div>
        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Passed</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{exam.internshipTitle || 'Final Exam'}</h3>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold leading-none text-slate-900">{score}%</span>
        <span className="mb-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Grade {grade}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{completedOn ? `Completed ${completedOn}` : 'Completed'}</p>
      <Link to="/student/documents" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
        View Certificate <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function UpcomingCard({ exam }: { exam: Exam }) {
  const href = `/student/exam/${exam.enrollmentId}`;
  const title = exam.internshipTitle || 'Final Exam';

  if (exam.status === 'failed') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-soft">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
            <Frown size={18} />
          </div>
          <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">Not Passed</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">
          Score <span className="font-semibold text-slate-900">{exam.score ?? 0}%</span>
          <span className="mx-1.5 text-slate-400">|</span>
          Required {exam.passingMarks}%
        </p>
        <p className="mt-3 text-xs text-slate-500">Review the learning modules and contact your administrator to request a retake.</p>
      </div>
    );
  }

  if (exam.status === 'in_progress') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-soft">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Clock size={18} />
          </div>
          <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">In Progress</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">You've started this exam. Jump back in to finish it.</p>
        <Link to={href} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
          Resume Exam <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  if (exam.courseCompleted === false) {
    const progress = exam.courseProgress || 0;
    const modulesPublished = (exam.moduleCount ?? 0) > 0;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Lock size={18} />
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Locked</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {modulesPublished
            ? 'Complete all learning modules to unlock the final exam.'
            : 'Learning modules for this track have not been published yet. Please check back soon.'}
        </p>
        {modulesPublished && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span>Course Progress</span>
              <span className="font-semibold text-slate-900">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <Link to="/student/learning" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900">
          Continue Learning <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  const scheduled = formatDate(exam.scheduledAt);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <PlayCircle size={18} />
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          {scheduled ? 'Scheduled' : 'Ready'}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {scheduled && <p className="mt-1 text-xs text-slate-500">Scheduled for {scheduled}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{exam.totalQuestions} questions</span>
        <span>{exam.duration} min</span>
        <span>Pass {exam.passingMarks}%</span>
      </div>
      <Link to={href} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
        Start Exam <ArrowRight size={14} />
      </Link>
    </div>
  );
}
