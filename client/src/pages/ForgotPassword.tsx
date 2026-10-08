import { useState, Fragment } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import AuthSplit from '../components/AuthSplit';
import PasswordHints from '../components/ui/PasswordHints';
import { passwordPolicyError } from '../passwordPolicy';
import { EyeIcon } from "@animateicons/react/lucide";
import { EyeOffIcon } from "@animateicons/react/lucide";
import { CheckIcon } from "@animateicons/react/lucide";
import { XIcon } from "@animateicons/react/lucide";
import { MailIcon } from "@animateicons/react/lucide";
import { PhoneIcon } from "@animateicons/react/lucide";
import { FileTextIcon } from "@animateicons/react/lucide";
import { BookOpenIcon } from "@animateicons/react/lucide";
import { LockIcon } from "@animateicons/react/lucide";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [ident, setIdent] = useState({ email: '', phone: '', regNo: '', rollNo: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (field: string, value: string) => setIdent({ ...ident, [field]: value });

  const inputBase =
    'w-full pl-11 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-300';

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!ident.email || !ident.phone || !ident.regNo || !ident.rollNo) {
      setError('Please fill all four details'); return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(ident);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword || !confirmPassword) {
      setError('Enter and confirm your new password'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match'); return;
    }
    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      setError(policyError); return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ ...ident, newPassword, confirmPassword });
      setSuccess(res.data.message || 'Password updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not reset the password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Verify Identity', 'New Password'];

  return (
    <AuthSplit>
      <div>
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 ring-1 ring-orange-100 hover:scale-105 transition-all duration-300">
            <img src="/logo/logo-iq.png" alt="IQIntern" className="h-7 w-7 object-contain" />
          </div>
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Reset password</h1>
        <p className="mt-2 text-sm text-gray-500">
          {success ? 'Password changed' : `Step ${step} of 2 · ${stepLabels[step - 1]}`}
        </p>
      </div>

      {!success && (
        <div className="flex items-start mb-4 mt-5">
          {stepLabels.map((label, i) => (
            <Fragment key={label}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 mx-1 sm:mx-3 mt-[15px] rounded-full transition-all duration-500 ${step > i ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-200/60'}`} />
              )}
              <div className="flex flex-col items-center gap-1 shrink-0 w-24 sm:w-32">
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
      )}

      {error && (
        <div className="mt-5 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
          <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600"><CheckIcon size={12} /></span>
          {success}
        </div>
      )}

      {/* Success: done */}
      {success && (
        <button
          onClick={() => navigate('/login')}
          className="mt-6 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5"
        >
          Back to Sign In
        </button>
      )}

      {/* Step 1: verify identity */}
      {!success && step === 1 && (
        <form onSubmit={handleVerify} className="mt-6 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Registered Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <MailIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="fp-email"
                  type="email"
                  value={ident.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="Email *"
                  required
                  className={`${inputBase} pr-4`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="fp-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
              <div className="relative">
                <PhoneIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="fp-phone"
                  type="tel"
                  value={ident.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Phone *"
                  required
                  className={`${inputBase} pr-4`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="fp-regno" className="block text-sm font-medium text-gray-700 mb-1.5">Registration number</label>
              <div className="relative">
                <FileTextIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="fp-regno"
                  type="text"
                  value={ident.regNo}
                  onChange={(e) => set('regNo', e.target.value)}
                  placeholder="Reg. number *"
                  required
                  className={`${inputBase} pr-4`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="fp-rollno" className="block text-sm font-medium text-gray-700 mb-1.5">Roll number</label>
              <div className="relative">
                <BookOpenIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="fp-rollno"
                  type="text"
                  value={ident.rollNo}
                  onChange={(e) => set('rollNo', e.target.value)}
                  placeholder="Roll number *"
                  required
                  className={`${inputBase} pr-4`}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">Enter all four details exactly as registered. They must all match your account.</p>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Verifying...' : 'Verify Details →'}
          </button>
        </form>
      )}

      {/* Step 2: new password */}
      {!success && step === 2 && (
        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Set New Password</p>
          <div>
            <label htmlFor="fp-new" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <div className="relative">
              <LockIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="fp-new"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password *"
                required
                minLength={6}
                className={`${inputBase} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
            <PasswordHints value={newPassword} />
          </div>
          <div>
            <label htmlFor="fp-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <div className="relative">
              <LockIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="fp-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password *"
                required
                className={`${inputBase} pr-4`}
              />
            </div>
          </div>
          {newPassword && confirmPassword && (
            <p className={`text-xs font-medium inline-flex items-center gap-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
              {newPassword === confirmPassword ? <><CheckIcon size={13} /> Passwords match</> : <><XIcon size={13} /> Passwords do not match yet</>}
            </p>
          )}
          <p className="text-xs text-gray-500">6+ characters with uppercase, lowercase, a number and a symbol.</p>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              disabled={loading}
              className="flex-1 py-3 bg-gray-200/50 text-gray-700 font-semibold rounded-xl hover:bg-gray-200/80 transition-all disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-5 text-sm text-gray-500">
        Remembered it?{' '}
        <Link to="/login" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  );
}
