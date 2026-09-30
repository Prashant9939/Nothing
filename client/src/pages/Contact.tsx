import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Lock, Mail, MapPin, MessageSquare, Phone, Target } from 'lucide-react';
import api from '../api';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/contact', form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => setForm({ ...form, [field]: value });

  const contactMethods = [
    { icon: <Mail className="w-8 h-8 text-orange-500" />, title: 'Email Us', desc: 'Our team responds within 24 hours', details: ['support@iqintern.in', 'info@iqintern.in'] },
    { icon: <Phone className="w-8 h-8 text-orange-500" />, title: 'Call Us', desc: 'Mon - Sat, 9AM - 8PM IST', details: ['+91 9939503289'] },
    { icon: <MessageSquare className="w-8 h-8 text-orange-500" />, title: 'WhatsApp', desc: 'Instant replies during business hours', details: ['Chat with us anytime'] },
    { icon: <MapPin className="w-8 h-8 text-orange-500" />, title: 'Visit Us', desc: 'Virtual Office - India', details: ['IQIntern Education Pvt. Ltd.'] },
  ];

  const faqs = [
    { q: 'How do I enroll in a program?', a: 'Simply create an account, browse our programs, and click enroll on your preferred track. You can complete registration and payment in under 2 minutes.' },
    { q: 'What payment methods do you accept?', a: 'We accept UPI, credit/debit cards, net banking, and wallets through our secure RazorPay payment gateway.' },
    { q: 'How long does certificate verification take?', a: 'Certificates are instantly verifiable through our public verification portal. Simply enter the certificate ID to view all details.' },
    { q: 'Can I get a refund?', a: 'Yes, we offer refunds within 7 days of enrollment if you haven\'t started the program. Contact our support team for assistance.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark to-dark-light text-white py-20 px-4 -mt-24 pt-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-blue-300 font-medium mb-4 uppercase tracking-wider">Get In Touch</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Contact Us<br />
            <span className="text-blue-400">We're Here to Help</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Have questions about our programs, enrollment, or verification? Our dedicated support team is available 24/7 to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors">
              Explore Programs
            </Link>
            <a href="#contact-form" className="px-8 py-3 border border-gray-600 text-white font-semibold rounded-lg hover:border-white transition-colors">
              Send Message
            </a>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Multiple Ways to Reach Us</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Choose the contact method that works best for you. We're committed to responding quickly.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {contactMethods.map((method, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="mb-4 flex justify-center">{method.icon}</div>
                <h3 className="font-semibold mb-2">{method.title}</h3>
                <p className="text-gray-500 text-sm mb-3">{method.desc}</p>
                {method.details.map((d, j) => (
                  <p key={j} className="text-orange-500 text-sm font-medium">{d}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section id="contact-form" className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-10">
          {/* Contact Info */}
          <div className="md:col-span-2 reveal reveal-pop">
            <h2 className="text-2xl font-bold mb-4">Send Us a Message</h2>
            <p className="text-gray-500 text-sm mb-8">Fill out the form and our team will get back to you within 24 hours. We value your feedback and inquiries.</p>

            <div className="space-y-6">
              {[
                { icon: <Clock className="w-5 h-5" />, title: 'Response Time', desc: 'Within 24 hours on business days' },
                { icon: <Lock className="w-5 h-5" />, title: 'Privacy Guaranteed', desc: 'Your information is secure with us' },
                { icon: <Target className="w-5 h-5" />, title: 'Expert Support', desc: 'Get help from trained professionals' },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-4 reveal reveal-pop" style={{ transitionDelay: `${150 + i * 90}ms` }}>
                  <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-sm mb-3">Follow Us</h3>
              <div className="flex gap-2">
                {['f', 'in', 'X', 'YT', 'IG'].map((s) => (
                  <a key={s} href="#" className="w-9 h-9 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs font-bold hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors">{s}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3 bg-white border border-gray-200 rounded-xl p-6">
            {submitted ? (
              <div className="bg-green-50 text-green-700 p-8 rounded-lg text-center border border-green-200">
                <div className="mb-4 flex justify-center"><CheckCircle2 className="w-12 h-12 text-green-600" /></div>
                <h3 className="font-bold text-xl mb-2">Message Sent Successfully!</h3>
                <p className="text-sm mb-6">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                  className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
              {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Your name" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Your email" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Your phone number" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select value={form.subject} onChange={(e) => updateField('subject', e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="program">Program Information</option>
                    <option value="payment">Payment Issue</option>
                    <option value="certificate">Certificate Verification</option>
                    <option value="technical">Technical Support</option>
                    <option value="partnership">Partnership Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} rows={4} placeholder="How can we help you?" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600">Quick answers to common queries about our platform and programs.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-white border border-gray-200 rounded-lg group reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <summary className="p-4 cursor-pointer font-semibold text-sm hover:bg-gray-50 transition-colors list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white text-center rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/10 animate-float relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="relative py-16 px-8 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Join thousands of students who have accelerated their careers with verified certifications from IQIntern.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-3 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors">Create Account</Link>
              <Link to="/certification" className="px-8 py-3 border border-white/30 font-semibold rounded-lg hover:bg-white/10 transition-colors">Verify</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
