import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle, Clock, FileText, PartyPopper, Rocket } from 'lucide-react';
import { studentApi } from '../../api';
import type { Enrollment, Exam, LearningModule } from '../../api';
import { usePopup } from '../../context/PopupContext';
import { PageHeader, PageLoader, EmptyState, Button } from '../../components/ui';
import CircularProgress from '../../components/learning/CircularProgress';
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

const primaryLink = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

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
      const all = res.data.enrollments.filter((e: Enrollment) => e.status === 'active' || e.status === 'completed');
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

  if (loading) return <PageLoader label="Loading your modules..." />;

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Learning Modules" subtitle="Track your progress and complete modules" />
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load your programs"
          description="Something went wrong while fetching your enrollments. Check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Learning Modules" subtitle="Track your progress and complete modules" />
        <EmptyState
          icon={<Rocket size={22} />}
          title="No Active Programs"
          description="Select a track first to start learning."
          action={<Link to="/student/select-track" className={primaryLink}>Select a Track</Link>}
        />
      </div>
    );
  }

  const selected = enrollments.find(e => e.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Modules" subtitle="Track your progress and complete modules" />

      {enrollments.length > 1 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Select Track</h2>
          <div className="flex flex-wrap gap-2">
            {enrollments.map(e => {
              const isComplete = e.progress >= 100;
              const isSelected = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : isComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {isComplete && <Check size={13} />}
                  {e.internshipTitle}
                  {!isComplete && e.progress > 0 && <span className="text-xs opacity-60">({e.progress}%)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {enrollments.length === 1 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <p className="break-words text-sm text-slate-500">Track: <span className="font-semibold text-slate-900">{enrollments[0].internshipTitle}</span></p>
        </div>
      )}

      {selected && (
        <LearningSection
          key={selected.id}
          enrollment={selected}
          exam={exams.find(ex => ex.enrollmentId === selected.id)}
        />
      )}
    </div>
  );
}

function LearningSection({ enrollment, exam }: { enrollment: Enrollment; exam?: Exam }) {
  const popup = usePopup();
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
        action={<Button onClick={load}>Retry</Button>}
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

  const completedModules = progress?.completedModules || [];
  // "Track Completed" only when the track actually has modules and all of them
  // are done — an empty curriculum must never render as completed.
  const isComplete = (progress?.totalModules ?? 0) > 0 && (progress?.percentage || 0) >= 100;

  if (isComplete) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <PartyPopper size={24} />
        </div>
        <h3 className="mb-1 text-lg font-bold text-emerald-800">Track Completed!</h3>
        <p className="text-sm text-emerald-600">{enrollment.internshipTitle} - All modules completed</p>
        {exam && (
          <Link
            to="/student/exam-page"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            {exam.status === 'completed' ? 'View Exam Result' : 'Take the Final Exam'} <ArrowRight size={14} />
          </Link>
        )}
      </div>
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

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-soft">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <CircularProgress value={progress?.percentage || 0} size={80} strokeWidth={8} className="shrink-0" />
          <div className="w-full min-w-0 flex-1">
            <h3 className="break-words font-semibold text-slate-900">{enrollment.internshipTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {progress?.completedCount || 0} of {progress?.totalModules || modules.length} modules completed
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {modules.reduce((acc, m) => acc + m.durationMinutes, 0)} min total
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                {modules.length} modules
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module List */}
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
    </div>
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
          className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-slate-900">{module.title}</h2>
          <p className="mt-1 break-words text-sm text-slate-500">{module.description}</p>
        </div>
        {!isCompleted && (
          <Button variant="accent" loading={saving} onClick={handleMarkComplete} className="shrink-0">
            {saving ? 'Saving...' : 'Mark Complete'}
          </Button>
        )}
        {isCompleted && (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            Completed
          </div>
        )}
      </div>

      {/* Video */}
      {module.videoUrl && (
        <VideoPlayer url={module.videoUrl} title={module.title} />
      )}

      {/* Tabs - sticky below the topbar */}
      <div className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain border-b border-slate-200 bg-white/95 px-4 pb-2 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Module sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
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
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <h3 className="mb-3 text-sm font-semibold text-sky-800">Learning Objectives</h3>
              <ul className="space-y-2">
                {module.learningObjectives.map((objective: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-sky-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reading Material */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900">Reading Material</h3>
              <span className="text-xs text-slate-400">
                {module.contentSections?.length || 0} section{(module.contentSections?.length || 0) === 1 ? '' : 's'} for this topic
              </span>
            </div>

            {module.contentSections && module.contentSections.length > 0 ? (
              <div className="space-y-4">
                {module.contentSections.map((section, index) => (
                  <div key={section.id} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-soft">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700">
                        {index + 1}
                      </span>
                      <h4 className="min-w-0 break-words text-base font-semibold text-slate-900">{section.title}</h4>
                    </div>
                    <p className="whitespace-pre-line break-words pl-9 text-sm leading-relaxed text-slate-600">{section.content}</p>
                    {section.codeExample && (
                      <div className="mt-4 pl-9">
                        <CodeBlock code={section.codeExample} language={section.language || 'javascript'} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">Reading material for this module is being prepared. Watch the video above and try the quiz meanwhile.</p>
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
