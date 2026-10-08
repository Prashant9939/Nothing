import { useState, useEffect, Fragment } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { biharUniversities } from '../data/biharUniversities';
import { institutionApi } from '../api';
import SearchableSelect from '../components/SearchableSelect';
import AuthSplit from '../components/AuthSplit';
import PasswordHints from '../components/ui/PasswordHints';
import { passwordChecks, passwordPolicyError } from '../passwordPolicy';
import { CheckIcon } from "@animateicons/react/lucide";
import { EyeIcon } from "@animateicons/react/lucide";
import { EyeOffIcon } from "@animateicons/react/lucide";

const sessionOptions = Array.from({ length: 8 }, (_, i) => {
  const start = new Date().getFullYear() - i;
  return `${start}-${start + 4}`;
});

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', gender: '', dob: '',
    university: '', college: '', course: '', year: '', rollNo: '', regNo: '',
    guardianName: '', guardianPhone: '', guardianRelation: '',
    password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [universities, setUniversities] = useState<{ name: string; shortName: string; colleges: { name: string; district: string }[] }[]>([]);

  useEffect(() => {
    institutionApi.getUniversities()
      .then((res) => {
        const list = res.data.universities || [];
        setUniversities(list.length > 0 ? list : biharUniversities);
      })
      .catch(() => setUniversities(biharUniversities));
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) navigate('/student/select-track', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const passwordStrength = (pwd: string) => {
    const passed = Object.values(passwordChecks(pwd)).filter(Boolean).length;
    return Math.min(4, Math.ceil((passed / 5) * 4));
  };

  const strength = passwordStrength(form.password);
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const updateField = (field: string, value: string) => setForm({ ...form, [field]: value });

  const isValidDob = (dob: string) => {
    if (!dob || dob.includes('YYYY') || dob.includes('MM') || dob.includes('DD')) return false;
    const d = new Date(dob);
    return !isNaN(d.getTime()) && d < new Date();
  };

  const handleNext = () => {
    setError('');
    setSuccess('');
    if (step === 1 && form.fullName.trim() && form.email && form.phone && form.gender && isValidDob(form.dob)) {
      setStep(2);
    } else if (step === 1) {
      setError('Please fill all fields');
    } else if (step === 2 && form.university && form.college && form.course && form.year && form.rollNo && form.regNo) {
      setStep(3);
    } else if (step === 2) {
      setError('Please fill all fields');
    } else if (step === 3 && form.guardianName && form.guardianPhone && form.guardianRelation) {
      setStep(4);
    } else if (step === 3) {
      setError('Please fill all fields');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const policyError = passwordPolicyError(form.password);
    if (policyError) { setError(policyError); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!terms) { setError('Please agree to Terms'); return; }
    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, fullName, ...rest } = form;
      const nameParts = fullName.trim().split(/\s+/);
      await register({ ...rest, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') });
      sessionStorage.setItem('iq:channel-banner', '1');
      setSuccess('Account created successfully!');
    } catch (err: any) {
      setError(err.message || err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = Array.from({ length: 60 }, (_, i) => 2010 - i);

  const stepLabels = ['Account', 'Academic', 'Guardian', 'Security'];

  return (
    <AuthSplit wide>
      <Link to="/" className="inline-flex items-center gap-2.5 mb-4 self-start">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 ring-1 ring-orange-100 hover:scale-105 transition-all duration-300">
          <img src="/logo/logo-iq.png" alt="IQIntern" className="h-7 w-7 object-contain" />
        </div>
      </Link>

      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Create your account</h1>

      {/* Step Indicator — numbered circles (matches About/VerifyCertificate step template) */}
      <div className="flex items-start mb-5 mt-6">
        {stepLabels.map((label, i) => (
          <Fragment key={label}>
            {i > 0 && (
              <div className={`flex-1 h-0.5 mx-1 sm:mx-3 mt-[15px] rounded-full transition-all duration-500 ${step > i ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-200/60'}`} />
            )}
            <div className="flex flex-col items-center gap-1 shrink-0 w-14 sm:w-20">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/30 ring-4 ring-orange-100' : 'bg-gray-200/70 text-gray-500'}`}>
                {step > i + 1 ? <CheckIcon size={16} /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${step === i + 1 ? 'text-orange-600' : step > i + 1 ? 'text-green-600' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
          <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50/80 backdrop-blur border border-green-200 text-green-700 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
          <span className="shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600"><CheckIcon size={12} /></span>
          {success}
        </div>
      )}

      {/* Step 1: Account */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Personal Information</p>
          <input type="text" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Full name *" required autoComplete="name" className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Email address *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
            <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Phone number *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)} required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
            <option value="">Gender *</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
            <select value={form.dob.split('-')[2] || ''} onChange={(e) => { const parts = form.dob.split('-'); updateField('dob', `${parts[0] || 'YYYY'}-${parts[1] || 'MM'}-${e.target.value}`); }} required className="w-full px-3 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
              <option value="">Day</option>
              {days.map(d => <option key={d} value={String(d).padStart(2, '0')}>{d}</option>)}
            </select>
            <select value={form.dob.split('-')[1] || ''} onChange={(e) => { const parts = form.dob.split('-'); updateField('dob', `${parts[0] || 'YYYY'}-${e.target.value}-${parts[2] || 'DD'}`); }} required className="w-full px-3 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
              <option value="">Month</option>
              {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
            <select value={form.dob.split('-')[0] || ''} onChange={(e) => { const parts = form.dob.split('-'); updateField('dob', `${e.target.value}-${parts[1] || 'MM'}-${parts[2] || 'DD'}`); }} required className="w-full px-3 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="button" onClick={handleNext} className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5">
            Continue to Academic Details →
          </button>
        </div>
      )}

      {/* Step 2: Academic */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Details</p>
          <SearchableSelect
            options={[
              ...universities.map(u => ({ label: u.name, value: u.name, sub: u.shortName })),
              { label: 'Other (Not in Bihar)', value: 'other' },
            ]}
            value={form.university}
            onChange={(v) => setForm({ ...form, university: v, college: '' })}
            placeholder="Search & select university *"
            required
          />
          {form.university && form.university !== 'other' && (
            <SearchableSelect
              options={(universities.find(u => u.name === form.university)?.colleges || []).map(c => ({ label: c.name, value: c.name, sub: c.district }))}
              value={form.college}
              onChange={(v) => setForm({ ...form, college: v })}
              placeholder="Search & select college *"
              required
            />
          )}
          {form.university === 'other' && (
            <input type="text" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Enter your college name *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          )}
          {!form.university && (
            <input type="text" disabled placeholder="Select university first *" className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-500 placeholder-gray-400 transition-all opacity-50 cursor-not-allowed" />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={form.course} onChange={(e) => updateField('course', e.target.value)} required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
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
          <select value={form.year} onChange={(e) => updateField('year', e.target.value)} required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
            <option value="">Session *</option>
            {sessionOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.rollNo} onChange={(e) => updateField('rollNo', e.target.value)} placeholder="Roll Number *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
            <input type="text" value={form.regNo} onChange={(e) => updateField('regNo', e.target.value)} placeholder="Registration No. *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 bg-gray-200/50 text-gray-700 font-semibold rounded-xl hover:bg-gray-200/80 transition-all">
              ← Back
            </button>
            <button type="button" onClick={handleNext} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Guardian */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.guardianName} onChange={(e) => updateField('guardianName', e.target.value)} placeholder="Guardian Name *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          <input type="tel" value={form.guardianPhone} onChange={(e) => updateField('guardianPhone', e.target.value)} placeholder="Guardian Phone Number *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          </div>
          <select value={form.guardianRelation} onChange={(e) => updateField('guardianRelation', e.target.value)} required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all">
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
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 bg-gray-200/50 text-gray-700 font-semibold rounded-xl hover:bg-gray-200/80 transition-all">
              ← Back
            </button>
            <button type="button" onClick={handleNext} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Security */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Security</p>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Create password *" required minLength={6} className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors">
              {showPassword ? (
                <EyeOffIcon size={20} />
              ) : (
                <EyeIcon size={20} />
              )}
            </button>
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
          <PasswordHints value={form.password} />
          <input type="password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} placeholder="Confirm password *" required className="w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20" />
            <span className="text-xs text-gray-500">I agree to <Link to="/terms" className="text-orange-500 hover:underline">Terms</Link> & <Link to="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link></span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-2.5 bg-gray-200/50 text-gray-700 font-semibold rounded-xl hover:bg-gray-200/80 transition-all">
              ← Back
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-5 text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  );
}
