import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Clock, Frown, Lock, PartyPopper, ShieldAlert } from 'lucide-react';
import { studentApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import type { Exam } from '../../api';
import { PageLoader, EmptyState, Modal } from '../../components/ui';

/* Exam runner in the portal design language: alabaster bento cards, burnt
   for primary actions/success, noir for active states, red for failures,
   amber for warnings. Timer, proctoring and submit logic untouched. */

const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50 disabled:pointer-events-none disabled:opacity-60';
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-sand bg-cream px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-alabaster hover:border-sand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:pointer-events-none disabled:opacity-60';
const spinner = <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" aria-hidden="true" />;

export default function StudentExam() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const popup = usePopup();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchExam = useCallback(() => {
    if (!enrollmentId) return;
    setLoading(true);
    setLoadError(false);
    studentApi.getExam(Number(enrollmentId))
      .then((res) => { setExam(res.data.exam); setLoading(false); })
      .catch((err: any) => {
        setExam(null);
        setLoading(false);
        if (err?.response?.status === 404) return;
        setLoadError(true);
        if (!err?.response) popup.error('Cannot reach the server. Check your internet connection and try again.', 'Connection Error');
      });
  }, [enrollmentId, popup]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  useEffect(() => {
    if (started && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (started && timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [started, timeLeft, submitted]);

  const handleVisibilityChange = useCallback(() => {
    if (started && !submitted && document.hidden) {
      setTabSwitchCount(prev => prev + 1);
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
    }
  }, [started, submitted]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  const startExam = async () => {
    if (!exam || starting) return;
    setStarting(true);
    try {
      const res = await studentApi.startExam(exam.id);
      setQuestions(res.data.questions);
      setStarted(true);
      setTimeLeft((res.data.duration || exam.duration) * 60);
      setAnswers(new Array(res.data.questions.length).fill(-1));
    } catch (err: any) {
      const message = err?.response?.data?.error
        || (err?.request
          ? 'Cannot reach the server. Check your internet connection and try again.'
          : 'Something went wrong while starting the exam. Please try again.');
      popup.error(message, "You Can't Start the Exam");
    } finally {
      setStarting(false);
    }
  };

  const selectAnswer = (qIndex: number, aIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = aIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!exam || submitted) return;
    setSubmitted(true);
    const formattedAnswers = answers.map((selectedOption, index) => ({
      questionId: questions[index]?.id || index + 1,
      selectedOption,
    }));
    try {
      const res = await studentApi.submitExam(exam.id, formattedAnswers);
      setResult({ ...res.data, tabSwitchCount });
    } catch (err: any) {
      setSubmitted(false);
      const message = err?.response?.data?.error
        || (err?.request
          ? 'Cannot reach the server. Check your internet connection and try again.'
          : 'Something went wrong while submitting your answers. Please try again.');
      popup.error(message, 'Submission Failed');
    }
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) return <PageLoader label="Loading exam..." />;

  if (loadError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load the exam"
          description="Something went wrong while fetching exam details. Please try again."
          action={<button type="button" onClick={fetchExam} className={btnPrimary}>Retry</button>}
        />
      </div>
    );
  }

  if (!exam) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <EmptyState
        icon={<ClipboardList size={22} />}
        title="No Exam Found"
        description="Enroll in a program first to access exams."
        action={<button type="button" onClick={() => navigate('/student/select-track')} className={btnPrimary}>Select a Track</button>}
      />
    </div>
  );

  if (result) {
    const passed = result.status === 'completed';
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[24px] border border-sand bg-alabaster p-10 text-center shadow-bento">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border ${passed ? 'border-burnt/20 bg-burnt-tint text-burnt' : 'border-red-200 bg-red-100 text-red-500'}`}>
            {passed ? <PartyPopper size={30} /> : <Frown size={30} />}
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink">{passed ? 'Congratulations!' : 'Better Luck Next Time'}</h2>
          <p className="mb-6 text-charcoal">{passed ? 'You passed the exam!' : 'You did not pass. Keep learning and try again.'}</p>
          <div className={`mb-2 font-display text-5xl font-bold ${passed ? 'text-burnt' : 'text-red-500'}`}>{result.score}%</div>
          <p className="mb-4 text-sm text-charcoal">Score: {result.score}% | Required: {exam.passingMarks}%</p>
          {result.tabSwitchCount > 0 && (
            <p className="mb-4 inline-flex items-center gap-1.5 text-sm text-amber-600"><ShieldAlert size={15} /> Tab switches detected: {result.tabSwitchCount}</p>
          )}
          <button type="button" onClick={() => navigate('/student')} className={btnPrimary}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (exam.courseCompleted === false) {
    const progress = exam.courseProgress || 0;
    const modulesPublished = (exam.moduleCount ?? 0) > 0;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[24px] border border-sand bg-alabaster p-10 text-center shadow-bento">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-600">
            <Lock size={26} />
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink">Exam Locked</h2>
          <p className="mb-6 text-sm text-charcoal">
            {modulesPublished
              ? 'Complete all your learning modules to unlock the final exam.'
              : 'Learning modules for this track have not been published yet. Please check back soon.'}
          </p>
          {modulesPublished && (
            <div className="mb-6 text-left">
              <div className="mb-2 flex items-center justify-between text-sm text-charcoal">
                <span>Course Progress</span>
                <span className="font-mono font-bold text-ink">{progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-sand">
                <div className="h-2.5 rounded-full bg-burnt transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <button type="button" onClick={() => navigate('/student/learning')} className={btnPrimary}>Continue Learning</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[24px] border border-sand bg-alabaster p-6 text-center shadow-bento sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sand bg-cream text-charcoal">
            <ClipboardList size={26} />
          </div>
          <h2 className="mb-1 break-words font-display text-2xl font-bold text-ink">{exam.internshipTitle} - Final Exam</h2>
          <p className="mb-8 text-charcoal">Test your knowledge and earn your certificate</p>
          <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="min-w-0 rounded-xl border border-sand bg-cream p-2.5 sm:p-4">
              <div className="break-words font-display text-xl font-bold text-ink sm:text-2xl">{exam.totalQuestions}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-charcoal">Questions</div>
            </div>
            <div className="min-w-0 rounded-xl border border-sand bg-cream p-2.5 sm:p-4">
              <div className="break-words font-display text-xl font-bold text-ink sm:text-2xl">{exam.duration} min</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-charcoal">Duration</div>
            </div>
            <div className="min-w-0 rounded-xl border border-sand bg-cream p-2.5 sm:p-4">
              <div className="break-words font-display text-xl font-bold text-burnt sm:text-2xl">{exam.passingMarks}%</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-charcoal">Passing</div>
            </div>
          </div>
          <div className="mb-6 inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-700">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            Tab switching during the exam will be recorded and reported.
          </div>
          <div>
            <button type="button" onClick={() => setShowRules(true)} disabled={starting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-7 py-3 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50 disabled:pointer-events-none disabled:opacity-60">
              Start Exam
            </button>
          </div>

          <Modal open={showRules} onClose={() => setShowRules(false)} title="Before You Start the Exam" maxWidth="max-w-lg">
            <div className="-mx-6 -mt-6 mb-4 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4">
              <ShieldAlert size={20} className="shrink-0 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-amber-900">Before You Start the Exam</h3>
                <p className="text-xs text-amber-700">Please read all the rules carefully</p>
              </div>
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto overscroll-contain pr-1 text-sm text-charcoal">
              <div className="flex gap-3"><span className="font-bold text-ink">1.</span><p>The timer starts immediately once you tap <b>Agree &amp; Start</b>. The exam auto-submits when time runs out.</p></div>
              <div className="flex gap-3"><span className="font-bold text-ink">2.</span><p>Switching tabs or leaving this window is <b>recorded and reported</b>. Repeated violations may fail your attempt.</p></div>
              <div className="flex gap-3"><span className="font-bold text-ink">3.</span><p>The exam cannot be paused. Once started, leaving the page resets your attempt — answer carefully before navigating away.</p></div>
              <div className="flex gap-3"><span className="font-bold text-ink">4.</span><p>All questions are multiple choice. You need <b>{exam.passingMarks}% or more</b> to pass and earn your certificate.</p></div>
              <div className="flex gap-3"><span className="font-bold text-ink">5.</span><p>Unanswered questions are counted as incorrect. Use the question palette to review before submitting.</p></div>
              <div className="flex gap-3"><span className="font-bold text-ink">6.</span><p>Keep a stable internet connection. Submitting once is final — your score is generated instantly.</p></div>
              <div className="rounded-xl border border-sand bg-cream p-3 font-mono text-xs text-charcoal">
                {exam.totalQuestions} questions • {exam.duration} minutes • Passing: {exam.passingMarks}%
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => navigate('/student')} className={`${btnSecondary} flex-1`}>Deny &amp; Exit</button>
              <button type="button" disabled={starting} onClick={() => { setShowRules(false); startExam(); }}
                className={`${btnPrimary} flex-1 disabled:opacity-60`}>
                {starting ? <>{spinner} Starting…</> : 'Agree & Start'}
              </button>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  const answeredCount = answers.filter(a => a >= 0).length;
  const answeredPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const lowTime = timeLeft < 60;

  return (
    <div className="mx-auto max-w-5xl px-4">
      {showWarning && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <ShieldAlert size={16} className="shrink-0" />
          Tab switch detected! ({tabSwitchCount} total). This will be recorded.
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-[24px] border border-sand bg-alabaster p-6 shadow-bento sm:p-8">
          <div className="mb-6 border-b border-sand pb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold text-ink">Question {currentQ + 1} of {questions.length}</h2>
                <p className="mt-1 truncate text-sm text-charcoal">{exam.internshipTitle}</p>
              </div>
              <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 font-display text-xl font-bold ${lowTime ? 'border-red-200 bg-red-50 text-red-500' : 'border-sand bg-cream text-ink'}`} role="timer" aria-label="Time remaining">
                <Clock size={16} aria-hidden="true" />
                {formatTime(timeLeft)}
              </div>
            </div>
            <div className="mt-4" aria-label={`Answered ${answeredCount} of ${questions.length} questions`}>
              <div className="mb-1.5 flex items-center justify-between text-xs text-charcoal">
                <span>Answered {answeredCount} of {questions.length}</span>
                <span className="font-mono font-bold text-ink">{answeredPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-burnt transition-all duration-300" style={{ width: `${answeredPct}%` }} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-6 break-words font-display text-lg text-ink">{questions[currentQ]?.question}</p>
            <div className="space-y-3">
              {questions[currentQ]?.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(currentQ, i)}
                  className={`w-full break-words rounded-xl border p-4 text-left text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                    answers[currentQ] === i ? 'border-burnt bg-burnt-tint text-ink font-medium ring-1 ring-burnt/40' : 'border-sand bg-cream/60 text-charcoal hover:border-sand-dark hover:bg-cream'
                  }`}
                >
                  <span className={`mr-3 font-bold ${answers[currentQ] === i ? 'text-burnt' : 'text-charcoal'}`}>{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className={btnSecondary}>Previous</button>
            {currentQ < questions.length - 1 ? (
              <button type="button" onClick={() => setCurrentQ(currentQ + 1)} className={btnPrimary}>Next</button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitted} className={btnPrimary}>Submit</button>
            )}
          </div>
        </div>

        {/* Question palette - right side */}
        <aside className="w-full shrink-0 rounded-[24px] border border-sand bg-alabaster p-4 shadow-bento lg:sticky lg:top-4 lg:w-52">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink">Questions</h3>
            <span className="font-mono text-xs text-charcoal">{answeredCount}/{questions.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4 xl:grid-cols-5">
            {questions.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === currentQ ? 'true' : undefined}
                className={`h-9 rounded-lg font-mono text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                  i === currentQ ? 'bg-noir text-cream ring-2 ring-burnt/50' : answers[i] >= 0 ? 'bg-burnt-tint text-burnt hover:bg-burnt-tint/80' : 'bg-cream text-charcoal hover:bg-sand'
                }`}
              >{i + 1}</button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-sand pt-3 font-mono text-[11px] text-charcoal">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-noir" /> Current</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-burnt bg-burnt-tint" /> Answered</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-sand bg-cream" /> Not answered</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
