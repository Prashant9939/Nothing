import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import PasswordHints from '../ui/PasswordHints';
import { passwordPolicyError } from '../../passwordPolicy';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all';

const emptyForm = {
  partnerName: '', fullName: '', email: '', phone: '',
  password: '', confirmPassword: '',
};

export default function NewPartnerModal({ open, onClose, onCreated }: Props) {
  const popup = usePopup();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const set = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.partnerName.trim() || !form.fullName.trim() || !form.phone) {
      setError('Please fill the partner name, contact name and phone'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Invalid email format'); return;
    }
    const policyError = passwordPolicyError(form.password);
    if (policyError) { setError(policyError); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const nameParts = form.fullName.trim().split(/\s+/);
      await adminApi.createPartner({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' '),
        email: form.email,
        phone: form.phone,
        partnerName: form.partnerName.trim(),
        password: form.password,
      });
      popup.success(
        `${form.partnerName} created. Partner credentials: ${form.email} / ${form.password}`,
        'Partner Created'
      );
      setForm(emptyForm);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create the partner.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !loading && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Partner</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create a partner account — they sign in at the Partner Portal with these credentials</p>
          </div>
          <button onClick={() => !loading && onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Partner Organisation</p>
              <input type="text" value={form.partnerName} onChange={(e) => set('partnerName', e.target.value)} placeholder="Organisation / partner name *" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Contact person name *" autoComplete="name" className={inputCls} />
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone number *" className={inputCls} />
              </div>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Login email *" className={inputCls} />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Login Credentials</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Create password *" minLength={6} className={inputCls} />
                <input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Confirm password *" className={inputCls} />
              </div>
              <PasswordHints value={form.password} className="mt-0" />
              <p className="text-xs text-gray-500">Share these credentials with the partner — they can sign in immediately and register students.</p>
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
              {loading ? 'Creating…' : 'Create Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
