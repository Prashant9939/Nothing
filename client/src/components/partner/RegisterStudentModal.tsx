import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, CreditCard, X } from 'lucide-react';
import { EyeIcon, EyeOffIcon } from '@animateicons/react/lucide';
import { institutionApi, partnerApi } from '../../api';
import type { Internship, Payment } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';
import SearchableSelect from '../SearchableSelect';
import PasswordHints from '../ui/PasswordHints';
import { passwordChecks, passwordPolicyError } from '../../passwordPolicy';
import { biharUniversities } from '../../data/biharUniversities';
import { majorsForCourse, subjectGroups } from '../../data/courseMajors';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all';

const selectCls = inputCls + ' cursor-pointer';

const sectionTitle = 'text-xs font-medium text-gray-500 uppercase tracking-wider';

const sessionOptions = Array.from({ length: 8 }, (_, i) => {
  const start = new Date().getFullYear() - i;
  return `${start}-${start + 4}`;
});

const emptyForm = {
  fullName: '', email: '', phone: '', gender: '', dob: '',
  university: '', college: '', course: '', major: '', year: '', rollNo: '', regNo: '',
  guardianName: '', guardianPhone: '', guardianRelation: '',
  password: '', confirmPassword: '',
};

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const years = Array.from({ length: 60 }, (_, i) => 2010 - i);

const isValidDob = (dob: string) => {
  if (!dob || dob.includes('YYYY') || dob.includes('MM') || dob.includes('DD')) return false;
  const d = new Date(dob);
  return !isNaN(d.getTime()) && d < new Date();
};

// Loads checkout.razorpay.com once and resolves when it is ready to use
// (same helper as the student payment page).
function loadRazorpayCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  web: 'Web Development', python: 'Python', data: 'Data Science', ai: 'AI/ML',
  cyber: 'Cybersecurity', skill: 'Skill Development', teaching: 'Teacher Training',
  hr: 'Human Resource', entrepreneurship: 'Entrepreneurship',
  tourism: 'Tourism & Hospitality', marketing: 'Marketing', finance: 'Finance',
  design: 'Design', other: 'Other',
};

const categoryLabel = (key: string) => CATEGORY_LABELS[key] || key;

export default function RegisterStudentModal({ open, onClose, onCreated }: Props) {
  const popup = usePopup();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [universities, setUniversities] = useState<{ name: string; shortName: string; colleges: { name: string; district: string }[] }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);

  // Step 2: pick a track and pay for the student that was just registered.
  const [step, setStep] = useState(1);
  const [student, setStudent] = useState<{ id: number; name: string; email: string; password: string } | null>(null);
  const [tracks, setTracks] = useState<Internship[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [paidPayment, setPaidPayment] = useState<Payment | null>(null);

  const loadTracks = () => {
    setTracksLoading(true);
    setTracksError(false);
    partnerApi.getInternships()
      .then((res) => { setTracks(res.data.internships || []); setTracksLoading(false); })
      .catch(() => { setTracksError(true); setTracksLoading(false); });
  };

  useEffect(() => {
    if (!open || universities.length > 0) return;
    institutionApi.getUniversities()
      .then((res) => {
        const list = res.data.universities || [];
        setUniversities(list.length > 0 ? list : biharUniversities);
      })
      .catch(() => setUniversities(biharUniversities));
  }, [open, universities.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading && !paying) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, paying, onClose]);

  // Reopening always starts at step 1 with a clean slate. This hook must stay
  // ABOVE the `if (!open) return null` below: a hook declared after an early
  // return changes the hook count when the modal opens, which React rejects
  // (rules of hooks).
  useEffect(() => {
    if (open) return;
    setStep(1);
    setStudent(null);
    setSelected(null);
    setPaidPayment(null);
    setTracks([]);
    setTracksError(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const set = (field: string, value: string) => setForm({ ...form, [field]: value });
  const majorOptions = majorsForCourse(form.course);

  const passwordStrength = (pwd: string) => {
    const passed = Object.values(passwordChecks(pwd)).filter(Boolean).length;
    return Math.min(4, Math.ceil((passed / 5) * 4));
  };
  const strength = passwordStrength(form.password);
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    // Only step 1 is a form — Enter anywhere else must not re-run validation.
    if (step !== 1) return;

    if (!form.fullName.trim() || !form.email || !form.phone || !form.gender || !isValidDob(form.dob)) {
      setError('Please fill all personal details'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Invalid email format'); return;
    }
    if (!form.university || !form.college || !form.course || !form.major || !form.year || !form.rollNo || !form.regNo) {
      setError('Please fill all academic details'); return;
    }
    if (!form.guardianName || !form.guardianPhone || !form.guardianRelation) {
      setError('Please fill all guardian details'); return;
    }
    const policyError = passwordPolicyError(form.password);
    if (policyError) { setError(policyError); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!terms) { setError('Please agree to the Terms & Privacy Policy'); return; }

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, fullName, ...rest } = form;
      const nameParts = fullName.trim().split(/\s+/);
      const res = await partnerApi.registerStudent({ ...rest, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') });

      // Step 1 is done — refresh the list behind the modal, then move straight
      // to track selection instead of closing.
      setStudent({
        id: res.data.user.id,
        name: fullName.trim(),
        email: form.email,
        password: form.password,
      });
      setForm(emptyForm);
      setTerms(false);
      setShowPassword(false);
      setError('');
      onCreated();
      setStep(2);
      loadTracks();
      popup.success(`${fullName} is registered. Now choose a track to enroll them.`, 'Student Registered');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → Razorpay. The order is created server-side with the amount from
  // the database; the client only ever passes back Razorpay's signed result.
  const selectedTrack = tracks.find((t) => t.id === selected) || null;

  const handlePay = async () => {
    if (!student || !selectedTrack || paying) return;
    setPaying(true);
    try {
      const { data } = await partnerApi.enrollStudent(student.id, selectedTrack.id);

      if (data.alreadyPaid) {
        setPaidPayment(data.payment);
        setStep(3);
        setPaying(false);
        return;
      }

      if (!data.orderId || !data.keyId) {
        popup.error('Payment service is not configured. Restart the server so it picks up your Razorpay keys from .env.', 'Payment Not Configured');
        setPaying(false);
        return;
      }

      await loadRazorpayCheckout();
      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'IQ Intern',
        description: selectedTrack.title,
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
          contact: (user as any)?.phone || '',
        },
        theme: { color: '#10b981' },
        handler: async (response: any) => {
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;
          // One automatic retry for a transient blip — verify is idempotent
          // server-side and the charge is already captured here.
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const verified = await partnerApi.verifyStudentPayment(data.payment.id, {
                razorpay_order_id, razorpay_payment_id, razorpay_signature,
              });
              setPaidPayment(verified.data.payment);
              setStep(3);
              setPaying(false);
              return;
            } catch (err: any) {
              const transient = !err.response
                || [502, 503, 504].includes(err.response?.status)
                || ['ECONNABORTED', 'ETIMEDOUT'].includes(err.code);
              if (attempt === 1 && transient) {
                await new Promise((r) => setTimeout(r, 1500));
                continue;
              }
              popup.error(err.response?.data?.error || 'Payment could not be verified. Please contact support with your payment id.', 'Verification Failed');
              setPaying(false);
              return;
            }
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on('payment.failed', (response: any) => {
        popup.error(response?.error?.description || 'The payment failed. Please try again.', 'Payment Failed');
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      popup.error(err.response?.data?.error || err.message || 'Payment failed. Please try again.', 'Payment Failed');
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !loading && !paying && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {step === 3 ? 'Enrollment Complete' : step === 2 ? 'Choose a Track' : 'Register Student'}
              </h2>
              {step < 3 && (
                <span className="text-[11px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5">
                  Step {step} of 2
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1
                ? 'Same details as a normal registration — the student is attributed to your partner account'
                : step === 2
                  ? `Pick a program for ${student?.name ?? 'the student'} and pay now — enrollment opens immediately`
                  : 'The student is enrolled and can sign in right away'}
            </p>
          </div>
          <button onClick={() => !loading && !paying && onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          {step === 1 && (
          <div className="p-6 space-y-7">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
                {error}
              </div>
            )}

            {/* Personal */}
            <div className="space-y-3">
              <p className={sectionTitle}>Personal Information</p>
              <input type="text" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Full name *" autoComplete="name" className={inputCls} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email address *" className={inputCls} />
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone number *" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} aria-label="Gender" className={selectCls}>
                  <option value="">Gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <select value={form.dob.split('-')[2] || ''} onChange={(e) => { const parts = form.dob.split('-'); set('dob', `${parts[0] || 'YYYY'}-${parts[1] || 'MM'}-${e.target.value}`); }} aria-label="Date of birth day" className={selectCls}>
                  <option value="">Day</option>
                  {days.map((d) => <option key={d} value={String(d).padStart(2, '0')}>{d}</option>)}
                </select>
                <select value={form.dob.split('-')[1] || ''} onChange={(e) => { const parts = form.dob.split('-'); set('dob', `${parts[0] || 'YYYY'}-${e.target.value}-${parts[2] || 'DD'}`); }} aria-label="Date of birth month" className={selectCls}>
                  <option value="">Month</option>
                  {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </select>
                <select value={form.dob.split('-')[0] || ''} onChange={(e) => { const parts = form.dob.split('-'); set('dob', `${e.target.value}-${parts[1] || 'MM'}-${parts[2] || 'DD'}`); }} aria-label="Date of birth year" className={selectCls}>
                  <option value="">Year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Academic */}
            <div className="space-y-3">
              <p className={sectionTitle}>Academic Details</p>
              <SearchableSelect
                options={[
                  ...universities.map((u) => ({ label: u.name, value: u.name, sub: u.shortName })),
                  { label: 'Other (Not in Bihar)', value: 'other' },
                ]}
                value={form.university}
                onChange={(v) => setForm({ ...form, university: v, college: '' })}
                placeholder="Search & select university *"
                required
              />
              {form.university && form.university !== 'other' && (
                <SearchableSelect
                  options={(universities.find((u) => u.name === form.university)?.colleges || []).map((c) => ({ label: c.name, value: c.name, sub: c.district }))}
                  value={form.college}
                  onChange={(v) => set('college', v)}
                  placeholder="Search & select college *"
                  required
                />
              )}
              {form.university === 'other' && (
                <input type="text" value={form.college} onChange={(e) => set('college', e.target.value)} placeholder="Enter college name *" className={inputCls} />
              )}
              {!form.university && (
                <input type="text" disabled placeholder="Select university first *" className={inputCls + ' opacity-50 cursor-not-allowed'} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.course}
                  onChange={(e) => {
                    const next = e.target.value;
                    const opts = majorsForCourse(next);
                    // No course → no major; keep the chosen major only when it
                    // still exists in the new course's options.
                    const keep = next !== '' && (opts.length === 0 || opts.includes(form.major));
                    setForm({ ...form, course: next, major: keep ? form.major : '' });
                  }}
                  className={selectCls}
                >
                  <option value="">Course *</option>
                  <option value="ba">B.A</option>
                  <option value="bsc">B.Sc</option>
                  <option value="bcom">B.Com</option>
                  <option value="btech">B.Tech</option>
                  <option value="be">B.E.</option>
                  <option value="bca">BCA</option>
                  <option value="mca">MCA</option>
                  <option value="mtech">M.Tech</option>
                  <option value="mba">MBA</option>
                  <option value="ma">M.A</option>
                  <option value="msc">M.Sc</option>
                  <option value="mcom">M.Com</option>
                  <option value="other">Other</option>
                </select>
                <select value={form.year} onChange={(e) => set('year', e.target.value)} className={selectCls}>
                  <option value="">Session *</option>
                  {sessionOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <select
                value={form.major}
                onChange={(e) => set('major', e.target.value)}
                disabled={!form.course}
                className={selectCls + ' disabled:bg-gray-100/70 disabled:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:focus:ring-0'}
              >
                <option value="">{form.course ? 'Major / Subject *' : 'Select course first *'}</option>
                {majorOptions.length > 0
                  ? majorOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  : subjectGroups.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.subjects.map((m) => (
                          <option key={`${g.label}-${m}`} value={m}>{m}</option>
                        ))}
                      </optgroup>
                    ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.rollNo} onChange={(e) => set('rollNo', e.target.value)} placeholder="Roll Number *" className={inputCls} />
                <input type="text" value={form.regNo} onChange={(e) => set('regNo', e.target.value)} placeholder="Registration No. *" className={inputCls} />
              </div>
            </div>

            {/* Guardian */}
            <div className="space-y-3">
              <p className={sectionTitle}>Guardian Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} placeholder="Guardian Name *" className={inputCls} />
                <input type="tel" value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} placeholder="Guardian Phone *" className={inputCls} />
              </div>
              <select value={form.guardianRelation} onChange={(e) => set('guardianRelation', e.target.value)} className={selectCls}>
                <option value="">Relation *</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="brother">Brother</option>
                <option value="sister">Sister</option>
                <option value="uncle">Uncle</option>
                <option value="aunt">Aunt</option>
                <option value="spouse">Spouse</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Security */}
            <div className="space-y-3">
              <p className={sectionTitle}>Login Credentials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Create password *" minLength={6} className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                <input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Confirm password *" className={inputCls} />
              </div>
              {form.password && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-gray-200/60'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-orange-500' : strength === 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
              <PasswordHints value={form.password} className="mt-0" />
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20" />
                <span className="text-xs text-gray-500">I agree to <Link to="/terms" className="text-orange-500 hover:underline">Terms</Link> & <Link to="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link></span>
              </label>
              <p className="text-xs text-gray-500">Share these credentials with the student — they can sign in immediately.</p>
            </div>
          </div>
          )}

          {/* Step 2 — track selection with a visible price list */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Login credentials</p>
                  <p className="mt-1 truncate font-mono text-sm text-gray-700">{student?.email} / {student?.password}</p>
                </div>
                <span className="shrink-0 text-[11px] text-gray-500">Share with the student</span>
              </div>

              <div>
                <p className={sectionTitle}>Price list</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Select an internship track</p>
              </div>

              {tracksLoading && (
                <div className="flex items-center justify-center gap-3 py-10">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Loading tracks…</span>
                </div>
              )}

              {tracksError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center justify-between gap-3">
                  <span>Couldn't load the track list.</span>
                  <button type="button" onClick={loadTracks} className="shrink-0 font-medium underline hover:text-red-700">Retry</button>
                </div>
              )}

              {!tracksLoading && !tracksError && tracks.length === 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  No active tracks are available right now. You can register the student now and enroll them later.
                </div>
              )}

              {!tracksLoading && !tracksError && tracks.length > 0 && (
                <ul className="space-y-2.5">
                  {tracks.map((t) => {
                    const active = selected === t.id;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(t.id)}
                          aria-pressed={active}
                          className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                            active
                              ? 'border-orange-400 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                            {active && <Check size={12} className="text-white" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">{t.title}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-medium">{categoryLabel(t.category)}</span>
                              <span>{t.duration} days</span>
                              <span className="text-gray-300">•</span>
                              <span>{t.modules} modules</span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-lg font-bold leading-tight text-gray-900">₹{Number(t.price).toLocaleString()}</span>
                            {Number(t.originalPrice) > Number(t.price) && (
                              <span className="block text-[11px] text-gray-400 line-through">₹{Number(t.originalPrice).toLocaleString()}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Step 3 — payment confirmation */}
          {step === 3 && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">Payment Successful</h3>
              <p className="mt-1 text-sm text-gray-500">
                {student?.name} is enrolled in {paidPayment?.internshipTitle || selectedTrack?.title || 'this program'}
              </p>
              <div className="mt-5 space-y-2.5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-semibold text-emerald-600">₹{Number(paidPayment?.amount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Receipt No.</span>
                  <span className="font-mono text-gray-900">{paidPayment?.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Program</span>
                  <span className="font-medium text-gray-900">{paidPayment?.internshipTitle || selectedTrack?.title}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Sign in as <span className="font-mono">{student?.email}</span> with the password above to start learning.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap justify-end gap-3 shrink-0 sticky bottom-0">
            {step === 1 && (<>
              <button type="button" onClick={() => !loading && onClose()} disabled={loading}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 shadow-sm transition-colors disabled:opacity-50">
                {loading ? 'Registering…' : 'Register Student'}
              </button>
            </>)}

            {step === 2 && (<>
              <button type="button" onClick={() => { if (!loading && !paying) setStep(1); }} disabled={loading || paying}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
                <ArrowLeft size={14} className="mr-1.5 -mt-0.5 inline" />Back
              </button>
              <button type="button" onClick={() => { if (!paying) onClose(); }} disabled={paying}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
                Pay later
              </button>
              <button type="button" onClick={handlePay} disabled={!selectedTrack || paying}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 shadow-sm transition-colors disabled:opacity-50">
                <CreditCard size={14} className="mr-1.5 -mt-0.5 inline" />
                {paying ? 'Opening checkout…' : `Pay ₹${Number(selectedTrack?.price ?? 0).toLocaleString()} & Enroll`}
              </button>
            </>)}

            {step === 3 && (
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 shadow-sm transition-colors">
                Done
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
