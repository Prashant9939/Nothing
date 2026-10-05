import { useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X, FileDown } from 'lucide-react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import type { Internship } from '../../api';

const TRACK_LABELS: Record<string, string> = { web: 'Web Development', python: 'Python', data: 'Data Science', ai: 'AI/ML', cyber: 'Cybersecurity', skill: 'Skill Development', teaching: 'Teacher Training', hr: 'Human Resource', entrepreneurship: 'Entrepreneurship', tourism: 'Tourism & Hospitality' };

export default function AdminInternships() {
  const popup = usePopup();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Internship | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'web', duration: 28, price: 0, originalPrice: 0, modules: 10, topics: '', examDate: '' });
  const [questionWarning, setQuestionWarning] = useState<{ track: string; count: number } | null>(null);
  const [priceEdit, setPriceEdit] = useState<{ id: number; value: string } | null>(null);
  const [priceSaving, setPriceSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadInternships = () => adminApi.getInternships().then((res) => { setInternships(res.data.internships); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => { loadInternships(); }, []);
  const openNew = () => { setEditing(null); setForm({ title: '', description: '', category: 'web', duration: 28, price: 0, originalPrice: 0, modules: 10, topics: '', examDate: '' }); setQuestionWarning(null); setShowModal(true); };
  const openEdit = (i: Internship) => { setEditing(i); setForm({ title: i.title, description: i.description, category: i.category, duration: i.duration, price: i.price, originalPrice: i.originalPrice, modules: i.modules, topics: i.topics, examDate: i.examDate || '' }); setShowModal(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminApi.updateInternship(editing.id, form);
        setShowModal(false);
        popup.success('Your changes have been saved.', 'Internship Updated');
      } else {
        await adminApi.createInternship(form);
        setShowModal(false);
        // Check if this track has questions
        try {
          const res = await adminApi.getQuestions(form.category);
          const count = res.data.questions.length;
          if (count < 10) {
            setQuestionWarning({ track: form.category, count });
          }
        } catch {}
      }
      loadInternships();
    } catch (err: any) {
      popup.error(
        err.response?.data?.error || 'Could not save the internship. Please try again.',
        editing ? 'Update Failed' : 'Create Failed'
      );
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await popup.confirm('Delete this internship? This cannot be undone.', { title: 'Delete Internship', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await adminApi.deleteInternship(id);
      loadInternships();
      popup.success('The internship has been permanently removed.', 'Internship Deleted');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not delete the internship. Please try again.', 'Delete Failed');
    }
  };
  const toggleActive = async (i: Internship) => { await adminApi.updateInternship(i.id, { isActive: i.isActive ? 0 : 1 }); loadInternships(); };

  const downloadAnswerKey = async (i: Internship) => {
    if (downloadingId) return;
    setDownloadingId(i.id);
    try {
      const res = await fetch(`/api/admin/internships/${i.id}/answer-key`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Could not generate the answer key.');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename=([^;]+)/);
      const filename = match ? match[1] : `answer-key-${i.category}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      popup.success('Answer key downloaded.', 'Answer Key');
    } catch (err: any) {
      popup.error(err.message || 'Could not download the answer key. Please try again.', 'Download Failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const savePrice = async (id: number) => {
    if (!priceEdit || priceSaving) return;
    const value = Number(priceEdit.value);
    if (!priceEdit.value || Number.isNaN(value) || value <= 0) {
      popup.error('Enter a valid price greater than 0.', 'Invalid Price');
      return;
    }
    setPriceSaving(true);
    try {
      await adminApi.updateInternship(id, { price: value });
      setPriceEdit(null);
      await loadInternships();
      popup.success(`Price updated to ₹${value.toLocaleString()}.`, 'Price Updated');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the price. Please try again.', 'Update Failed');
    } finally {
      setPriceSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Manage Internships</h1><p className="text-sm text-gray-500 mt-1">Create and manage internship programs</p></div>
        <button onClick={openNew} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-medium shadow-sm transition-colors">+ Add Internship</button>
      </div>

      {questionWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-xl mt-0.5">!</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Add questions for "{TRACK_LABELS[questionWarning.track]}" track
            </p>
            <p className="text-xs text-amber-600 mt-1">
              This track only has {questionWarning.count} questions. Students need at least 50 domain-specific questions for their exam.
            </p>
            <div className="flex gap-2 mt-3">
              <a href="/admin/questions" className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-medium hover:bg-amber-600 transition-colors">
                Go to Questions
              </a>
              <button onClick={() => setQuestionWarning(null)} className="px-4 py-2 border border-amber-300 rounded-xl text-xs text-amber-700 hover:bg-amber-100 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Title</th>
                <th className="text-left p-4 font-medium text-gray-500">Category</th>
                <th className="text-left p-4 font-medium text-gray-500">Duration</th>
                <th className="text-left p-4 font-medium text-gray-500">Price</th>
                <th className="text-left p-4 font-medium text-gray-500">Modules</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
                <th className="text-left p-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {internships.map((i) => (
                <tr key={i.id} className="group border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{i.title}</td>
                  <td className="p-4"><span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium">{i.category}</span></td>
                  <td className="p-4 text-gray-600">{i.duration} days</td>
                  <td className="p-4">
                    {priceEdit?.id === i.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          autoFocus
                          value={priceEdit.value}
                          onChange={(e) => setPriceEdit({ id: i.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(i.id);
                            if (e.key === 'Escape') setPriceEdit(null);
                          }}
                          className="w-24 px-2 py-1 border border-orange-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => savePrice(i.id)}
                          disabled={priceSaving}
                          title="Save price"
                          aria-label="Save price"
                          className="p-1.5 rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceEdit(null)}
                          disabled={priceSaving}
                          title="Cancel"
                          aria-label="Cancel price edit"
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">₹{i.price.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setPriceEdit({ id: i.id, value: String(i.price) })}
                          title="Edit price"
                          aria-label={`Edit price of ${i.title}`}
                          className="p-1 rounded-md text-gray-500 opacity-0 transition-all hover:bg-orange-50 hover:text-orange-600 focus:opacity-100 group-hover:opacity-100"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{i.modules}</td>
                  <td className="p-4">
                    <button onClick={() => toggleActive(i)} className={`text-xs px-2.5 py-1 rounded-full font-medium ${i.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{i.isActive ? 'Active' : 'Inactive'}</button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(i)}
                        title="Edit internship"
                        aria-label={`Edit ${i.title}`}
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAnswerKey(i)}
                        disabled={downloadingId !== null}
                        title="Download answer key"
                        aria-label={`Download answer key for ${i.title}`}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
                      >
                        {downloadingId === i.id ? <span className="block w-3.5 h-3.5 border-[1.5px] border-emerald-300 border-t-emerald-700 rounded-full animate-spin" /> : <FileDown size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(i.id)}
                        title="Delete internship"
                        aria-label={`Delete ${i.title}`}
                        className="p-2 rounded-lg bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? 'Edit' : 'Add'} Internship</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600"><option value="web">Web Dev</option><option value="python">Python</option><option value="data">Data Science</option><option value="ai">AI/ML</option><option value="cyber">Cybersecurity</option><option value="skill">Skill Development</option><option value="teaching">Teacher Training</option><option value="hr">Human Resource</option><option value="entrepreneurship">Entrepreneurship</option><option value="tourism">Tourism & Hospitality</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (days)</label><input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Original Price (₹)</label><input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Modules</label><input type="number" value={form.modules} onChange={(e) => setForm({ ...form, modules: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Date</label><input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Topics (comma-separated)</label><input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} placeholder="HTML,CSS,JavaScript" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 shadow-sm transition-colors">{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
