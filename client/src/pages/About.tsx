import { Link } from 'react-router-dom';
import { Check, Code, Handshake, Headphones, ShieldCheck, TrendingUp, UserCheck } from 'lucide-react';

export default function About() {
  const steps = [
    { num: 1, title: 'Register', desc: 'Create your profile in under 2 minutes with verified academic credentials.' },
    { num: 2, title: 'Choose Program', desc: 'Select from 25+ industry-aligned training tracks across multiple domains.' },
    { num: 3, title: 'Learn & Build', desc: 'Complete structured curriculum with hands-on projects and real-world assignments.' },
    { num: 4, title: 'Get Evaluated', desc: 'Pass proctored timed assessments with tab-switching protection.' },
    { num: 5, title: 'Get Certified', desc: 'Receive verifiable certificates with QR codes and unique IDs instantly.' },
  ];

  const whyUs = [
    { icon: <ShieldCheck className="w-8 h-8 text-orange-500" />, title: 'Verified Credentials', desc: 'Every certificate comes with a unique ID and QR code for instant verification by employers.' },
    { icon: <Code className="w-8 h-8 text-orange-500" />, title: 'Practical Training', desc: 'Learn through building real projects, not just watching videos. Every module requires submission.' },
    { icon: <UserCheck className="w-8 h-8 text-orange-500" />, title: 'Proctored Assessments', desc: 'Secure timed evaluations with tab-switching detection ensure genuine skill validation.' },
    { icon: <TrendingUp className="w-8 h-8 text-orange-500" />, title: 'Detailed Scorecards', desc: 'Get comprehensive performance metrics including grades, project scores, and analytics.' },
    { icon: <Handshake className="w-8 h-8 text-orange-500" />, title: 'University Partners', desc: 'Recognized by 48+ universities and educational institutions across India.' },
    { icon: <Headphones className="w-8 h-8 text-orange-500" />, title: '24/7 Support', desc: 'Our dedicated support team is always available to help with any queries or issues.' },
  ];

  const team = [
    { initials: 'PK', name: 'Prashant Kumar', role: 'Founder & CEO', bio: 'Visionary leader with 5+ years in education technology and skill development.' },
    { initials: 'NS', name: 'Neha Sharma', role: 'Head of Curriculum', bio: 'Expert in designing industry-aligned training programs with practical focus.' },
    { initials: 'RP', name: 'Rajesh Patel', role: 'CTO', bio: 'Technology enthusiast building secure assessment and verification systems.' },
    { initials: 'PS', name: 'Priyanka Singh', role: 'Student Success Lead', bio: 'Dedicated to ensuring every student achieves their career goals.' },
  ];

  return (
    <div>
      <section className="bg-gradient-to-br from-dark to-dark-light text-white -mt-24 flex flex-col justify-center px-4 pt-40 pb-24 min-h-[26rem] md:min-h-[30rem]">
        <div className="max-w-3xl mx-auto text-center w-full">
          <p className="text-sm text-blue-300 font-medium mb-4 uppercase tracking-wider">Who We Are</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About IQIntern</h1>
          <p className="text-gray-400 max-w-xl mx-auto">Redefining internship verification with metric-driven skill validation</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-10 pt-8 border-t border-white/10">
            {['Proctored Assessments', 'QR-Verified Certificates', 'Hands-on Projects', '24/7 Support'].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-sm text-gray-200"
              >
                <Check size={16} className="text-orange-400" />
                {c}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link to="/programs" className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors">Explore Programs</Link>
            <Link to="/contact" className="px-8 py-3 border border-gray-600 text-white font-semibold rounded-lg hover:border-white transition-colors">Speak With Advisor</Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-2">Our Mission</h2>
            <div className="w-12 h-1 bg-orange-500 rounded-full mb-6" />
            <p className="text-gray-600 mb-4 leading-relaxed">IQIntern was built to solve a critical problem in India's hiring ecosystem — the lack of verifiable, skill-based internship credentials. Traditional internship certificates are often unreliable, non-standardized, and impossible to verify at scale.</p>
            <p className="text-gray-600 leading-relaxed">We created a platform where students complete structured, industry-aligned training programs, pass rigorous proctored assessments, and receive certificates that recruiters and educational institutions can instantly verify.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { num: '24,000+', label: 'Alumni Certified' },
              { num: '48+', label: 'University Partners' },
              { num: '25+', label: 'Training Tracks' },
              { num: '94.2%', label: 'Placement Rate' },
            ].map((s, i) => (
              <div key={s.label} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all reveal reveal-pop" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="text-2xl font-bold text-orange-500 mb-1">{s.num}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">How IQIntern Works</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-10 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-1 transition-all reveal reveal-pop" style={{ transitionDelay: `${150 + i * 80}ms` }}>
                <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">{s.num}</div>
                <h3 className="font-semibold text-sm mb-2">{s.title}</h3>
                <p className="text-gray-500 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">Why Choose IQIntern</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-10 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {whyUs.map((w, i) => (
              <div key={w.title} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg hover:-translate-y-1 hover:border-orange-200 transition-all reveal reveal-pop" style={{ transitionDelay: `${150 + i * 80}ms` }}>
                <div className="mb-3 flex justify-center">{w.icon}</div>
                <h3 className="font-semibold mb-2">{w.title}</h3>
                <p className="text-gray-600 text-sm">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2 reveal reveal-pop">Our Team</h2>
          <div className="w-12 h-1 bg-orange-500 rounded-full mx-auto mb-4 reveal reveal-pop" style={{ transitionDelay: '100ms' }} />
          <p className="text-gray-500 mb-10 reveal reveal-pop" style={{ transitionDelay: '150ms' }}>Passionate professionals dedicated to transforming internship verification</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((t, i) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all reveal reveal-pop" style={{ transitionDelay: `${200 + i * 90}ms` }}>
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4 shadow-[0_8px_20px_rgba(249,115,22,0.3)]">{t.initials}</div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-orange-500 text-sm font-medium mb-2">{t.role}</p>
                <div className="w-8 h-px bg-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">{t.bio}</p>
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
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Join thousands of students who have accelerated their careers with verified credentials</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-3 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors">Register Now</Link>
              <Link to="/certification" className="px-8 py-3 border border-white/30 font-semibold rounded-lg hover:bg-white/10 transition-colors">Verify</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
