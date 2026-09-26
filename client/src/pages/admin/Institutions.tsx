import { useEffect, useMemo, useState } from 'react';
import { institutionApi } from '../../api';
import type { University, College } from '../../api';
import { usePopup } from '../../context/PopupContext';

const typeBadge: Record<string, string> = {
  central: 'bg-purple-50 text-purple-700 border-purple-200',
  state: 'bg-sky-50 text-sky-700 border-sky-200',
  private: 'bg-amber-50 text-amber-700 border-amber-200',
  deemed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AdminInstitutions() {
  const popup = usePopup();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [uniForm, setUniForm] = useState({ name: '', shortName: '', location: '', type: 'state' });
  const [savingUni, setSavingUni] = useState(false);

  const [collegeForm, setCollegeForm] = useState({ name: '', district: '' });
  const [savingCollege, setSavingCollege] = useState(false);

  const [uniEditing, setUniEditing] = useState<number | null>(null);
  const [uniEditForm, setUniEditForm] = useState({ name: '', shortName: '', location: '', type: 'state' });
  const [savingUniEdit, setSavingUniEdit] = useState(false);

  const [collegeEditing, setCollegeEditing] = useState<number | null>(null);
  const [collegeEditForm, setCollegeEditForm] = useState({ name: '', district: '' });
  const [savingCollegeEdit, setSavingCollegeEdit] = useState(false);

  useEffect(() => {
    institutionApi.getUniversities()
      .then((res) => {
        setUniversities(res.data.universities);
        if (res.data.universities.length > 0) setSelectedId(res.data.universities[0].id);
        setLoading(false);
      })
      .catch(() => {
        popup.error('Could not load colleges and universities. Please try again.', 'Load Failed');
        setLoading(false);
      });
  }, [popup]);

  const selected = universities.find((u) => u.id === selectedId) || null;

  const filteredUniversities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter((u) =>
      u.name.toLowerCase().includes(q)
      || u.shortName.toLowerCase().includes(q)
      || u.location.toLowerCase().includes(q)
      || u.colleges.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [universities, search]);

  const addUniversity = async () => {
    if (!uniForm.name.trim()) {
      popup.error('Enter the university name first.', 'Missing Name');
      return;
    }
    setSavingUni(true);
    try {
      const res = await institutionApi.createUniversity(uniForm);
      const created = res.data.university;
      setUniversities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(created.id);
      setUniForm({ name: '', shortName: '', location: '', type: 'state' });
      popup.success(`${created.name} is now available on the website.`, 'University Added');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not add the university.', 'Add Failed');
    } finally {
      setSavingUni(false);
    }
  };

  const removeUniversity = async (university: University) => {
    const ok = await popup.confirm(
      `Remove ${university.name} and its ${university.colleges.length} college${university.colleges.length === 1 ? '' : 's'}? Students will no longer see this option.`,
      { title: 'Remove University', confirmLabel: 'Remove' }
    );
    if (!ok) return;
    try {
      const res = await institutionApi.deleteUniversity(university.id);
      setUniversities((prev) => prev.filter((u) => u.id !== university.id));
      if (selectedId === university.id) setSelectedId(null);
      popup.success(res.data.message || `${university.name} removed.`, 'University Removed');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not remove the university.', 'Remove Failed');
    }
  };

  const addCollege = async () => {
    if (!selected) {
      popup.error('Select a university before adding a college.', 'No University Selected');
      return;
    }
    if (!collegeForm.name.trim()) {
      popup.error('Enter the college name first.', 'Missing Name');
      return;
    }
    setSavingCollege(true);
    try {
      const res = await institutionApi.createCollege({ universityId: selected.id, ...collegeForm });
      setUniversities((prev) => prev.map((u) => (
        u.id === selected.id
          ? { ...u, colleges: [...u.colleges, res.data.college].sort((a, b) => a.name.localeCompare(b.name)) }
          : u
      )));
      setCollegeForm({ name: '', district: '' });
      popup.success(`${res.data.college.name} added under ${selected.name}.`, 'College Added');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not add the college.', 'Add Failed');
    } finally {
      setSavingCollege(false);
    }
  };

  const startEditUniversity = (university: University) => {
    setUniEditing(university.id);
    setUniEditForm({
      name: university.name,
      shortName: university.shortName,
      location: university.location,
      type: university.type,
    });
  };

  const saveUniversityEdit = async () => {
    if (uniEditing === null) return;
    if (!uniEditForm.name.trim()) {
      popup.error('University name cannot be empty.', 'Missing Name');
      return;
    }
    setSavingUniEdit(true);
    try {
      const res = await institutionApi.updateUniversity(uniEditing, uniEditForm);
      const updated = res.data.university;
      setUniversities((prev) => prev
        .map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
        .sort((a, b) => a.name.localeCompare(b.name)));
      setUniEditing(null);
      popup.success(res.data.message || `${updated.name} updated.`, 'University Updated');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the university.', 'Update Failed');
    } finally {
      setSavingUniEdit(false);
    }
  };

  const startEditCollege = (college: College) => {
    setCollegeEditing(college.id);
    setCollegeEditForm({ name: college.name, district: college.district });
  };

  const saveCollegeEdit = async () => {
    if (collegeEditing === null || !selected) return;
    if (!collegeEditForm.name.trim()) {
      popup.error('College name cannot be empty.', 'Missing Name');
      return;
    }
    setSavingCollegeEdit(true);
    try {
      const res = await institutionApi.updateCollege(collegeEditing, collegeEditForm);
      const updated = res.data.college;
      setUniversities((prev) => prev.map((u) => (
        u.id === selected.id
          ? { ...u, colleges: u.colleges.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) }
          : u
      )));
      setCollegeEditing(null);
      popup.success(res.data.message || `${updated.name} updated.`, 'College Updated');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not update the college.', 'Update Failed');
    } finally {
      setSavingCollegeEdit(false);
    }
  };

  const removeCollege = async (collegeId: number, collegeName: string) => {
    if (!selected) return;
    const ok = await popup.confirm(`Remove ${collegeName} from ${selected.name}?`, {
      title: 'Remove College',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      const res = await institutionApi.deleteCollege(collegeId);
      setUniversities((prev) => prev.map((u) => (
        u.id === selected.id ? { ...u, colleges: u.colleges.filter((c) => c.id !== collegeId) } : u
      )));
      popup.success(res.data.message || `${collegeName} removed.`, 'College Removed');
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Could not remove the college.', 'Remove Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  const totalColleges = universities.reduce((sum, u) => sum + u.colleges.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Colleges &amp; Universities</h1>
        <p className="text-sm text-gray-500 mt-1">
          {universities.length} universities and {totalColleges} colleges listed on the website
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Universities */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Universities</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-40 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-700/20"
            />
          </div>

          <div className="p-5 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={uniForm.name}
                onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })}
                placeholder="University name *"
                className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
              />
              <input
                value={uniForm.shortName}
                onChange={(e) => setUniForm({ ...uniForm, shortName: e.target.value })}
                placeholder="Short name (e.g. PU)"
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
              />
              <input
                value={uniForm.location}
                onChange={(e) => setUniForm({ ...uniForm, location: e.target.value })}
                placeholder="Location (e.g. Patna)"
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
              />
              <select
                value={uniForm.type}
                onChange={(e) => setUniForm({ ...uniForm, type: e.target.value })}
                className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
              >
                <option value="central">Central University</option>
                <option value="state">State University</option>
                <option value="private">Private University</option>
                <option value="deemed">Deemed University</option>
              </select>
            </div>
            <button
              onClick={addUniversity}
              disabled={savingUni}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50"
            >
              {savingUni ? 'Adding…' : 'Add University'}
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
            {filteredUniversities.length === 0 && (
              <p className="p-5 text-sm text-gray-400 text-center">No universities found.</p>
            )}
            {filteredUniversities.map((u) => (uniEditing === u.id ? (
              <div key={u.id} className="p-4 space-y-2 bg-slate-50" onClick={(e) => e.stopPropagation()}>
                <input
                  value={uniEditForm.name}
                  onChange={(e) => setUniEditForm({ ...uniEditForm, name: e.target.value })}
                  placeholder="University name *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={uniEditForm.shortName}
                    onChange={(e) => setUniEditForm({ ...uniEditForm, shortName: e.target.value })}
                    placeholder="Short name"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  />
                  <input
                    value={uniEditForm.location}
                    onChange={(e) => setUniEditForm({ ...uniEditForm, location: e.target.value })}
                    placeholder="Location"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  />
                  <select
                    value={uniEditForm.type}
                    onChange={(e) => setUniEditForm({ ...uniEditForm, type: e.target.value })}
                    className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  >
                    <option value="central">Central University</option>
                    <option value="state">State University</option>
                    <option value="private">Private University</option>
                    <option value="deemed">Deemed University</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setUniEditing(null)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveUniversityEdit}
                    disabled={savingUniEdit}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg disabled:opacity-50"
                  >
                    {savingUniEdit ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={u.id}
                onClick={() => {
                  if (selectedId !== u.id) setCollegeEditing(null);
                  setSelectedId(u.id);
                }}
                className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedId === u.id ? 'bg-slate-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{u.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${typeBadge[u.type] || typeBadge.state}`}>
                      {u.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {u.shortName && `${u.shortName} • `}
                    {u.location && `${u.location} • `}
                    {u.colleges.length} college{u.colleges.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditUniversity(u); }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeUniversity(u); }}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Colleges */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Colleges</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected ? `Under ${selected.name}` : 'Select a university on the left'}
            </p>
          </div>

          {!selected ? (
            <p className="p-8 text-sm text-gray-400 text-center">
              Select a university to add, edit or remove its colleges.
            </p>
          ) : (
            <>
              <div className="p-5 border-b border-gray-100 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={collegeForm.name}
                    onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
                    placeholder="College name *"
                    className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  />
                  <input
                    value={collegeForm.district}
                    onChange={(e) => setCollegeForm({ ...collegeForm, district: e.target.value })}
                    placeholder="District (e.g. Patna)"
                    className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  />
                </div>
                <button
                  onClick={addCollege}
                  disabled={savingCollege}
                  className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingCollege ? 'Adding…' : 'Add College'}
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                {selected.colleges.length === 0 && (
                  <p className="p-5 text-sm text-gray-400 text-center">No colleges added yet.</p>
                )}
                {selected.colleges.map((c) => (collegeEditing === c.id ? (
                  <div key={c.id} className="p-4 space-y-2 bg-slate-50">
                    <input
                      value={collegeEditForm.name}
                      onChange={(e) => setCollegeEditForm({ ...collegeEditForm, name: e.target.value })}
                      placeholder="College name *"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                    />
                    <input
                      value={collegeEditForm.district}
                      onChange={(e) => setCollegeEditForm({ ...collegeEditForm, district: e.target.value })}
                      placeholder="District (e.g. Patna)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setCollegeEditing(null)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCollegeEdit}
                        disabled={savingCollegeEdit}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg disabled:opacity-50"
                      >
                        {savingCollegeEdit ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={c.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{c.name}</p>
                      {c.district && <p className="text-xs text-gray-500">{c.district}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => startEditCollege(c)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeCollege(c.id, c.name)}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
