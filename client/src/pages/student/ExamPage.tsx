import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Award, BookOpen, ClipboardList, Clock, Frown, Lock,
  PlayCircle, Target, Trophy,
} from 'lucide-react';
import { studentApi } from '../../api';
import type { Certificate, Enrollment, Exam } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton, EmptyState } from '../../components/ui';
import TrackAside, { type TrackStatus } from '../../components/learning/TrackAside';
import TrackBanner, { bannerCta } from '../../components/learning/TrackBanner';
import TrackStat from '../../components/learning/TrackStat';

/* Student examination hub in the mockup's layout language: the shared
   "Your Tracks" aside on the left, and on the right a rich noir state
   banner (pass/fail/in-progress/locked/ready) over real stat cards.
   Red marks failures, amber marks in-progress, burnt marks achievements. */

const primaryLink = 'inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-6 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50';

const gradeFor = (score: number) =>
  score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const examStatus = (exam?: Exam): TrackStatus => {
  if (!exam) return { text: 'No Exam', tone: 'default' };
  if (exam.status === 'completed') return { text: 'Passed', tone: 'burnt' };
  if (exam.status === 'failed') return { text: 'Not Passed', tone: 'red' };
  if (exam.status === 'in_progress') return { text: 'In Progress', tone: 'amber' };
  if (exam.courseCompleted === false) return { text: 'Locked', tone: 'default' };
  return { text: 'Ready', tone: 'burnt' };
};

export default function ExamPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getDashboard().then((res) => {
      const active = (res.data.enrollments || []).filter(
        (e: Enrollment) => e.status === 'active' || e.status === 'completed'
      );
      const allExams = res.data.exams || [];
      setEnrollments(active);
      setExams(allExams);
      setCertificates(res.data.certificates || []);
      // Default to the first track with an exam still to take; once every
      // exam is passed, land on the first track.
      const first = active.find((e) => {
        const ex = allExams.find((x) => x.enrollmentId === e.id);
        return ex && ex.status !== 'completed';
      }) || active[0];
      if (first) setSelectedId(first.id);
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
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load exam details"
          description="Something went wrong while fetching your exams. Please try again."
          action={<button type="button" onClick={load} className={primaryLink}>Retry</button>}
        />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="No Active Enrollment"
          description="Select a track first to access exams."
          action={<Link to="/student/select-track" className={primaryLink}>Select a Track <ArrowRight size={15} /></Link>}
        />
      </div>
    );
  }

  const selected = enrollments.find(e => e.id === selectedId) || enrollments[0];
  const trackExams = exams.filter(x => x.enrollmentId === selected.id);
  // A retake may leave several rows; prefer the passed attempt, then the
  // one in progress, then whatever exists.
  const exam = trackExams.find(x => x.status === 'completed')
    || trackExams.find(x => x.status === 'in_progress')
    || trackExams[0];
  const certificate = certificates.find(c => c.enrollmentId === selected.id);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <TrackAside
        enrollments={enrollments}
        selectedId={selected.id}
        onSelect={setSelectedId}
        statusFor={(e) => examStatus(exams.find(x => x.enrollmentId === e.id))}
      />

      <section className="flex flex-col gap-6 lg:col-span-8">
        <ExamTrackView key={selected.id} enrollment={selected} exam={exam} certificate={certificate} />
      </section>
    </div>
  );
}

function ExamTrackView({ enrollment, exam, certificate }: {
  enrollment: Enrollment;
  exam?: Exam;
  certificate?: Certificate;
}) {
  const { user } = useAuth();
  const name = user?.firstName?.trim();

  if (!exam) {
    return (
      <TrackBanner
        tone="cream"
        icon={<BookOpen size={32} strokeWidth={2} />}
        title="Exam not available yet"
        description={
          <>
            The final exam for <strong className="text-cream">{enrollment.internshipTitle}</strong> hasn't been
            configured yet. It will appear here once it's ready.
          </>
        }
        action={
          <Link to="/student/learning" className={bannerCta}>
            Continue Learning <ArrowRight size={18} strokeWidth={3} />
          </Link>
        }
      />
    );
  }

  const score = exam.score ?? 0;
  const completedOn = formatDate(certificate?.issuedAt || exam.completedAt);
  const scheduled = formatDate(exam.scheduledAt);

  if (exam.status === 'completed') {
    const grade = certificate?.grade || gradeFor(score);
    return (
      <>
        <TrackBanner
          tone="burnt"
          icon={<Trophy size={32} strokeWidth={2} />}
          title={name ? `You cleared it, ${name}!` : 'You cleared it!'}
          description={
            <>
              You passed the <strong className="text-cream">{enrollment.internshipTitle}</strong> final exam
              {completedOn ? ` on ${completedOn}` : ''} — your certificate is ready.
            </>
          }
          action={
            <Link to="/student/documents" className={bannerCta}>
              View Certificate <ArrowRight size={18} strokeWidth={3} />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TrackStat icon={<ClipboardList size={20} strokeWidth={2.5} />} value={`${score}%`} label="Exam Score" />
          <TrackStat icon={<Target size={20} strokeWidth={2.5} />} value={`${exam.passingMarks}%`} label="Pass Mark" />
          <TrackStat tone="burnt" icon={<Award size={20} strokeWidth={2.5} />} value={grade} label="Grade" />
        </div>
      </>
    );
  }

  if (exam.status === 'failed') {
    return (
      <>
        <TrackBanner
          tone="red"
          icon={<Frown size={32} strokeWidth={2} />}
          title="Not passed yet"
          description={
            <>
              You scored <strong className="text-cream">{score}%</strong> on the{' '}
              <strong className="text-cream">{enrollment.internshipTitle}</strong> final exam. Review the learning
              modules and contact your administrator to request a retake.
            </>
          }
          action={
            <Link to="/student/learning" className={bannerCta}>
              Review Modules <ArrowRight size={18} strokeWidth={3} />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TrackStat icon={<ClipboardList size={20} strokeWidth={2.5} />} value={`${score}%`} label="Exam Score" />
          <TrackStat icon={<Target size={20} strokeWidth={2.5} />} value={`${exam.passingMarks}%`} label="Pass Mark" />
          <TrackStat icon={<Award size={20} strokeWidth={2.5} />} value="—" label="Grade" />
        </div>
      </>
    );
  }

  if (exam.status === 'in_progress') {
    return (
      <TrackBanner
        tone="amber"
        icon={<Clock size={32} strokeWidth={2} />}
        title="Exam in progress"
        description={
          <>
            You've started the <strong className="text-cream">{enrollment.internshipTitle}</strong> final exam —
            jump back in to finish it. {exam.duration} min · Pass {exam.passingMarks}%
          </>
        }
        action={
          <Link to={`/student/exam/${exam.enrollmentId}`} className={bannerCta}>
            Resume Exam <ArrowRight size={18} strokeWidth={3} />
          </Link>
        }
      />
    );
  }

  if (exam.courseCompleted === false) {
    const courseProgress = exam.courseProgress || 0;
    const modulesPublished = (exam.moduleCount ?? 0) > 0;
    return (
      <TrackBanner
        tone="cream"
        icon={<Lock size={32} strokeWidth={2} />}
        title={name ? `Almost there, ${name}!` : 'Almost there!'}
        description={
          modulesPublished ? (
            <>
              Complete all learning modules to unlock the{' '}
              <strong className="text-cream">{enrollment.internshipTitle}</strong> final exam — you're{' '}
              {courseProgress}% through the course.
            </>
          ) : (
            <>
              Learning modules for <strong className="text-cream">{enrollment.internshipTitle}</strong> have not
              been published yet. Please check back soon.
            </>
          )
        }
        progress={modulesPublished ? { pct: courseProgress, label: `${courseProgress}% Course Progress` } : undefined}
        action={
          <Link to="/student/learning" className={bannerCta}>
            Continue Learning <ArrowRight size={18} strokeWidth={3} />
          </Link>
        }
      />
    );
  }

  return (
    <TrackBanner
      tone="burnt"
      icon={<PlayCircle size={32} strokeWidth={2} />}
      title={name ? `Ready when you are, ${name}!` : 'Your exam is ready'}
      description={
        <>
          {scheduled ? `Scheduled for ${scheduled}. ` : ''}
          The <strong className="text-cream">{enrollment.internshipTitle}</strong> final exam is waiting:{' '}
          {exam.totalQuestions} questions · {exam.duration} min · pass {exam.passingMarks}%
        </>
      }
      action={
        <Link to={`/student/exam/${exam.enrollmentId}`} className={bannerCta}>
          Start Exam <ArrowRight size={18} strokeWidth={3} />
        </Link>
      }
    />
  );
}
