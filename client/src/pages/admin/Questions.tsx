import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';

const TRACKS = [
  { value: 'web', label: 'Web Development', color: 'bg-blue-100 text-blue-700' },
  { value: 'python', label: 'Python', color: 'bg-green-100 text-green-700' },
  { value: 'data', label: 'Data Science', color: 'bg-purple-100 text-purple-700' },
  { value: 'ai', label: 'AI & ML', color: 'bg-orange-100 text-orange-700' },
  { value: 'cyber', label: 'Cybersecurity', color: 'bg-red-100 text-red-700' },
  { value: 'skill', label: 'Skill Development', color: 'bg-teal-100 text-teal-700' },
  { value: 'teaching', label: 'Teacher Training', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'hr', label: 'Human Resource', color: 'bg-pink-100 text-pink-700' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', color: 'bg-amber-100 text-amber-700' },
  { value: 'tourism', label: 'Tourism & Hospitality', color: 'bg-cyan-100 text-cyan-700' },
];

const EMPTY_QUESTION = { question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 0 };

export default function AdminQuestions() {
  const popup = usePopup();
  const [stats, setStats] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('web');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editQ, setEditQ] = useState<any>(null);
  const [newQ, setNewQ] = useState({ ...EMPTY_QUESTION });
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, qRes] = await Promise.all([
        adminApi.getQuestionStats(),
        adminApi.getQuestions(selectedTrack),
      ]);
      setStats(statsRes.data.stats);
      setQuestions(qRes.data.questions);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedTrack]);

  const showMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAdd = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.createQuestion({ ...newQ, track: selectedTrack });
      setShowAdd(false);
      setNewQ({ ...EMPTY_QUESTION });
      showMessage('Question added successfully');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add question');
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateQuestion(editQ.id, editQ);
      setEditQ(null);
      showMessage('Question updated successfully');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteQuestion(id);
      setDeleteConfirm(null);
      showMessage('Question deleted');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const handleBulkAdd = async () => {
    setSaving(true);
    setError('');
    try {
      const lines = bulkText.trim().split('\n').filter(Boolean);
      const parsed = lines.map(line => {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length < 6) return null;
        return {
          question: parts[0],
          optionA: parts[1],
          optionB: parts[2],
          optionC: parts[3],
          optionD: parts[4],
          correct: { A: 0, B: 1, C: 2, D: 3 }[parts[5].toUpperCase()] ?? 0,
        };
      }).filter(Boolean);

      if (parsed.length === 0) {
        setError('No valid questions found. Use format: Q | A | B | C | D | CorrectLetter');
        setSaving(false);
        return;
      }

      const res = await adminApi.bulkCreateQuestions(selectedTrack, parsed);
      setShowBulk(false);
      setBulkText('');
      showMessage(`${res.data.count} questions added`);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add questions');
    }
    setSaving(false);
  };

  const handleDeleteTrack = async (track: string) => {
    const ok = await popup.confirm(`Delete ALL ${track} questions? This cannot be undone.`, {
      title: 'Delete All Questions',
      confirmLabel: 'Delete All',
    });
    if (!ok) return;
    try {
      await adminApi.deleteQuestionsByTrack(track);
      showMessage(`All ${track} questions deleted`);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const totalAll = stats.reduce((s, st) => s + st.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-500 mt-1">Manage domain-specific questions for each internship track</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAdd(true); setShowBulk(false); setEditQ(null); }} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
            + Add Question
          </button>
          <button onClick={() => { setShowBulk(true); setShowAdd(false); setEditQ(null); }} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
            Bulk Add
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}

      {/* Track Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TRACKS.map(t => {
          const st = stats.find(s => s.track === t.value);
          const count = st?.count || 0;
          const active = st?.activeCount || 0;
          return (
            <button key={t.value} onClick={() => setSelectedTrack(t.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTrack === t.value
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                {selectedTrack === t.value && <span className="text-orange-500 text-xs font-bold">ACTIVE</span>}
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{active} active</p>
              {count > 0 && (
                <button onClick={(e) => { e.stopPropagation(); handleDeleteTrack(t.value); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700">Delete All</button>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm text-gray-600">
        Total questions across all tracks: <span className="font-bold text-gray-900">{totalAll}</span>
      </div>

      {/* Add Form */}
      {(showAdd || editQ) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">{editQ ? 'Edit Question' : 'Add New Question'}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <textarea rows={2} value={editQ ? editQ.question : newQ.question}
              onChange={e => editQ ? setEditQ({ ...editQ, question: e.target.value }) : setNewQ({ ...newQ, question: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <div key={letter}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option {letter}</label>
                <input type="text" value={editQ ? editQ[`option${letter}`] : newQ[`option${letter}` as keyof typeof newQ]}
                  onChange={e => {
                    const val = e.target.value;
                    if (editQ) setEditQ({ ...editQ, [`option${letter}`]: val });
                    else setNewQ({ ...newQ, [`option${letter}`]: val });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C', 'D'] as const).map((letter, i) => (
                <button key={letter} type="button"
                  onClick={() => editQ ? setEditQ({ ...editQ, correct: i }) : setNewQ({ ...newQ, correct: i })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    (editQ ? editQ.correct : newQ.correct) === i
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {letter}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={editQ ? handleUpdate : handleAdd} disabled={saving}
              className="px-6 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editQ ? 'Update' : 'Add Question'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditQ(null); }}
              className="px-6 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Add */}
      {showBulk && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Bulk Add Questions</h3>
          <p className="text-sm text-gray-500">One question per line. Use pipe separator:<br/>
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">What is HTML? | Hyper Text | High Tech | Home Tool | Hyper Transfer | A</code>
          </p>
          <textarea rows={10} value={bulkText} onChange={e => setBulkText(e.target.value)}
            placeholder={"What is CSS? | Style Sheet | Cascading Style Sheets | Computer Style | Creative Style | B\nWhat is JS? | Java Script | JavaScript | Json Script | Java Syntax | B"}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          <div className="flex gap-2">
            <button onClick={handleBulkAdd} disabled={saving}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
              {saving ? 'Adding...' : 'Add All'}
            </button>
            <button onClick={() => setShowBulk(false)}
              className="px-6 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            {TRACKS.find(t => t.value === selectedTrack)?.label} Questions ({questions.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No questions for this track yet. Add some using the buttons above.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {questions.map((q) => (
              <div key={q.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">#{q.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${q.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {q.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
            {(['A', 'B', 'C', 'D'] as const).map((letter, i) => (
                        <span key={letter} className={`px-2 py-1 rounded ${q.correct === i ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                          {letter}: {q[`option${letter}` as keyof typeof q]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditQ(q)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs">Edit</button>
                    {deleteConfirm === q.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(q.id)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium">Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(q.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs">Del</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
