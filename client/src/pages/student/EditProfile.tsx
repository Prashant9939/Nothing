import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, GraduationCap, Landmark, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';
import { studentApi, institutionApi } from '../../api';
import { biharUniversities } from '../../data/biharUniversities';
import SearchableSelect from '../../components/SearchableSelect';
import { PageLoader, EmptyState, Button, Card, Input, PasswordField } from '../../components/ui';
import PasswordHints from '../../components/ui/PasswordHints';
import { passwordChecks, passwordPolicyError } from '../../passwordPolicy';
import { UserIcon, ShieldCheckIcon, CheckIcon, PencilIcon, XIcon, BookOpenIcon } from '@animateicons/react/lucide';

const initialForm = { firstName: '', lastName: '', email: '', phone: '', university: '', college: '', course: '', year: '' };
type FormState = typeof initialForm;
type SectionKey = 'personal' | 'academic';

const mapUser = (u: any): FormState => ({
  firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '',
  university: u.university || '', college: u.college || '', course: u.course || '', year: u.year || '',
});

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
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];
  const pw = pwStrength(passwords.newPassword);

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
        action={<Button onClick={load}>Retry</Button>}
      />
    );
  }

  const metaRows = [
    { icon: <Landmark size={15} />, label: 'University', value: form.university === 'other' ? 'Other' : (form.university || '') },
    { icon: <GraduationCap size={15} />, label: 'College', value: form.college },
    { icon: <BookOpen size={15} />, label: 'Course', value: form.course ? `${form.course.toUpperCase()}${form.year ? ` · Year ${form.year}` : ''}` : '' },
    { icon: <CalendarDays size={15} />, label: 'Joined', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '' },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
      {/* ── Sticky profile sidebar ─────────────────────────── */}
      <aside className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft lg:sticky lg:top-24">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 via-white to-slate-300 text-xl font-bold text-slate-800">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-slate-800 bg-emerald-500">
                <CheckIcon size={10} className="text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-white/65">{form.email || user?.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Completeness ring */}
          <div className="flex items-center gap-4">
            <CompletenessRing pct={completeness.pct} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Profile completeness</p>
              <p className="mt-0.5 text-xs text-slate-500">{completeness.hint}</p>
            </div>
          </div>

          {/* Meta rows */}
          <div className="space-y-3.5 border-t border-slate-100 pt-4">
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
              ? <Button variant="ghost" size="sm" onClick={cancelEdit} icon={<XIcon size={13} />}>Cancel</Button>
              : <Button variant="secondary" size="sm" onClick={() => requestEdit('personal')} icon={<PencilIcon size={13} />}>Edit</Button>
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
              <p className="text-xs text-slate-500">Name and email cannot be changed.</p>
            </form>
          ) : (
            <ViewRows rows={[
              { label: 'First Name', value: form.firstName },
              { label: 'Last Name', value: form.lastName },
              { label: 'Email', value: form.email },
              { label: 'Phone', value: form.phone },
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
              ? <Button variant="ghost" size="sm" onClick={cancelEdit} icon={<XIcon size={13} />}>Cancel</Button>
              : <Button variant="secondary" size="sm" onClick={() => requestEdit('academic')} icon={<PencilIcon size={13} />}>Edit</Button>
          }
        >
          {editing === 'academic' ? (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
              <div>
                <label htmlFor="pf-university" className="mb-1.5 block text-sm font-medium text-slate-700">University</label>
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
                  <label htmlFor="pf-college" className="mb-1.5 block text-sm font-medium text-slate-700">College</label>
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
            </form>
          ) : (
            <ViewRows rows={[
              { label: 'University', value: form.university === 'other' ? 'Other' : form.university },
              { label: 'College', value: form.college },
              { label: 'Course', value: form.course.toUpperCase() },
              { label: 'Year', value: form.year },
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
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= pw ? strengthColor[pw] : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-medium ${pw <= 1 ? 'text-red-500' : pw <= 2 ? 'text-amber-600' : pw <= 3 ? 'text-sky-600' : 'text-emerald-600'}`}>
                    {strengthLabel[pw]}
                  </p>
                  <PasswordHints value={passwords.newPassword} className="mt-1.5" />
                </div>
              )}
            </div>
            <PasswordField label="Confirm New Password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
            <div className="flex justify-end">
              <Button type="submit" loading={passwordSaving} icon={!passwordSaving ? <ShieldCheckIcon size={15} /> : undefined}>
                {passwordSaving ? 'Changing...' : 'Update Password'}
              </Button>
            </div>
          </form>
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

function SectionCard({ id, icon, title, subtitle, action, error, children }: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
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
    </Card>
  );
}

function ViewRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{r.label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {r.value || <span className="font-normal text-slate-500">Not provided</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CompletenessRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className="text-emerald-500 transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900" role="status" aria-label={`Profile ${pct}% complete`}>
        {pct}%
      </span>
    </div>
  );
}
