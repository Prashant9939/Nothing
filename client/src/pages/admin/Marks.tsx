import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';

interface Certificate {
  id: number;
  certificateId: string;
  grade: string;
  score: number | null;
  issuedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  internshipTitle: string;
}

const gradeFor = (score: number) =>
  score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';

const gradeBadge = (grade: string) =>
  grade === 'A+' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : grade === 'A' ? 'bg-teal-50 text-teal-600 border-teal-100'
      : grade.startsWith('B') ? 'bg-sky-50 text-sky-600 border-sky-100'
        : grade === 'C' ? 'bg-amber-50 text-amber-600 border-amber-100'
          : 'bg-red-50 text-red-600 border-red-100';

export default function AdminMarks() {
  const popup = usePopup();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Certificate | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    adminApi.getCertificates()
      .then((res) => { setCertificates(res.data.certificates); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = certificates.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${c.firstName} ${c.lastName} ${c.email} ${c.internshipTitle} ${c.certificateId}`.toLowerCase().includes(q);
  });

  const openEditor = (cert: Certificate) => {
    setEditing(cert);
    setScoreInput(cert.score != null ? String(cert.score) : '');
  };

  const score = Math.max(0, Math.min(100, Math.round(Number(scoreInput) || 0)));
  const belowPassing = score < 40;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await adminApi.updateCertificateMarks(editing.id, score);
      if (res.data.revoked) {
        popup.error(res.data.message, 'Marks Updated');
      } else {
        popup.success(res.data.message, 'Marks Updated');
      }
      setEditing(null);
      load();
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not save the marks.', 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks & Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">{certificates.length} certificates issued</p>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search student, program, certificate ID…"
          className="w-full sm:w-72 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Student</th>
                <th className="text-left p-4 font-medium text-gray-500">Program</th>
                <th className="text-left p-4 font-medium text-gray-500">Certificate ID</th>
                <th className="text-left p-4 font-medium text-gray-500">Grade</th>
                <th className="text-left p-4 font-medium text-gray-500">Score</th>
                <th className="text-left p-4 font-medium text-gray-500">Issued</th>
                <th className="text-left p-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No certificates found.</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </td>
                  <td className="p-4 text-gray-500">{c.internshipTitle}</td>
                  <td className="p-4 font-mono text-xs text-gray-600">{c.certificateId}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${gradeBadge(c.grade)}`}>{c.grade}</span>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{c.score != null ? `${c.score}%` : '-'}</td>
                  <td className="p-4 text-gray-500 text-xs">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '-'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditor(c)}
                      className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 shadow-sm transition-colors"
                    >
                      Edit Marks
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Edit Marks</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {editing.firstName} {editing.lastName} — {editing.internshipTitle}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="w-40 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  placeholder="0 - 100"
                  autoFocus
                />
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Resulting grade</p>
                  <p className="text-2xl font-bold text-gray-900">{gradeFor(score)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-semibold ${belowPassing ? 'text-red-600' : 'text-emerald-600'}`}>
                    {belowPassing ? 'FAIL' : 'PASS'} (passing 40%)
                  </p>
                </div>
              </div>

              {belowPassing && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  This score is below the passing mark — saving will revoke this certificate and reopen the enrollment.
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
