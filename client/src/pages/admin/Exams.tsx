import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import type { Exam } from '../../api';

interface AttemptQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  selectedOption: number | null;
}

interface AttemptData {
  exam: Exam & { email?: string; category?: string };
  questions: AttemptQuestion[];
  totalQuestions: number;
  passingMarks: number;
}

interface EditedAnswer {
  questionId: number;
  selectedOption: number | null;
}

const statusBadge = (status: string) =>
  status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : status === 'in_progress' ? 'bg-slate-100 text-slate-800 border-slate-200'
      : status === 'failed' ? 'bg-red-50 text-red-600 border-red-100'
        : 'bg-amber-50 text-slate-800 border-amber-200';

export default function AdminExams() {
  const popup = usePopup();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [answers, setAnswers] = useState<EditedAnswer[]>([]);
  const [manualScore, setManualScore] = useState('');
  const [saving, setSaving] = useState(false);

  const loadExams = () => {
    adminApi.getExams().then((res) => { setExams(res.data.exams); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadExams(); }, []);

  const closeEditor = () => {
    setEditing(null);
    setAttempt(null);
    setAnswers([]);
    setManualScore('');
  };

  const openEditor = async (exam: Exam) => {
    setEditing(exam);
    setAttempt(null);
    setAnswers([]);
    setAttemptLoading(true);
    try {
      const res = await adminApi.getExamAttempt(exam.id);
      setAttempt(res.data);
      setAnswers(res.data.questions.map((q: AttemptQuestion) => ({ questionId: q.id, selectedOption: q.selectedOption })));
      setManualScore(res.data.exam.score != null ? String(res.data.exam.score) : '');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not load this exam attempt.', 'Load Failed');
      setEditing(null);
    } finally {
      setAttemptLoading(false);
    }
  };

  const hasQuestions = (attempt?.questions.length ?? 0) > 0;
  const passingMarks = attempt?.passingMarks ?? 40;
  const correctMap = new Map(attempt?.questions.map((q) => [q.id, q.correct]) ?? []);
  const correctCount = answers.filter((a) => a.selectedOption != null && correctMap.get(a.questionId) === a.selectedOption).length;
  const computedScore = attempt && attempt.totalQuestions > 0
    ? Math.round((correctCount / attempt.totalQuestions) * 100)
    : Math.max(0, Math.min(100, Number(manualScore) || 0));
  const computedStatus = computedScore >= passingMarks ? 'completed' : 'failed';

  const setAnswer = (questionId: number, selectedOption: number | null) => {
    setAnswers((prev) => prev.map((a) => (a.questionId === questionId ? { ...a, selectedOption } : a)));
  };

  const save = async () => {
    if (!editing || !attempt) return;
    setSaving(true);
    try {
      if (hasQuestions) {
        const payload = answers.map((a) => ({ questionId: a.questionId, selectedOption: a.selectedOption ?? -1 }));
        const res = await adminApi.updateExamAttempt(editing.id, payload);
        popup.success(
          `Score updated to ${res.data.score}% (${res.data.correct}/${res.data.total} correct) — ${res.data.status === 'completed' ? 'Passed' : 'Failed'}`,
          'Result Updated'
        );
      } else {
        const score = Math.max(0, Math.min(100, Number(manualScore) || 0));
        const status = score >= passingMarks ? 'completed' : 'failed';
        await adminApi.updateExamResult(editing.id, score, status);
        popup.success(`Score updated to ${score}% — ${status === 'completed' ? 'Passed' : 'Failed'}`, 'Result Updated');
      }
      closeEditor();
      loadExams();
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not save the exam result.', 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Manage Exams</h1><p className="text-sm text-gray-500 mt-1">{exams.length} total exams</p></div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Student</th>
                <th className="text-left p-4 font-medium text-gray-500">Program</th>
                <th className="text-left p-4 font-medium text-gray-500">Scheduled</th>
                <th className="text-left p-4 font-medium text-gray-500">Score</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
                <th className="text-left p-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{e.firstName} {e.lastName}</td>
                  <td className="p-4 text-gray-500">{e.internshipTitle}</td>
                  <td className="p-4 text-gray-500 text-xs">{e.scheduledAt ? new Date(e.scheduledAt).toLocaleDateString() : 'Not set'}</td>
                  <td className="p-4 font-medium text-gray-900">{e.score !== null ? `${e.score}%` : '-'}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusBadge(e.status)}`}>{e.status}</span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditor(e)}
                      className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 shadow-sm transition-colors"
                    >
                      Edit Result
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Exam Result</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editing.firstName} {editing.lastName} — {editing.internshipTitle}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${statusBadge(editing.status)}`}>{editing.status}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {attemptLoading ? (
                <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
              ) : !attempt ? (
                <p className="text-sm text-gray-500 text-center py-10">Could not load this attempt.</p>
              ) : hasQuestions ? (
                <>
                  <p className="text-xs text-gray-500">
                    Click an option to change the student's answer. Green marks the correct answer key; changes only apply to this attempt.
                  </p>
                  {attempt.questions.map((q, idx) => {
                    const selected = answers.find((a) => a.questionId === q.id)?.selectedOption ?? null;
                    const isCorrect = selected === q.correct;
                    return (
                      <div key={q.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="text-sm font-medium text-gray-900">{idx + 1}. {q.question}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                              selected == null ? 'bg-gray-50 text-gray-500 border-gray-200'
                                : isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : 'bg-red-50 text-red-600 border-red-100'}`}>
                              {selected == null ? 'Not answered' : isCorrect ? 'Correct' : 'Wrong'}
                            </span>
                            {selected != null && (
                              <button onClick={() => setAnswer(q.id, null)} className="text-[11px] text-gray-400 hover:text-gray-600">Clear</button>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          {q.options.map((opt, i) => {
                            const isSelected = selected === i;
                            const isKey = q.correct === i;
                            return (
                              <button
                                key={i}
                                onClick={() => setAnswer(q.id, i)}
                                className={`w-full text-left p-3 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
                                  isKey ? 'border-emerald-300 bg-emerald-50'
                                    : isSelected ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-300'
                                      : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <span className="font-semibold text-gray-500">{String.fromCharCode(65 + i)}.</span>
                                <span className="flex-1 text-gray-800">{opt}</span>
                                {isKey && <span className="text-[11px] font-medium text-emerald-700">Answer key</span>}
                                {isSelected && <span className="text-[11px] font-medium text-sky-700">Selected</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="py-6">
                  <p className="text-sm text-gray-600 mb-4">No recorded responses for this exam. Enter a score manually.</p>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={manualScore}
                    onChange={(e) => setManualScore(e.target.value)}
                    className="w-40 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                    placeholder="0 - 100"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-gray-500">New result: </span>
                <span className="font-bold text-gray-900">{computedScore}%</span>
                {hasQuestions && <span className="text-gray-400 text-xs"> ({correctCount}/{attempt?.totalQuestions} correct)</span>}
                <span className={`ml-2 text-xs font-semibold ${computedStatus === 'completed' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {computedStatus === 'completed' ? 'PASS' : 'FAIL'} (passing {passingMarks}%)
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={closeEditor} disabled={saving} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={save} disabled={saving || attemptLoading || !attempt} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Result'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
