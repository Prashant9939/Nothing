import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, Landmark, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePopup } from '../context/PopupContext';
import { authApi, institutionApi } from '../api';
import { biharUniversities } from '../data/biharUniversities';
import { majorsForCourse, subjectGroups } from '../data/courseMajors';
import SearchableSelect from '../components/SearchableSelect';
import { PageLoader, EmptyState, Button, Input } from '../components/ui';
import { SectionCard, ViewRows, GENDER_OPTIONS, formatGender, formatDob } from '../components/profile/ProfileSections';
import { PencilIcon, XIcon } from '@animateicons/react/lucide';

/* Profile for admins and partners — the same view/edit sections students get
   on /student/edit-profile, backed by GET/PUT /auth/profile. Every detail the
   account already carries (including major / roll no / registration no, which
   signup collects) is visible here and editable. */

const initialForm = {
  firstName: '', lastName: '', email: '', phone: '', university: '', college: '',
  course: '', year: '', major: '', rollNo: '', regNo: '', gender: '', dob: '',
};
type FormState = typeof initialForm;
type SectionKey = 'personal' | 'academic';

const mapUser = (u: any): FormState => ({
  firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '',
  university: u.university || '', college: u.college || '', course: u.course || '', year: u.year || '',
  major: u.major || '', rollNo: u.rollNo || '', regNo: u.regNo || '', gender: u.gender || '', dob: u.dob || '',
});

const roleLabel = (role?: string) =>
  role === 'admin' ? 'Administrator' : role === 'partner' ? 'Partner' : 'Student';

export default function AccountProfile() {
  const { user, updateUser } = useAuth();
  const popup = usePopup();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [draft, setDraft] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<{ personal?: string; academic?: string }>({});
  const [universities, setUniversities] = useState<{ name: string; shortName: string; colleges: { name: string; district: string }[] }[]>([]);

  useEffect(() => {
    institutionApi.getUniversities()
      .then((res) => {
        const list = res.data.universities || [];
        setUniversities(list.length > 0 ? list : biharUniversities);
      })
      .catch(() => setUniversities(biharUniversities));
  }, []);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    authApi.getProfile().then((res) => {
      const mapped = mapUser(res.data.user);
      setForm(mapped);
      setDraft(mapped);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const dirty = editing !== null && JSON.stringify(draft) !== JSON.stringify(form);

  const requestEdit = (section: SectionKey) => {
    if (editing && dirty) {
      popup.confirm('You have unsaved changes. Discard them?', {
        title: 'Unsaved Changes', confirmLabel: 'Discard Changes', cancelLabel: 'Keep Editing',
      }).then((ok) => { if (ok) { setDraft(form); setEditing(section); } });
      return;
    }
    setDraft(form);
    setSectionErrors((prev) => ({ ...prev, [section]: undefined }));
    setEditing(section);
  };

  const cancelEdit = () => {
    if (dirty) {
      popup.confirm('You have unsaved changes. Discard them?', {
        title: 'Unsaved Changes', confirmLabel: 'Discard', cancelLabel: 'Keep Editing',
      }).then((ok) => { if (ok) { setDraft(form); setEditing(null); } });
      return;
    }
    setEditing(null);
  };

  const save = async () => {
    const section = editing;
    if (!section) return;
    setSaving(true);
    setSectionErrors((prev) => ({ ...prev, [section]: undefined }));
    try {
      const res = await authApi.updateProfile(draft);
      const mapped = mapUser(res.data.user);
      setForm(mapped);
      setDraft(mapped);
      setEditing(null);
      if (updateUser) updateUser(res.data.user);
      popup.success('Your profile has been updated.', 'Profile Updated');
    } catch (err: any) {
      setSectionErrors((prev) => ({ ...prev, [section]: err.response?.data?.error || 'Failed to update profile' }));
    } finally {
      setSaving(false);
    }
  };

  const majorOptions = majorsForCourse(draft.course);

  if (loading) return <PageLoader label="Loading your profile..." />;

  if (loadError) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title="Couldn't load your profile"
        description="Something went wrong while fetching your profile. Check your connection and try again."
        action={<Button onClick={load}>Retry</Button>}
      />
    );
  }

  const metaRows = [
    { icon: <Mail size={15} />, label: 'Email', value: form.email },
    { icon: <Phone size={15} />, label: 'Phone', value: form.phone },
    { icon: <CalendarDays size={15} />, label: 'Date of Birth', value: formatDob(form.dob) },
    ...(user?.partnerName ? [{ icon: <Landmark size={15} />, label: 'Organisation', value: user.partnerName }] : []),
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
      {/* ── Sticky profile sidebar ─────────────────────────── */}
      <aside className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft lg:sticky lg:top-24">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 via-white to-slate-300 text-xl font-bold text-slate-800">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">{form.firstName} {form.lastName}</p>
              <p className="truncate text-xs text-white/65">{form.email}</p>
              <span className="mt-1.5 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                {roleLabel(user?.role)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3.5 p-5">
          {metaRows.map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <span className="mt-0.5 text-slate-500" aria-hidden="true">{row.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{row.label}</p>
                <p className="truncate text-sm font-medium text-slate-700">{row.value || <span className="font-normal text-slate-500">Not provided</span>}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Sections ───────────────────────────────────────── */}
      <div className={`min-w-0 space-y-6 ${editing && dirty ? 'pb-24' : ''}`}>
        {/* Personal */}
        <SectionCard
          id="personal"
          icon={<User size={16} />}
          title="Personal Details"
          subtitle="Your basic information"
          error={sectionErrors.personal}
          action={
            editing === 'personal'
              ? <Button variant="ghost" size="sm" onClick={cancelEdit} icon={<XIcon size={13} />}>Cancel</Button>
              : <Button variant="secondary" size="sm" onClick={() => requestEdit('personal')} icon={<PencilIcon size={13} />}>Edit</Button>
          }
        >
          {editing === 'personal' ? (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="First Name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} required autoFocus />
                <Input label="Last Name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} required />
              </div>
              <Input label="Email" value={draft.email} disabled onChange={() => undefined} />
              <Input label="Phone Number" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} required />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="acc-gender" className="mb-1.5 block text-sm font-medium text-slate-700">Gender</label>
                  <select
                    id="acc-gender"
                    value={draft.gender}
                    onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Not specified</option>
                    {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <Input label="Date of Birth" type="date" value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
              </div>
              <p className="text-xs text-slate-500">Email cannot be changed.</p>
            </form>
          ) : (
            <ViewRows rows={[
              { label: 'First Name', value: form.firstName },
              { label: 'Last Name', value: form.lastName },
              { label: 'Email', value: form.email },
              { label: 'Phone', value: form.phone },
              { label: 'Gender', value: formatGender(form.gender) },
              { label: 'Date of Birth', value: formatDob(form.dob) },
            ]} />
          )}
        </SectionCard>

        {/* Academic */}
        <SectionCard
          id="academic"
          icon={<BookOpen size={16} />}
          title="Academic Details"
          subtitle="Your education information"
          error={sectionErrors.academic}
          action={
            editing === 'academic'
              ? <Button variant="ghost" size="sm" onClick={cancelEdit} icon={<XIcon size={13} />}>Cancel</Button>
              : <Button variant="secondary" size="sm" onClick={() => requestEdit('academic')} icon={<PencilIcon size={13} />}>Edit</Button>
          }
        >
          {editing === 'academic' ? (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
              <div>
                <label htmlFor="acc-university" className="mb-1.5 block text-sm font-medium text-slate-700">University</label>
                <SearchableSelect
                  id="acc-university"
                  options={[
                    ...universities.map((u) => ({ label: u.name, value: u.name, sub: u.shortName })),
                    { label: 'Other (Not in Bihar)', value: 'other' },
                  ]}
                  value={draft.university}
                  onChange={(v) => setDraft({ ...draft, university: v, college: '' })}
                  placeholder="Search & select university"
                />
              </div>
              {draft.university && draft.university !== 'other' ? (
                <div>
                  <label htmlFor="acc-college" className="mb-1.5 block text-sm font-medium text-slate-700">College</label>
                  <SearchableSelect
                    id="acc-college"
                    options={(universities.find((u) => u.name === draft.university)?.colleges || []).map((c) => ({ label: c.name, value: c.name, sub: c.district }))}
                    value={draft.college}
                    onChange={(v) => setDraft({ ...draft, college: v })}
                    placeholder="Search & select college"
                  />
                </div>
              ) : (
                <Input label="College Name" value={draft.college} onChange={(e) => setDraft({ ...draft, college: e.target.value })} />
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Course" value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} />
                <Input label="Year" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} />
              </div>
              <div>
                <label htmlFor="acc-major" className="mb-1.5 block text-sm font-medium text-slate-700">Major / Subject</label>
                <select
                  id="acc-major"
                  value={draft.major}
                  disabled={!draft.course}
                  onChange={(e) => setDraft({ ...draft, major: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">{draft.course ? 'Select major / subject' : 'Select course first'}</option>
                  {majorOptions.length > 0
                    ? majorOptions.map((m) => <option key={m} value={m}>{m}</option>)
                    : subjectGroups.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                          {g.subjects.map((m) => <option key={`${g.label}-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                      ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Roll Number" value={draft.rollNo} onChange={(e) => setDraft({ ...draft, rollNo: e.target.value })} placeholder="e.g. 21CS001" />
                <Input label="Registration No." value={draft.regNo} onChange={(e) => setDraft({ ...draft, regNo: e.target.value })} placeholder="University registration number" />
              </div>
            </form>
          ) : (
            <ViewRows rows={[
              { label: 'University', value: form.university === 'other' ? 'Other' : form.university },
              { label: 'College', value: form.college },
              { label: 'Course', value: form.course.toUpperCase() },
              { label: 'Year', value: form.year },
              { label: 'Major / Subject', value: form.major },
              { label: 'Roll Number', value: form.rollNo },
              { label: 'Registration No.', value: form.regNo },
            ]} />
          )}
        </SectionCard>
      </div>

      {/* ── Sticky save bar ────────────────────────────────── */}
      {editing && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4" role="status">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lift backdrop-blur-xl animate-fade-in">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              Unsaved changes
            </span>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Discard</Button>
              <Button size="sm" loading={saving} onClick={save}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
