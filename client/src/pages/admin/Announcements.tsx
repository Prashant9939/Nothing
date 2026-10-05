import { useEffect, useState } from 'react';
import { announcementApi } from '../../api';
import type { Announcement } from '../../api';
import { usePopup } from '../../context/PopupContext';
import { MegaphoneIcon, SendIcon, PencilIcon, XIcon } from '@animateicons/react/lucide';

const formatDate = (iso: string) => {
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function AdminAnnouncements() {
  const popup = usePopup();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    announcementApi.list()
      .then((res) => { setItems(res.data.announcements); setLoading(false); })
      .catch(() => {
        popup.error('Could not load announcements. Please try again.', 'Load Failed');
        setLoading(false);
      });
  }, [popup]);

  const resetForm = () => { setForm({ title: '', message: '' }); setEditingId(null); };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setForm({ title: announcement.title, message: announcement.message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    if (!form.title.trim()) { popup.error('Enter a title for the announcement.', 'Missing Title'); return; }
    if (!form.message.trim()) { popup.error('Enter the announcement message.', 'Missing Message'); return; }

    setSaving(true);
    try {
      if (editingId === null) {
        const res = await announcementApi.create(form);
        setItems((prev) => [res.data.announcement, ...prev]);
        popup.success('Your announcement is now visible to every logged-in user.', 'Announcement Published');
      } else {
        const res = await announcementApi.update(editingId, form);
        const updated = res.data.announcement;
        setItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
        popup.success('Announcement updated.', 'Announcement Updated');
      }
      resetForm();
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not save the announcement.', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (announcement: Announcement) => {
    const ok = await popup.confirm(`Delete "${announcement.title}"? Users will no longer see it.`, {
      title: 'Delete Announcement',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      const res = await announcementApi.remove(announcement.id);
      setItems((prev) => prev.filter((a) => a.id !== announcement.id));
      if (editingId === announcement.id) resetForm();
      popup.success(res.data.message || 'Announcement deleted.', 'Announcement Deleted');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not delete the announcement.', 'Delete Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  const totalReads = items.reduce((sum, a) => sum + (a.readCount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500 mt-1">
          {items.length} announcement{items.length === 1 ? '' : 's'} published · {totalReads} total reads by students
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Compose */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm lg:sticky lg:top-24">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            {editingId === null ? <MegaphoneIcon size={16} className="text-slate-700" /> : <PencilIcon size={16} className="text-slate-700" />}
            <h2 className="text-sm font-semibold text-gray-900">
              {editingId === null ? 'New Announcement' : 'Edit Announcement'}
            </h2>
          </div>

          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Exam date extended"
                maxLength={120}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write the notification every student will see…"
                rows={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-slate-700/20"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50"
              >
                <SendIcon size={14} />
                {saving ? 'Saving…' : editingId === null ? 'Publish' : 'Save Changes'}
              </button>
              {editingId !== null && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Published list */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Published</h2>
          </div>

          {items.length === 0 ? (
            <p className="p-10 text-sm text-gray-500 text-center">
              No announcements yet. Publish one to notify all students.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((a) => (
                <div key={a.id} className={`p-5 ${editingId === a.id ? 'bg-slate-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{a.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                          {a.readCount || 0} read{a.readCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(a.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => startEdit(a)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(a)}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
