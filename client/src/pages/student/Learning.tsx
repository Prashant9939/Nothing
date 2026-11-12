import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Award, BookOpen, CheckCircle, Clock, FileText, Rocket, Trophy } from 'lucide-react';
import { studentApi } from '../../api';
import type { Enrollment, Exam, LearningModule, Payment } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';
import { PageLoader, PageSkeleton, EmptyState } from '../../components/ui';
import TrackAside from '../../components/learning/TrackAside';
import TrackBanner, { bannerCta } from '../../components/learning/TrackBanner';
import TrackStat from '../../components/learning/TrackStat';
import ModuleCard from '../../components/learning/ModuleCard';
import InteractiveQuiz from '../../components/learning/InteractiveQuiz';
import VideoPlayer from '../../components/learning/VideoPlayer';
import CodeBlock from '../../components/learning/CodeBlock';
import ResourceList from '../../components/learning/ResourceList';

type LearningMod = LearningModule;

interface LearningProgressData {
  totalModules: number;
  completedCount: number;
  percentage: number;
  completedModules: number[];
}

const primaryLink = 'inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-6 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:-translate-y-0.5 hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50';
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50 disabled:pointer-events-none disabled:opacity-60';
const spinner = <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" aria-hidden="true" />;

export default function Learning() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getDashboard().then((res) => {
      // Only tracks whose payment completed — a pending/failed/refunded
      // payment must never expose its learning modules.
      const paidIds = new Set(
        (res.data.payments || []).filter((p: Payment) => p.status === 'completed').map((p: Payment) => p.enrollmentId)
      );
      const all = res.data.enrollments.filter(
        (e: Enrollment) => (e.status === 'active' || e.status === 'completed') && paidIds.has(e.id)
      );
      setEnrollments(all);
      setExams(res.data.exams || []);
      const first = all.find((e: Enrollment) => e.progress < 100) || all[0];
      if (first) setSelectedId(first.id);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton label="Loading your tracks..." />;

  if (loadError) {
    return (
      <div className="space-y-6">
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load your programs"
          description="Something went wrong while fetching your enrollments. Check your connection and try again."
          action={<button type="button" onClick={load} className={btnPrimary}>Retry</button>}
        />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<Rocket size={22} />}
          title="No Active Programs"
          description="Select a track first to start learning."
          action={<Link to="/student/select-track" className={primaryLink}>Select a Track</Link>}
        />
      </div>
    );
  }

  const selected = enrollments.find(e => e.id === selectedId) || enrollments[0];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <TrackAside
        enrollments={enrollments}
        selectedId={selected.id}
        onSelect={setSelectedId}
        statusFor={(e) => ({
          text: e.progress >= 100 ? 'Completed' : e.progress > 0 ? `In Progress · ${e.progress}%` : 'Not Started',
          tone: 'default',
        })}
      />

      <section className="flex flex-col gap-6 lg:col-span-8">
        <LearningSection
          key={selected.id}
          enrollment={selected}
          exam={exams.find(ex => ex.enrollmentId === selected.id)}
        />
      </section>
    </div>
  );
}

function LearningSection({ enrollment, exam }: { enrollment: Enrollment; exam?: Exam }) {
  const popup = usePopup();
  const { user } = useAuth();
  const [modules, setModules] = useState<LearningMod[]>([]);
  const [progress, setProgress] = useState<LearningProgressData | null>(null);
  const [selectedModule, setSelectedModule] = useState<LearningMod | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    if (!enrollment.internshipId) return;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      studentApi.getLearningModules(enrollment.internshipId),
      studentApi.getLearningProgress(enrollment.internshipId)
    ]).then(([modulesRes, progressRes]) => {
      setModules(modulesRes.data.modules || []);
      setProgress(progressRes.data.progress || { totalModules: 0, completedCount: 0, percentage: 0, completedModules: [] });
      setLoading(false);
    }).catch(() => {
      setModules([]);
      setProgress(null);
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [enrollment.internshipId]);

  const handleModuleComplete = async () => {
    try {
      const res = await studentApi.getLearningProgress(enrollment.internshipId);
      setProgress(res.data.progress);
    } catch {
      popup.error('Your module was saved, but progress could not be refreshed.', 'Refresh Failed');
    }
  };

  if (loading) return <PageLoader label="Loading modules..." className="h-auto py-12" />;

  if (loadError) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title="Couldn't load learning content"
        description="Something went wrong while fetching modules and progress. Please try again."
        action={<button type="button" onClick={load} className={btnPrimary}>Retry</button>}
      />
    );
  }

  if (selectedModule) {
    return (
      <ModuleContentView
        module={selectedModule}
        onBack={() => setSelectedModule(null)}
        onComplete={handleModuleComplete}
        enrollmentId={enrollment.id}
      />
    );
  }

  if (modules.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={22} />}
        title="No Learning Modules Yet"
        description="Learning modules are being prepared for this track. Check back soon!"
      />
    );
  }

  const completedModules = progress?.completedModules || [];
  const totalModules = progress?.totalModules ?? modules.length;
  const completedCount = progress?.completedCount || 0;
  const pct = progress?.percentage || 0;
  // "Completed" only when the track actually has modules and all of them
  // are done — an empty curriculum must never render as completed.
  const isComplete = (progress?.totalModules ?? 0) > 0 && pct >= 100;
  const totalMinutes = modules.reduce((acc, m) => acc + (m.durationMinutes || 0), 0);
  const hoursValue = totalMinutes >= 60 ? Math.round(totalMinutes / 60) : totalMinutes;
  const hoursUnit = totalMinutes >= 60 ? 'h' : 'm';
  const name = user?.firstName?.trim();

  const continueToFirstModule = () => {
    const next = modules.find((_, i) => !completedModules.includes(i) && (i === 0 || completedModules.includes(i - 1)));
    if (next) setSelectedModule(next);
  };

  return (
    <>
      {isComplete ? (
        <TrackBanner
          tone="burnt"
          icon={<Trophy size={32} strokeWidth={2} />}
          title={name ? `You did it, ${name}!` : 'You did it!'}
          description={
            <>
              You have successfully completed all modules for the{' '}
              <strong className="text-cream">{enrollment.internshipTitle}</strong> track.
            </>
          }
          action={
            <Link to="/student/exam-page" className={bannerCta}>
              {exam?.status === 'completed' ? 'View Exam Result' : exam ? 'Take the Final Exam' : 'Go to Exam Hub'}
              <ArrowRight size={18} strokeWidth={3} />
            </Link>
          }
        />
      ) : (
        <TrackBanner
          tone="burnt"
          icon={<Rocket size={32} strokeWidth={2} />}
          title={name ? `Keep going, ${name}!` : 'Keep going!'}
          description={
            <>
              You've completed <strong className="text-cream">{completedCount} of {totalModules}</strong> modules for
              the <strong className="text-cream">{enrollment.internshipTitle}</strong> track.
            </>
          }
          progress={{ pct, label: `${pct}% Complete` }}
          action={
            <button type="button" onClick={continueToFirstModule} className={bannerCta}>
              Continue Learning <ArrowRight size={18} strokeWidth={3} />
            </button>
          }
        />
      )}

      {/* Track stats (mockup grid) — real numbers only */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TrackStat
          icon={<Award size={20} strokeWidth={2.5} />}
          value={`${pct}%`}
          label="Completion"
        />
        <TrackStat
          icon={<BookOpen size={20} strokeWidth={2.5} />}
          value={<>{completedCount}<span className="text-xl text-noir/40">/{totalModules}</span></>}
          label="Modules Passed"
        />
        <TrackStat
          tone="burnt"
          icon={<Clock size={20} strokeWidth={2.5} />}
          value={<>{hoursValue}<span className="text-xl opacity-60">{hoursUnit}</span></>}
          label={totalMinutes >= 60 ? 'Course Hours' : 'Content Minutes'}
        />
      </div>

      {/* Completed tracks: jump straight to earned documents */}
      {isComplete && (
        <div className="flex justify-center">
          <Link
            to="/student/documents"
            className="inline-flex items-center gap-2 rounded-xl border border-sand bg-cream px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-sand-dark hover:bg-alabaster focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            View Certificates &amp; Documents <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Module list — only while the track is still in progress */}
      {!isComplete && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-7 w-2.5 shrink-0 rounded-full bg-burnt" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold uppercase leading-tight tracking-tight text-ink sm:text-xl">Course Modules</h3>
            </div>
            <span className="shrink-0 rounded-xl border border-sand bg-alabaster px-3.5 py-1.5 text-center shadow-bento">
              <span className="block font-display text-base font-bold leading-none text-ink">{modules.length}</span>
              <span className="mt-0.5 block font-mono text-[10px] font-semibold uppercase leading-none text-charcoal">
                {modules.length === 1 ? 'Module' : 'Modules'}
              </span>
            </span>
          </div>
          <div className="space-y-3">
            {modules.map((module, index) => {
              const isCompleted = completedModules.includes(index);
              const isLocked = index > 0 && !completedModules.includes(index - 1);

              return (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  onClick={() => setSelectedModule(module)}
                />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function ModuleContentView({
  module,
  onBack,
  onComplete,
  enrollmentId
}: {
  module: LearningMod;
  onBack: () => void;
  onComplete: () => void;
  enrollmentId: number;
}) {
  const popup = usePopup();
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'resources'>('content');
  const [isCompleted, setIsCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleMarkComplete = async () => {
    setSaving(true);
    try {
      await studentApi.completeModule(enrollmentId, module.moduleOrder - 1);
      setIsCompleted(true);
      onComplete();
      popup.success('Module marked as complete. Keep it up!', 'Progress Saved');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not mark this module as complete. Please try again.', 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleQuizComplete = (score: number) => {
    if (score >= 70) popup.success(`You scored ${score}% on this quiz.`, 'Quiz Completed');
    else popup.notify(`You scored ${score}%. Give it another try!`, { title: 'Quiz Completed' });
  };

  const tabs = [
    { id: 'content' as const, label: 'Content', icon: <BookOpen className="h-4 w-4" />, count: null },
    { id: 'quiz' as const, label: 'Quiz', icon: <Award className="h-4 w-4" />, count: module.quizQuestions?.length || 0 },
    { id: 'resources' as const, label: 'Resources', icon: <FileText className="h-4 w-4" />, count: module.resources?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          aria-label="Back to module list"
          className="shrink-0 rounded-xl border border-sand bg-cream p-2 text-charcoal transition-colors hover:border-sand-dark hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-bold text-ink">{module.title}</h2>
          <p className="mt-1 break-words text-sm text-charcoal">{module.description}</p>
        </div>
        {!isCompleted && (
          <button
            type="button"
            disabled={saving}
            onClick={handleMarkComplete}
            className={`${btnPrimary} shrink-0`}
          >
            {saving ? spinner : <CheckCircle className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Mark Complete'}
          </button>
        )}
        {isCompleted && (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-burnt/25 bg-burnt-tint px-4 py-2 text-sm font-semibold text-burnt">
            <CheckCircle className="h-4 w-4" />
            Completed
          </div>
        )}
      </div>

      {/* Video */}
      {module.videoUrl && (
        <VideoPlayer url={module.videoUrl} title={module.title} />
      )}

      {/* Tabs - sticky below the topbar; bleeds to the viewport edge except at
          lg where the right column sits beside the track aside. */}
      <div className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain border-b border-sand bg-alabaster/95 px-4 pb-2 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:ml-0 lg:-mr-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Module sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
              activeTab === tab.id ? 'bg-noir text-cream shadow-bento' : 'text-charcoal hover:bg-cream hover:text-ink'
            }`}
          >
            {tab.icon}
            {tab.label}{tab.count !== null && ` (${tab.count})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Learning Objectives */}
          {module.learningObjectives && module.learningObjectives.length > 0 && (
            <div className="rounded-[24px] border border-burnt/20 bg-burnt-tint p-5">
              <h3 className="mb-3 font-display text-sm font-bold text-burnt">Learning Objectives</h3>
              <ul className="space-y-2">
                {module.learningObjectives.map((objective: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-ink">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-burnt" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reading Material */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-burnt" />
              <h3 className="font-display text-sm font-bold text-ink">Reading Material</h3>
          <span className="font-mono text-xs text-charcoal">
            {module.contentSections?.length || 0} section{(module.contentSections?.length || 0) === 1 ? '' : 's'} for this topic
          </span>
            </div>

            {module.contentSections && module.contentSections.length > 0 ? (
              <div className="space-y-4">
                {module.contentSections.map((section, index) => (
                  <div key={section.id} className="rounded-[24px] border border-sand bg-alabaster p-5 shadow-bento">
                    <div className="mb-3 flex items-start gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border font-mono text-[11px] font-bold ${index % 2 === 0 ? 'border-burnt/20 bg-burnt-tint text-burnt' : 'border-sand bg-cream text-ink'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="min-w-0 break-words font-display text-base font-bold text-ink">{section.title}</h4>
                    </div>
                    <p className="whitespace-pre-line break-words pl-10 text-sm leading-relaxed text-charcoal">{section.content}</p>
                    {section.codeExample && (
                      <div className="mt-4 pl-10">
                        <CodeBlock code={section.codeExample} language={section.language || 'javascript'} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-sand-dark bg-cream/60 p-6 text-center">
                <p className="text-sm text-charcoal">Reading material for this module is being prepared. Watch the video above and try the quiz meanwhile.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <InteractiveQuiz
          questions={module.quizQuestions || []}
          onComplete={handleQuizComplete}
        />
      )}

      {activeTab === 'resources' && (
        <ResourceList resources={module.resources || []} />
      )}
    </div>
  );
}
