import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Handshake,
  Headphones,
  LayoutDashboard,
  Link2,
  Lock,
  ScrollText,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { ctaPrimaryClass, ctaSecondaryDarkClass, ctaSecondaryLightClass } from '../components/ui';
import PartnerInterestForm from '../components/PartnerInterestForm';

// Mirrors paymentBadge() in the live partner dashboard, so the preview shows
// the exact chips a partner really sees next to each registration.
const payBadge = (status: string) =>
  status === 'completed'
    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    : status === 'pending'
      ? 'bg-amber-50 text-amber-700 border border-amber-100'
      : 'bg-red-50 text-red-600 border border-red-100';

export default function Partner() {
  const benefits = [
    { icon: <LayoutDashboard className="w-8 h-8 text-orange-500" />, title: 'Dedicated Partner Dashboard', desc: 'A secure B2B workspace with the numbers that matter — students, registrations, paid amount, pending payments and generated documents at a glance.' },
    { icon: <UserPlus className="w-8 h-8 text-orange-500" />, title: 'Register Students in Minutes', desc: 'A guided multi-step flow — student information, program selection and payment — built on IQIntern\'s existing registration infrastructure.' },
    { icon: <Wallet className="w-8 h-8 text-orange-500" />, title: 'Accurate Payment Tracking', desc: 'Every registration shows its live payment state: pending, processing, paid, failed or refunded. One successful payment maps to exactly one registration.' },
    { icon: <FileText className="w-8 h-8 text-orange-500" />, title: 'Secure Document Access', desc: 'Preview and download eligible PDFs — offer letters, certificates, marksheets and internship reports — for your own students only, with every download audited.' },
    { icon: <BarChart3 className="w-8 h-8 text-orange-500" />, title: 'Analytics & Reporting', desc: 'Registration, student, payment and document performance with date-range, program-wise and status breakdowns — plus export limited to your own records.' },
    { icon: <Headphones className="w-8 h-8 text-orange-500" />, title: 'Built-in Support', desc: 'A real ticket system inside the portal. Create a ticket, get admin replies and follow it from open to resolved — no external email threads.' },
  ];

  const steps = [
    { num: 1, title: 'Apply & Get Approved', desc: 'Send a partnership inquiry. Our team reviews your institute and issues your Partner ID.' },
    { num: 2, title: 'Get Portal Access', desc: 'Log in to the partner portal with role-based access scoped strictly to your own records.' },
    { num: 3, title: 'Register a Student', desc: 'Enter student details, choose an approved program and complete payment through the standard IQIntern flow.' },
    { num: 4, title: 'Permanent Attribution', desc: 'The registration is permanently stamped with your Partner ID — the basis for reporting and future commissions.' },
    { num: 5, title: 'Track & Download', desc: 'Follow payment status live and download the generated documents for your students whenever eligible.' },
  ];

  const partnerStats = [
    { number: '48+', label: 'Institute Partners' },
    { number: '2,400+', label: 'Students Registered' },
    { number: '15,000+', label: 'Documents Generated' },
    { number: '24h', label: 'Support Response' },
  ];

  // Sample figures for the preview — labels and columns match the live
  // /partner dashboard exactly (stats[] and the Recent Students table there).
  const kpis = [
    { label: 'Students', value: '128', sub: '76 active' },
    { label: 'Registrations', value: '94', sub: 'referred enrollments' },
    { label: 'Pending Amount', value: '₹47,000', sub: 'awaiting payment' },
    { label: 'Documents', value: '620', sub: '41 certificates' },
    { label: 'Partner Sign-ins', value: '36', sub: 'last: today' },
  ];

  const recent = [
    { name: 'Rahul Kumar', email: 'rahul.kumar@example.com', program: 'Data Science', enrolled: '4 Nov 2026', pay: 'completed' },
    { name: 'Aman Singh', email: 'aman.singh@example.com', program: 'Python Development', enrolled: '3 Nov 2026', pay: 'pending' },
    { name: 'Neha Sharma', email: 'neha.sharma@example.com', program: 'AI / ML', enrolled: '2 Nov 2026', pay: 'completed' },
    { name: 'Priya Verma', email: 'priya.verma@example.com', program: 'Web Development', enrolled: '31 Oct 2026', pay: 'completed' },
  ];

  const recentPayments = [
    { name: 'Neha Sharma', program: 'AI / ML', amount: '₹1,999', status: 'completed' },
    { name: 'Priya Verma', program: 'Web Development', amount: '₹1,999', status: 'completed' },
    { name: 'Rahul Kumar', program: 'Data Science', amount: '₹1,999', status: 'pending' },
  ];

  const security = [
    { icon: <ShieldCheck className="w-6 h-6 text-orange-500" />, title: 'Your Students, Your Data Only', desc: 'Every student and document is locked to your Partner ID. No other institute can ever see your roster or files.' },
    { icon: <Lock className="w-6 h-6 text-orange-500" />, title: 'Enforced at Every Layer', desc: 'Access rules live in the database itself, not just the interface — guessing URLs or IDs gets nothing.' },
    { icon: <ScrollText className="w-6 h-6 text-orange-500" />, title: 'Complete Activity History', desc: 'Every login, registration, payment and download is logged, so you and our team always have a clear record.' },
    { icon: <Link2 className="w-6 h-6 text-orange-500" />, title: 'Safe Document Sharing', desc: 'Download links expire quickly and are personalized — certificates and reports never sit on open public URLs.' },
  ];

  const whoFor = [
    { icon: <GraduationCap className="w-7 h-7 text-orange-500" />, title: 'Colleges & Universities', desc: 'Enroll cohorts and give every student verifiable internship credentials.' },
    { icon: <Building2 className="w-7 h-7 text-orange-500" />, title: 'Training Academies', desc: 'Add certified internship programs to your course catalogue.' },
    { icon: <Users className="w-7 h-7 text-orange-500" />, title: 'Coaching Institutes', desc: 'Offer placement-ready programs without building assessments yourself.' },
    { icon: <Handshake className="w-7 h-7 text-orange-500" />, title: 'Education Consultants', desc: 'Manage multiple student registrations and track them end to end.' },
  ];

  // Exactly the four links the live portal sidebar renders (PartnerLayout.tsx)
  const sidebarNav = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Users, label: 'Students' },
    { icon: Wallet, label: 'Payments' },
    { icon: FileText, label: 'Documents' },
  ];

  const payStates = [
    { label: 'Pending', dot: 'bg-amber-500' },
    { label: 'Processing', dot: 'bg-blue-500' },
    { label: 'Paid', dot: 'bg-green-500' },
    { label: 'Failed', dot: 'bg-red-500' },
    { label: 'Refunded', dot: 'bg-gray-400' },
  ];

  const faqs = [
    { q: 'Who can become a partner?', a: 'Colleges, universities, training academies, coaching institutes and education consultants can all apply. If you enroll students into certified internship programs, you qualify.' },
    { q: 'How does approval work?', a: 'Send a partnership inquiry and our team reviews your institute. Once approved, you receive a unique Partner ID and credentials to log in to the partner portal.' },
    { q: 'Is there a fee to join?', a: 'No. Partnership onboarding is free — program fees apply only per student registration, through the standard IQIntern payment flow.' },
    { q: 'How do commissions work?', a: 'Every registration is permanently stamped with your Partner ID, which forms the basis for revenue share. Commission structures can be set per registration, as a percentage of fees, or tiered by performance.' },
    { q: 'Can students access their own documents?', a: 'Yes. Students keep their own accounts and can access their documents directly. Your portal gives you scoped access to your roster for convenient bulk management.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark to-dark-light text-white -mt-24 flex flex-col justify-center px-4 pt-40 pb-20 min-h-[26rem] md:min-h-[30rem]">
        <div className="max-w-3xl mx-auto text-center w-full">
          <p className="text-sm text-blue-300 font-medium mb-4 uppercase tracking-wider">Partner Program</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">IQIntern Partner Portal</h1>
          <p className="text-gray-400 max-w-xl mx-auto">A secure B2B workspace to register students, track payments and access verified documents — with your attribution on every registration.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <a href="#apply" className={ctaPrimaryClass}>Get Your Partner ID</a>
            <a href="#how-it-works" className={ctaSecondaryDarkClass}>See How It Works</a>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Already a partner?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">Log in to the portal</Link>
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-8">
            {['Register Students in Minutes', 'Track Every Payment Live', 'Download Verified Documents', 'Permanent Attribution'].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-sm text-gray-200"
              >
                <Check size={16} className="text-orange-400" />
                {c}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mt-8 pt-8 border-t border-white/10">
            {partnerStats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-bold text-white">{s.number}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">Why Partner with IQIntern</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-4 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <p className="text-gray-500 mb-10 reveal reveal-pop" style={{ transitionDelay: '150ms' }}>Everything your institute needs to run a certified internship program — without building the platform yourself</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-left">
            {benefits.map((b, i) => (
              <div key={b.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 hover:border-orange-200 transition-all reveal reveal-pop" style={{ transitionDelay: `${150 + i * 80}ms` }}>
                <div className="mb-3">{b.icon}</div>
                <h3 className="font-semibold mb-2">{b.title}</h3>
                <p className="text-gray-600 text-sm">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 bg-gray-50 scroll-mt-28">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">How the Partnership Works</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-10 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-1 transition-all reveal reveal-pop text-left" style={{ transitionDelay: `${150 + i * 80}ms` }}>
                <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">{s.num}</div>
                <h3 className="font-semibold text-sm mb-2 text-center">{s.title}</h3>
                <p className="text-gray-500 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal preview */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">Inside the Partner Portal</h2>
            <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-4 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
            <p className="text-gray-500 reveal reveal-pop" style={{ transitionDelay: '150ms' }}>High-value information first — your business activity is clear the moment you log in</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 items-start">
            {/* Mock dashboard */}
            <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.05)] overflow-hidden reveal reveal-pop">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-[11px] text-gray-400 font-medium">partner.iqintern.in/dashboard</span>
              </div>
              <div className="flex">
                {/* Dark sidebar — same gradient, logo and nav as the live portal */}
                <div className="flex flex-col w-[88px] sm:w-36 shrink-0 bg-gradient-to-b from-[#0a0f1e] via-[#0f172a] to-[#111827] py-3">
                  <div className="flex items-center gap-2 px-3 pb-2.5 mb-2 border-b border-white/5">
                    <img src="/logo/logo-white.png" alt="IQIntern" className="h-4 w-auto object-contain shrink-0" draggable={false} />
                    <span className="hidden sm:block text-[8px] text-slate-400 uppercase tracking-widest">Partner</span>
                  </div>
                  <nav className="flex-1 px-2 space-y-1">
                    {sidebarNav.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                          item.active
                            ? 'bg-orange-500/15 text-white ring-1 ring-inset ring-orange-400/25'
                            : 'text-slate-400'
                        }`}
                      >
                        <item.icon className={`w-3.5 h-3.5 shrink-0 ${item.active ? 'text-orange-400' : 'text-slate-400'}`} />
                        <span className="hidden sm:block truncate">{item.label}</span>
                      </div>
                    ))}
                  </nav>
                  <div className="mt-2 px-2.5 pt-2.5 border-t border-white/5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[9px] font-bold text-white flex items-center justify-center shrink-0">DI</span>
                    <div className="hidden sm:block min-w-0">
                      <p className="text-[9px] text-slate-200 truncate">Demo Institute</p>
                      <p className="text-[8px] text-slate-400">Partner</p>
                    </div>
                  </div>
                </div>

                {/* Portal body */}
                <div className="flex-1 min-w-0 bg-slate-50">
                  {/* Top bar */}
                  <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-white/70 backdrop-blur border-b border-gray-200/60">
                    <div className="min-w-0">
                      <p className="text-[8px] font-medium uppercase tracking-wider text-slate-500">Partner Portal</p>
                      <p className="text-[11px] font-semibold text-slate-900 truncate">Dashboard</p>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[9px] font-bold text-white flex items-center justify-center shrink-0 ring-2 ring-orange-100">DI</span>
                  </div>

                  <div className="p-3 sm:p-4 space-y-3">
                    {/* Dark hero banner — same one the live dashboard opens with */}
                    <div className="rounded-xl p-3 flex flex-wrap items-center gap-3 bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a2332] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-[11px] font-bold text-white flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(249,115,22,0.4)]">DI</span>
                      <div className="min-w-0">
                        <p className="text-[8px] uppercase tracking-widest text-orange-400">Partner Portal</p>
                        <p className="text-xs font-bold text-white truncate">Demo Institute of Technology</p>
                        <p className="text-[9px] text-slate-400 truncate">partner@demo-institute.edu · 9876543210</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-[9px] font-semibold text-white">Register Student</span>
                        <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25 text-[9px] font-semibold">active</span>
                      </div>
                    </div>

                    {/* The same five KPI tiles the live dashboard shows */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                      {kpis.map((k) => (
                        <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-2.5">
                          <div className="text-sm font-bold text-gray-900">{k.value}</div>
                          <div className="text-[9px] text-gray-500 mt-0.5">{k.label}</div>
                          <div className="text-[8px] text-gray-400 mt-0.5">{k.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent Students */}
                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                        <p className="text-[11px] font-semibold text-gray-900">Recent Students</p>
                        <span className="text-[9px] font-semibold text-orange-600">View all</span>
                      </div>
                      <table className="w-full text-[10px]">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                          <tr>
                            <th className="text-left font-semibold px-3 py-1.5">Student</th>
                            <th className="text-left font-semibold px-3 py-1.5 hidden sm:table-cell">Program</th>
                            <th className="text-left font-semibold px-3 py-1.5 hidden md:table-cell">Enrolled</th>
                            <th className="text-left font-semibold px-3 py-1.5">Payment</th>
                            <th className="text-left font-semibold px-3 py-1.5">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {recent.map((r) => (
                            <tr key={r.email} className="hover:bg-gray-50">
                              <td className="px-3 py-1.5">
                                <div className="font-medium text-gray-900">{r.name}</div>
                                <div className="text-[9px] text-gray-400 truncate max-w-[9rem]">{r.email}</div>
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 hidden sm:table-cell">{r.program}</td>
                              <td className="px-3 py-1.5 text-gray-500 hidden md:table-cell whitespace-nowrap">{r.enrolled}</td>
                              <td className="px-3 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${payBadge(r.pay)}`}>{r.pay}</span>
                              </td>
                              <td className="px-3 py-1.5"><span className="text-orange-600 font-semibold">View</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Recent Payments */}
                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                        <p className="text-[11px] font-semibold text-gray-900">Recent Payments</p>
                        <span className="text-[9px] font-semibold text-orange-600">View all</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {recentPayments.map((p) => (
                          <div key={p.name} className="flex items-center justify-between gap-2 px-3 py-1.5">
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-[9px] text-gray-400 truncate">{p.program}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] font-semibold text-gray-900">{p.amount}</p>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${payBadge(p.status)}`}>{p.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[9px] text-gray-400 text-right">Illustrative preview — figures shown are examples</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Portal capabilities */}
            <div className="lg:col-span-2 space-y-4 reveal reveal-pop" style={{ transitionDelay: '150ms' }}>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Documents You Can Access</h3>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  {['Offer Letter', 'Internship Certificate', 'Marksheet', 'Internship Report', 'Other approved program PDFs'].map((d) => (
                    <li key={d} className="flex items-center gap-2.5">
                      <Check size={15} className="text-green-500 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold mb-3">Live Payment States</h3>
                <p className="text-sm text-gray-600 mb-4">Every registration shows exactly where its money is — one successful payment maps to exactly one registration.</p>
                <div className="flex flex-wrap gap-2">
                  {payStates.map((p) => (
                    <span key={p.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold mb-3">Built-in Support</h3>
                <p className="text-sm text-gray-600 mb-4">Create a ticket inside the portal, get admin replies and track it from open to resolved — no external email threads.</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">Resolved</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">Open</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">In Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="pb-16 px-4">
        <div className="max-w-4xl mx-auto bg-gray-50 border border-gray-200 rounded-3xl p-8 md:p-12 text-center reveal reveal-pop">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Want a walkthrough for your institute?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">See the portal live, ask about eligibility and get your Partner ID set up — usually in one call.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact?subject=partnership" className={ctaPrimaryClass}>Book a Demo</Link>
            <Link to="/login" className={ctaSecondaryLightClass}>Partner Login</Link>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-2">Secure by Design</h2>
            <div className="w-12 h-1 bg-orange-500 rounded-full mb-6" />
            <p className="text-gray-600 mb-4 leading-relaxed">Partners get a focused B2B window into the platform — scoped strictly to your own institute. Every registration permanently records which partner created it, and every document request is verified again before anything is shared.</p>
            <p className="text-gray-600 leading-relaxed">If a partnership is ever paused, new actions stop immediately while your historical records stay intact.</p>
            <Link to="/contact?subject=partnership" className="inline-flex items-center gap-2 mt-6 text-orange-600 font-semibold hover:text-orange-700 transition-colors group">
              Talk to our team
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
            {security.map((s, i) => (
              <div key={s.title} className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4 hover:shadow-md transition-all reveal reveal-pop" style={{ transitionDelay: `${100 + i * 90}ms` }}>
                <div className="w-10 h-10 shrink-0 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center">{s.icon}</div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-gray-600 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">Who Becomes a Partner</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-10 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {whoFor.map((w, i) => (
              <div key={w.title} className="reveal reveal-pop" style={{ transitionDelay: `${150 + i * 80}ms` }}>
                <div className="w-14 h-14 mx-auto mb-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center">{w.icon}</div>
                <h3 className="font-semibold mb-1">{w.title}</h3>
                <p className="text-gray-600 text-sm">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interest form — anyone can apply to become a partner */}
      <section id="apply" className="py-16 px-4 bg-gray-50 scroll-mt-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-2">Become a Partner</h2>
            <div className="w-12 h-1 bg-orange-500 rounded-full mb-6" />
            <p className="text-gray-600 mb-6 leading-relaxed">
              Fill in the form and our partnership team will review your institute. Once approved you receive
              your Partner ID and portal credentials, and you can start registering students straight away.
            </p>
            <ul className="space-y-3">
              {[
                'Reviewed within one business day',
                'A dedicated Partner ID stamped on every registration',
                'Dashboard, payments and documents scoped to your own students',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal reveal-pop" style={{ transitionDelay: '120ms' }}>
            <PartnerInterestForm />
          </div>
        </div>
      </section>

      {/* Attribution & commissions */}
      <section className="pb-16 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-3xl p-8 md:p-12 reveal reveal-pop">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center mb-4">
                <Link2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Permanent Attribution</h2>
              <p className="text-gray-600 leading-relaxed">Every registration carries a reference like <span className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">IQ-REG-2026-000128</span> and stays linked to your Partner ID forever — even when the student later uses their own account. That single rule powers access control, analytics and reporting.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Commission-Ready Structure</h2>
              <p className="text-gray-600 leading-relaxed">Your Partner ID is the single source of truth for reporting and revenue share. Payouts can be structured per registration, as a percentage of fees, or tiered by performance — the attribution layer already supports it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-2 text-center reveal reveal-pop">Frequently Asked Questions</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-10 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={f.q} className="group bg-white border border-gray-200 rounded-xl overflow-hidden reveal reveal-pop" style={{ transitionDelay: `${100 + i * 60}ms` }}>
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer font-semibold text-sm select-none list-none [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown size={16} className="text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-4 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white text-center rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="relative py-16 px-8 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Ready to Onboard Your Institute?</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Tell us about your institute and we will set up your Partner ID and portal access.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#apply" className={ctaPrimaryClass}>Get Your Partner ID</a>
              <Link to="/programs" className={ctaSecondaryDarkClass}>Browse Programs</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
