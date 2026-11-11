import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, BookMarked, BookOpen, CalendarDays, GraduationCap, Hash, Landmark, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';
import { studentApi, institutionApi } from '../../api';
import { biharUniversities } from '../../data/biharUniversities';
import { majorsForCourse, subjectGroups } from '../../data/courseMajors';
import SearchableSelect from '../../components/SearchableSelect';
import { PageLoader, EmptyState, Input, PasswordField } from '../../components/ui';
import { GENDER_OPTIONS, formatGender, formatDob } from '../../components/profile/ProfileSections';
import PasswordHints from '../../components/ui/PasswordHints';
import { passwordChecks, passwordPolicyError } from '../../passwordPolicy';
import { UserIcon, ShieldCheckIcon, CheckIcon, PencilIcon, XIcon, BookOpenIcon } from '@animateicons/react/lucide';

const initialForm = { firstName: '', lastName: '', email: '', phone: '', university: '', college: '', course: '', year: '', major: '', rollNo: '', regNo: '', gender: '', dob: '' };
type FormState = typeof initialForm;
type SectionKey = 'personal' | 'academic';

const mapUser = (u: any): FormState => ({
  firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '',
  university: u.university || '', college: u.college || '', course: u.course || '', year: u.year || '',
  major: u.major || '', rollNo: u.rollNo || '', regNo: u.regNo || '', gender: u.gender || '', dob: u.dob || '',
});

/* Student profile uses the portal design language: alabaster section cards
   with burnt icon wells and display headings. SectionCard/ViewRows are
   defined here (not imported from the shared profile kit) so the admin and
   partner profile screens keep their current look untouched. */

const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-5 py-2.5 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-all hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50 disabled:pointer-events-none disabled:opacity-60';
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-sand bg-cream px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-alabaster hover:border-sand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:pointer-events-none disabled:opacity-60';
const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-charcoal transition-colors hover:bg-cream hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:pointer-events-none disabled:opacity-60';
const spinner = <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" aria-hidden="true" />;

function SectionCard({ id, icon, title, subtitle, action, error, children }: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="overflow-hidden rounded-[24px] border border-sand bg-alabaster shadow-bento">
      <div className="flex items-center justify-between gap-3 border-b border-sand px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-burnt/20 bg-burnt-tint text-burnt">{icon}</span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink">{title}</h2>
            <p className="text-xs text-charcoal">{subtitle}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100"><XCircle size={15} /></span>
          {error}
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

function ViewRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="font-mono text-[11px] font-medium uppercase tracking-wide text-charcoal">{r.label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-ink">
            {r.value || <span className="font-normal text-charcoal">Not provided</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const popup = usePopup();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [draft, setDraft] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<{ personal?: string; academic?: string; security?: string }>({});
  const [universities, setUniversities] = useState<{ name: string; shortName: string; colleges: { name: string; district: string }[] }[]>([]);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

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
    studentApi.getProfile().then((res) => {
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
      const res = await studentApi.updateProfile(draft);
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

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (passwords.newPassword !== passwords.confirmPassword) { setPwError('New passwords do not match'); return; }
    const policyError = passwordPolicyError(passwords.newPassword);
    if (policyError) { setPwError(policyError); return; }
    setPasswordSaving(true);
    try {
      await studentApi.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      popup.success('Your password has been changed.', 'Password Changed');
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const pwStrength = (value: string) => {
    const passed = Object.values(passwordChecks(value)).filter(Boolean).length;
    return Math.min(4, Math.ceil((passed / 5) * 4));
  };
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-burnt', 'bg-noir'];
  const pw = pwStrength(passwords.newPassword);

  // Same major list signup offered for the selected course (falls back to the
  // grouped subject list when the course has no curated options).
  const majorOptions = majorsForCourse(draft.course);

  const completeness = (() => {
    const fields: [string, string][] = [
      [draft.phone || form.phone, 'phone number'],
      [form.university, 'university'],
      [form.college, 'college'],
      [form.course, 'course'],
      [form.year, 'year'],
    ];
    const filled = fields.filter(([v]) => v && v.trim()).length;
    const pct = Math.round((filled / fields.length) * 100);
    const missing = fields.find(([v]) => !v || !v.trim());
    return { pct, hint: missing ? `Add your ${missing[1]} to complete your profile` : 'Your profile is complete' };
  })();

  if (loading) return <PageLoader label="Loading your profile..." />;

  if (loadError) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title="Couldn't load your profile"
        description="Something went wrong while fetching your profile. Check your connection and try again."
        action={<button type="button" onClick={load} className={btnPrimary}>Retry</button>}
      />
    );
  }

  const metaRows = [
    { icon: <Landmark size={15} />, label: 'University', value: form.university === 'other' ? 'Other' : (form.university || '') },
    { icon: <GraduationCap size={15} />, label: 'College', value: form.college },
    { icon: <BookOpen size={15} />, label: 'Course', value: form.course ? `${form.course.toUpperCase()}${form.year ? ` · Year ${form.year}` : ''}` : '' },
    { icon: <BookMarked size={15} />, label: 'Major', value: form.major },
    { icon: <Hash size={15} />, label: 'Roll No', value: form.rollNo },
    { icon: <CalendarDays size={15} />, label: 'Joined', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '' },
  ];

  return (
    <div className="profile-skin grid items-start gap-6 lg:grid-cols-[300px_1fr]">
      {/* ── Sticky profile sidebar ─────────────────────────── */}
      <aside className="overflow-hidden rounded-[24px] border border-sand bg-alabaster shadow-bento lg:sticky lg:top-24">
        <div className="noir-mesh relative overflow-hidden p-6">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-burnt/25 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-burnt/30 bg-burnt-tint font-display text-xl font-bold text-burnt">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-noir bg-burnt">
                <CheckIcon size={10} className="text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-cream">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-cream/65">{form.email || user?.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Completeness ring */}
          <div className="flex items-center gap-4">
            <CompletenessRing pct={completeness.pct} />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-ink">Profile completeness</p>
              <p className="mt-0.5 text-xs text-charcoal">{completeness.hint}</p>
            </div>
          </div>

          {/* Meta rows */}
          <div className="space-y-3.5 border-t border-sand pt-4">
            {metaRows.map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <span className="mt-0.5 text-burnt" aria-hidden="true">{row.icon}</span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-charcoal">{row.label}</p>
                  <p className="truncate text-sm font-medium text-ink">{row.value || <span className="font-normal text-charcoal">Not provided</span>}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Sections ───────────────────────────────────────── */}
      <div className={`min-w-0 space-y-6 ${editing && dirty ? 'pb-24' : ''}`}>
        {/* Personal */}
        <SectionCard
          id="personal"
          icon={<UserIcon size={16} />}
          title="Personal Details"
          subtitle="Your basic information"
          error={sectionErrors.personal}
          action={
            editing === 'personal'
              ? <button type="button" onClick={cancelEdit} className={btnGhost}><XIcon size={13} /> Cancel</button>
              : <button type="button" onClick={() => requestEdit('personal')} className={btnSecondary}><PencilIcon size={13} /> Edit</button>
          }
        >
          {editing === 'personal' ? (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
              <Input
                label="Phone Number"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                icon={<UserIcon size={14} />}
                placeholder="Add your phone number"
                autoFocus
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="pf-gender" className="mb-1.5 block text-sm font-medium text-charcoal">Gender</label>
                  <select
                    id="pf-gender"
                    value={draft.gender}
                    onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
                    className="w-full rounded-xl border border-sand bg-cream px-3.5 py-2.5 text-sm text-ink focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/20"
                  >
                    <option value="">Not specified</option>
                    {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <Input
                  label="Date of Birth"
                  type="date"
                  value={draft.dob}
                  onChange={(e) => setDraft({ ...draft, dob: e.target.value })}
                />
              </div>
              <p className="text-xs text-charcoal">Name and email cannot be changed.</p>
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
          icon={<BookOpenIcon size={16} />}
          title="Academic Details"
          subtitle="Your education information"
          error={sectionErrors.academic}
          action={
            editing === 'academic'
              ? <button type="button" onClick={cancelEdit} className={btnGhost}><XIcon size={13} /> Cancel</button>
              : <button type="button" onClick={() => requestEdit('academic')} className={btnSecondary}><PencilIcon size={13} /> Edit</button>
          }
        >
          {editing === 'academic' ? (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
              <div>
                <label htmlFor="pf-university" className="mb-1.5 block text-sm font-medium text-charcoal">University</label>
                <SearchableSelect
                  id="pf-university"
                  options={[
                    ...universities.map(u => ({ label: u.name, value: u.name, sub: u.shortName })),
                    { label: 'Other (Not in Bihar)', value: 'other' },
                  ]}
                  value={draft.university}
                  onChange={(v) => setDraft({ ...draft, university: v, college: '' })}
                  placeholder="Search & select university"
                />
              </div>
              {draft.university && draft.university !== 'other' ? (
                <div>
                  <label htmlFor="pf-college" className="mb-1.5 block text-sm font-medium text-charcoal">College</label>
                  <SearchableSelect
                    id="pf-college"
                    options={(universities.find(u => u.name === draft.university)?.colleges || []).map(c => ({ label: c.name, value: c.name, sub: c.district }))}
                    value={draft.college}
                    onChange={(v) => setDraft({ ...draft, college: v })}
                    placeholder="Search & select college"
                  />
                </div>
              ) : (
                <Input label="College Name" value={draft.college} onChange={(e) => setDraft({ ...draft, college: e.target.value })} required />
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Course" value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} required />
                <Input label="Year" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="pf-major" className="mb-1.5 block text-sm font-medium text-charcoal">Major / Subject</label>
                <select
                  id="pf-major"
                  value={draft.major}
                  disabled={!draft.course}
                  onChange={(e) => setDraft({ ...draft, major: e.target.value })}
                  className="w-full rounded-xl border border-sand bg-cream px-3.5 py-2.5 text-sm text-ink focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/20 disabled:cursor-not-allowed disabled:bg-cream/60 disabled:text-charcoal"
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

        {/* Security */}
        <SectionCard
          id="security"
          icon={<ShieldCheckIcon size={16} />}
          title="Change Password"
          subtitle="Keep your account secure"
        >
          <form onSubmit={handlePassword} className="space-y-5">
            {pwError && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100"><XCircle size={15} /></span>
                {pwError}
              </div>
            )}
            <PasswordField label="Current Password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            <div>
              <PasswordField label="New Password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
              {passwords.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= pw ? strengthColor[pw] : 'bg-sand'}`} />
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-medium ${pw <= 1 ? 'text-red-500' : pw <= 2 ? 'text-amber-600' : pw <= 3 ? 'text-burnt' : 'text-noir'}`}>
                    {strengthLabel[pw]}
                  </p>
                  <PasswordHints value={passwords.newPassword} className="mt-1.5" />
                </div>
              )}
            </div>
            <PasswordField label="Confirm New Password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
            <div className="flex justify-end">
              <button type="submit" disabled={passwordSaving} className={btnPrimary}>
                {passwordSaving ? spinner : <ShieldCheckIcon size={15} />}
                {passwordSaving ? 'Changing...' : 'Update Password'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      {/* ── Sticky save bar ────────────────────────────────── */}
      {editing && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4" role="status">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-sand bg-alabaster/95 p-3 shadow-bento backdrop-blur-xl animate-fade-in">
            <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              Unsaved changes
            </span>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={cancelEdit} className={btnGhost}>Discard</button>
              <button type="button" onClick={save} disabled={saving} className={btnPrimary}>
                {saving && spinner}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletenessRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-sand" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className="text-burnt transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-ink" role="status" aria-label={`Profile ${pct}% complete`}>
        {pct}%
      </span>
    </div>
  );
}
