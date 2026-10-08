import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { EyeIcon, EyeOffIcon } from '@animateicons/react/lucide';
import { institutionApi, partnerApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import SearchableSelect from '../SearchableSelect';
import PasswordHints from '../ui/PasswordHints';
import { passwordChecks, passwordPolicyError } from '../../passwordPolicy';
import { biharUniversities } from '../../data/biharUniversities';

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
  university: '', college: '', course: '', year: '', rollNo: '', regNo: '',
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

export default function RegisterStudentModal({ open, onClose, onCreated }: Props) {
  const popup = usePopup();
  const [form, setForm] = useState(emptyForm);
  const [universities, setUniversities] = useState<{ name: string; shortName: string; colleges: { name: string; district: string }[] }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);

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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const set = (field: string, value: string) => setForm({ ...form, [field]: value });

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

    if (!form.fullName.trim() || !form.email || !form.phone || !form.gender || !isValidDob(form.dob)) {
      setError('Please fill all personal details'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Invalid email format'); return;
    }
    if (!form.university || !form.college || !form.course || !form.year || !form.rollNo || !form.regNo) {
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
      await partnerApi.registerStudent({ ...rest, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') });
      popup.success(
        `${fullName} is registered and attributed to your partner account. Share these credentials so they can sign in: ${form.email} / ${form.password}`,
        'Student Registered'
      );
      setForm(emptyForm);
      setTerms(false);
      setShowPassword(false);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !loading && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Register Student</h2>
            <p className="text-xs text-gray-500 mt-0.5">Same details as a normal registration — the student is attributed to your partner account</p>
          </div>
          <button onClick={() => !loading && onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
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
                <select value={form.course} onChange={(e) => set('course', e.target.value)} className={selectCls}>
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 sticky bottom-0">
            <button type="button" onClick={() => !loading && onClose()} disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 shadow-sm transition-colors disabled:opacity-50">
              {loading ? 'Registering…' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
