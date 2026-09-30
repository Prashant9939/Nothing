import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { BarChart3, BookOpen, Check, ClipboardList, Globe, GraduationCap, Search, ShieldCheck, Timer, X } from 'lucide-react';

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);

  const stats = [
    { number: '24,000+', label: 'Alumni Certified' },
    { number: '48+', label: 'University Partners' },
    { number: '25+', label: 'Training Tracks' },
    { number: '94.2%', label: 'Average Placement Rate' },
  ];

  const phases = [
    { number: 'Phase 1', title: 'Easy Registration', desc: 'Establish your profile stream and verify credentials in under 2 minutes.' },
    { number: 'Phase 2', title: 'Secure Payment', desc: 'Pay securely via RazorPay with multiple payment options and instant confirmation.' },
    { number: 'Phase 3', title: 'Structured Curriculum Study', desc: '120 Hours of structured curriculum study through integrated gateway payment structures.' },
    { number: 'Phase 4', title: 'Hands-on Project Builds', desc: 'Dive into rigorous training modules, framework templates, and benchmark modules.' },
    { number: 'Phase 5', title: 'Secure Timed Evaluations', desc: 'Take standard timed MCQ assessments protected by tab-switching check algorithms.' },
    { number: 'Phase 6', title: 'Instant Certification', desc: 'Pass with 40% or higher to generate secure, verifiable PDF certificates instantly.' },
  ];

  const features = [
    { icon: <GraduationCap className="w-8 h-8 text-orange-500" />, title: 'UGC-aligned Certificate', desc: 'Recognized certification aligned with University Grants Commission standards.' },
    { icon: <Timer className="w-8 h-8 text-orange-500" />, title: 'Flexible Duration', desc: 'Choose from flexible duration options that fit your schedule.' },
    { icon: <BookOpen className="w-8 h-8 text-orange-500" />, title: '10+ Subjects Curriculum', desc: 'Wide range of subjects with comprehensive curriculum.' },
    { icon: <Globe className="w-8 h-8 text-orange-500" />, title: 'Anywhere Access', desc: 'Access learning materials from anywhere, anytime.' },
  ];

  const conventional = [
    'Theory-heavy lessons without strict project code requirements.',
    'Zero validation testing — certificates sent for purely watching video lists.',
    'Assessments are simple, non-proctored, and vulnerable to plagiarised submissions.',
    'Generic files without details on grades, project structures, or scores.',
    'Requires manual verification emails causing long onboarding placement delays.',
  ];

  const iqintern = [
    'Mandatory hands-on projects showing actual functional deployments.',
    'Curriculum designed on practical parameters vetted by tech leaders.',
    'Secure timed evaluations utilizing protection controls against tab-switching.',
    'Immutable online certificates verified instantly via ID lookup databases.',
    'Comprehensive performance scorecards displaying detailed grading metrics.',
  ];

  const verification = [
    { icon: <ShieldCheck className="w-8 h-8 text-orange-500" />, title: 'Proctored Assessment Protections', desc: 'Secure timed evaluations utilizing protection controls against tab-switching.' },
    { icon: <Search className="w-8 h-8 text-orange-500" />, title: 'Live Verification Lookup Portals', desc: 'Public certificate verification portal for colleges, recruiters, and employers.' },
    { icon: <BarChart3 className="w-8 h-8 text-orange-500" />, title: 'Deep Grade Analytics Breakdown', desc: 'Comprehensive performance scorecards displaying detailed grading metrics.' },
    { icon: <ClipboardList className="w-8 h-8 text-orange-500" />, title: 'Structured Practical Blueprints', desc: 'Mandatory hands-on projects showing actual functional deployments.' },
  ];

  const unlock = [
    { num: 1, title: 'Internship Offer Letter', desc: 'Instant generation after enrollment with premium digital verification.' },
    { num: 2, title: 'Industry-Aligned Training', desc: 'Learn through structured internship programs designed for real-world skills.' },
    { num: 3, title: 'AI-Based Skill Assessment', desc: 'Get evaluated through automated assessments and detailed performance reports.' },
    { num: 4, title: 'Premium Certification', desc: 'Verifiable certificates with QR codes and unique certificate IDs.' },
    { num: 5, title: 'Internship Documentation', desc: 'Attendance sheet, marksheet, internship report, and completion documents.' },
    { num: 6, title: 'Lifetime Certificate Verification', desc: 'Public certificate verification portal for colleges, recruiters, and employers.' },
  ];

  const transformations = [
    {
      name: 'Priya Patel',
      role: 'Software Engineering',
      before: 'A computer science student applying with generic course certificates. Her resume was continuously filtered out by automated screening bots.',
      after: 'Completed the Web Development Pathway, scored 85% on evaluations, and shared her verified dashboard link. Secured an engineering role in 3 weeks.',
    },
    {
      name: 'Kunal Verma',
      role: 'Python Development',
      before: 'A mechanical engineer looking to switch fields. Had theoretical knowledge but lacked verifiable proof of actual coding skills.',
      after: 'Completed the Python Software Engineering track, passed all builds, and sent his scorecard directly to recruiters. Hired as a Backend Dev in 18 days.',
    },
  ];

  const reviews = [
    {
      text: 'The curriculum blueprints were incredibly thorough. Completing the projects and passing the tab-protected timed evaluations gave me a verified scorecard that got my application approved without delay.',
      name: 'Priya Patel',
      role: 'Software Engineer',
      status: 'Verified Alumna',
    },
    {
      text: 'Monitoring candidate learning assessments has never been simpler. The proctored scoring dashboards protect our compliance logs while giving placements team clear, verifiable details of student competence.',
      name: 'Prof. Rajesh Kumar',
      role: 'Placement Hub Coordinator',
      status: 'Verified Coordinator',
    },
    {
      text: 'Credential fraud is a primary concern in volume sourcing. Scannable verification dashboard links solve verification delays instantly. Excellent standard that details score outcomes.',
      name: 'Meera Sen',
      role: 'Director, Talent Acquisition',
      status: 'Verified Partner',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark to-dark-light text-white py-20 px-4 -mt-24 pt-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-blue-300 font-medium mb-4 uppercase tracking-wider">Professional Training & Evaluation Hub</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Acquire Verified Skills.<br />
            <span className="text-blue-400">Accelerate Your Career.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Ditch basic attendance certificates. Enroll in industry-aligned professional training paths, validate your domain skills through timed assessments, and build verifiable credentials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/register" className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors">
              Explore Programs
            </Link>
            <Link to="/contact" className="px-8 py-3 border border-gray-600 text-white font-semibold rounded-lg hover:border-white transition-colors">
              Speak With Advisor
            </Link>
          </div>
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.number}</div>
                <div className="text-sm text-blue-100 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">The Professional Training Journey</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Follow our step-by-step vocational pipeline to qualify, validate your skills, and earn your verified credentials.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {phases.map((phase, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="inline-block bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">{phase.number}</span>
                <h3 className="text-lg font-semibold mb-2">{phase.title}</h3>
                <p className="text-gray-600 text-sm">{phase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Start Your Internship Journey Today</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {features.map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 justify-center">
            <Link to="/register" className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors">Register Now</Link>
            <Link to="/register" className="px-6 py-3 border border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-colors">View Membership Plans</Link>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Verified Learning Outcomes</h2>
            <p className="text-gray-600">Compare conventional course certificates with IQIntern's metric-driven skill verification values.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border-l-4 border-red-500 rounded-xl p-6 reveal reveal-pop">
              <h3 className="text-lg font-semibold mb-4">Conventional Course Attendance</h3>
              <ul className="space-y-3">
                {conventional.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-red-600">
                    <X size={15} className="shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border-l-4 border-green-500 rounded-xl p-6 reveal reveal-pop" style={{ transitionDelay: '120ms' }}>
              <h3 className="text-lg font-semibold mb-4">The IQIntern Evaluation Standard</h3>
              <ul className="space-y-3">
                {iqintern.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-green-600">
                    <Check size={15} className="shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Why Professional Verification is Essential</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Generic training listings fail to convince modern recruiters. IQIntern shifts the placement search by delivering proctored, metric-driven verification scores.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {verification.map((v, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="font-semibold mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unlock */}
      <section className="py-20 px-4 bg-dark text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Everything You'll Unlock at IQIntern</h2>
            <p className="text-gray-400">Build industry-ready skills, complete assessments, and receive professionally generated internship documents.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {unlock.map((u, i) => (
              <div key={i} className="bg-dark-light border border-white/10 rounded-xl p-6 hover:border-orange-500 transition-colors reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold mb-4">{u.num}</div>
                <h3 className="font-semibold mb-2">{u.title}</h3>
                <p className="text-gray-400 text-sm">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transformations */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Student Career Transformations</h2>
            <p className="text-gray-600">Real cases showing candidate placement acceleration before and after completing their evaluations.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {transformations.map((t, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 reveal reveal-pop" style={{ transitionDelay: `${i * 120}ms` }}>
                <h3 className="text-xl font-bold">{t.name}</h3>
                <p className="text-orange-500 text-sm mb-4">{t.role}</p>
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Struggle / Before</span>
                  <p className="text-gray-600 text-sm mt-1">{t.before}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-green-600 uppercase">Placement / After</span>
                  <p className="text-gray-600 text-sm mt-1">{t.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Trusted by Candidates & Administrators</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow reveal reveal-pop" style={{ transitionDelay: `${i * 100}ms` }}>
                <p className="text-gray-600 text-sm italic mb-4">"{r.text}"</p>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-gray-500">{r.role}</p>
                <p className="text-sm text-green-600 mt-1 inline-flex items-center gap-1"><Check size={14} /> {r.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white text-center rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/10 animate-float relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="relative py-16 px-8 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Accelerate Your Technical Readiness</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Join IQIntern today, attempt proctored evaluations, and download verified performance credentials to accelerate your corporate recruitment journey.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-3 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors">Create Account</Link>
              <Link to="/contact" className="px-8 py-3 border border-white/30 font-semibold rounded-lg hover:bg-white/10 transition-colors">Contact Advisors</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
