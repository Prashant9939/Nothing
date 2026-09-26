import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { adminApi, institutionApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import SearchableSelect from '../SearchableSelect';
import { biharUniversities } from '../../data/biharUniversities';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600 transition-all';

const selectCls = inputCls + ' cursor-pointer';

const sectionTitle = 'text-xs font-medium text-gray-500 uppercase tracking-wider';

const sessionOptions = Array.from({ length: 8 }, (_, i) => {
  const start = new Date().getFullYear() - i;
  return `${start}-${start + 4}`;
});

const emptyForm = {
  registeredAt: new Date().toISOString().slice(0, 10),
  fullName: '', email: '', phone: '', gender: '', dob: '',
  university: '', college: '', course: '', year: '', rollNo: '', regNo: '',
  guardianName: '', guardianPhone: '', guardianRelation: '',
  password: '', confirmPassword: '',
};

export default function NewRegistrationModal({ open, onClose, onCreated }: Props) {
  const popup = usePopup();
  const [form, setForm] = useState(emptyForm);
  const [universities, setUniversities] = useState<{ name: string; shortName: string; colleges: { name: string; district: string }[] }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || universities.length > 0) return;
    institutionApi.getUniversities()
      .then((res) => {
        const list = res.data.universities || [];
        setUniversities(list.length > 0 ? list : biharUniversities);
      })
      .catch(() => setUniversities(biharUniversities));
  }, [open, universities.length]);

  if (!open) return null;

  const set = (field: string, value: string) => setForm({ ...form, [field]: value });
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim() || !form.email || !form.phone || !form.gender || !form.dob) {
      setError('Please fill all personal details'); return;
    }
    if (!form.university || !form.college || !form.course || !form.year || !form.rollNo || !form.regNo) {
      setError('Please fill all academic details'); return;
    }
    if (!form.guardianName || !form.guardianPhone || !form.guardianRelation) {
      setError('Please fill all guardian details'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Invalid email format'); return;
    }
    if (form.dob > today) { setError('Date of birth cannot be in the future'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!form.registeredAt || form.registeredAt > today) {
      setError('Registration date cannot be in the future'); return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, fullName, ...rest } = form;
      const nameParts = fullName.trim().split(/\s+/);
      await adminApi.registerUser({ ...rest, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') });
      const pretty = new Date(form.registeredAt + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      popup.success(`${form.fullName} registered (dated ${pretty}). They can now sign in with their email and password.`, 'Registration Created');
      setForm({ ...emptyForm, registeredAt: today });
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
            <h2 className="text-lg font-bold text-gray-900">New Registration</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create a student account with the same details as a normal registration</p>
          </div>
          <button onClick={() => !loading && onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-7">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
                {error}
              </div>
            )}

            {/* Registration Date */}
            <div className="space-y-2">
              <p className={sectionTitle}>Registration Date</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Date of registration *</label>
                  <input type="date" value={form.registeredAt} max={today} onChange={(e) => set('registeredAt', e.target.value)} className={inputCls + ' w-auto'} required />
                </div>
                <p className="text-xs text-gray-500 flex-1 min-w-[220px] leading-relaxed">
                  This is the date shown as the account's registration (joined) date across the admin panel.
                  When this student enrolls in an internship, it starts from this date — not from the payment date.
                  Defaults to today; cannot be set in the future.
                </p>
              </div>
            </div>

            {/* Personal */}
            <div className="space-y-3">
              <p className={sectionTitle}>Personal Information</p>
              <input type="text" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Full name *" autoComplete="name" className={inputCls} />
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email address *" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone number *" className={inputCls} />
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={selectCls}>
                  <option value="">Gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Date of birth *</label>
                <input type="date" value={form.dob} max={today} onChange={(e) => set('dob', e.target.value)} className={inputCls + ' w-auto'} />
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
              <div className="grid grid-cols-2 gap-3">
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
              <p className={sectionTitle}>Security</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Create password *" minLength={8} className={inputCls} />
                <input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Confirm password *" className={inputCls} />
              </div>
              <p className="text-xs text-gray-400">Share these credentials with the student — they can sign in immediately.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 sticky bottom-0">
            <button type="button" onClick={() => !loading && onClose()} disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
