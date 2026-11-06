import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, CheckCircle2, Handshake, Mail, MapPin, MessageSquare, Phone, Send, User } from 'lucide-react';
import { publicApi } from '../api';

// Interest form shown on the public /partners page: anyone can apply to
// become a partner. It collects only what the triage needs — the commission
// rate is an internal admin decision and is deliberately never collected,
// hinted at or displayed here.

const inputCls =
  'w-full pl-11 pr-4 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200';

const emptyForm = { organization: '', name: '', email: '', phone: '', city: '', message: '' };

export default function PartnerInterestForm() {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.organization.trim() || !form.name.trim()) {
      setError('Please fill in the organisation and contact person name');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }
    const digits = form.phone.replace(/\D/g, '');
    if (form.phone.trim() && (digits.length < 7 || digits.length > 15)) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      await publicApi.submitPartnerInterest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        organization: form.organization.trim(),
        city: form.city.trim(),
        message: form.message.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_rgba(15,23,42,0.07),0_8px_24px_rgba(15,23,42,0.04)] p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/60">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h3 className="text-xl font-bold mb-2">Application Received!</h3>
        <p className="text-sm text-gray-500 mb-7 max-w-md mx-auto">
          Thank you, {form.name.split(' ')[0] || 'there'}. Our partnership team will review your details and
          get back to you shortly.
        </p>
        <button
          onClick={() => { setForm(emptyForm); setSubmitted(false); }}
          className="px-7 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_rgba(15,23,42,0.07),0_8px_24px_rgba(15,23,42,0.04)]">
      {/* Warm corner glows — echoes the contact panel ambience */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600" />

      <div className="p-7 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
            <Handshake className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Apply to become a partner</h3>
            <p className="text-xs text-gray-500">Tell us about your institute — we reply within 24 hours.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-200 flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold">!</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pi-org" className="block text-sm font-medium text-gray-700 mb-1.5">Organisation / Institute</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="pi-org" type="text" value={form.organization}
                onChange={(e) => set('organization', e.target.value)}
                placeholder="Your college, institute or company" required autoComplete="organization"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pi-name" className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="pi-name" type="text" value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name" required autoComplete="name"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label htmlFor="pi-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="pi-email" type="email" value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@institute.edu" required autoComplete="email"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pi-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="pi-phone" type="tel" value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Your phone number" autoComplete="tel"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label htmlFor="pi-city" className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="pi-city" type="text" value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="City" autoComplete="address-level2"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="pi-message" className="block text-sm font-medium text-gray-700 mb-1.5">
              About your institute <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MessageSquare size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
              <textarea
                id="pi-message" value={form.message}
                onChange={(e) => set('message', e.target.value)}
                rows={4} maxLength={2000}
                placeholder="Strengths, student volume, locations — anything that helps us understand your institute."
                className="w-full pl-11 pr-4 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 resize-y"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              <>
                <Send size={16} />
                Submit Application
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By submitting you agree to be contacted about the partnership programme.
          </p>
        </form>
      </div>
    </div>
  );
}
