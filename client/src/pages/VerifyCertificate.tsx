import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, Download, FileSignature, FileText, Globe, MessageSquare, Search, ShieldCheck, XCircle } from 'lucide-react';
import { authApi } from '../api';

interface CertResult {
  type?: 'certificate' | 'receipt' | 'offer-letter' | 'project-report' | 'attendance';
  id: string;
  name: string;
  college: string;
  course: string;
  program: string;
  duration: number;
  grade: string | null;
  score: number | null;
  amount?: number;
  issuedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  certificate: 'Certificate',
  receipt: 'Receipt',
  'offer-letter': 'Offer Letter',
  'project-report': 'Project Report',
  attendance: 'Attendance Record',
};

const parseUtcDate = (value: string) => (
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? new Date(`${value.replace(' ', 'T')}Z`)
    : new Date(value)
);

const formatDate = (value: string) => {
  const d = parseUtcDate(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function VerifyCertificate() {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const normalize = (value: string) => value.toUpperCase().replace(/\s+/g, '');

  const verifyId = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await authApi.verifyCertificate(id);
      setResult(res.data.certificate as CertResult);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Certificate not found. Please check the ID and try again.');
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyId(normalize(certId));
  };

  // Prefill + auto-verify when opened via QR code (?id=CERTIFICATE-ID)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const id = normalize(searchParams.get('id') || '');
    if (id) {
      setCertId(id);
      verifyId(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setCertId('');
    setResult(null);
    setError('');
    inputRef.current?.focus();
  };

  const steps = [
    { num: 1, title: 'Enter Certificate ID', desc: 'Locate the unique certificate ID printed on your certificate document.' },
    { num: 2, title: 'Click Verify', desc: 'Our system will instantly validate the certificate against our secure database.' },
    { num: 3, title: 'View Details', desc: 'See the complete certificate details including grades, scores, and issuance date.' },
  ];

  const heroStats = [
    { number: '24K+', label: 'Certificates Issued' },
    { number: '48+', label: 'Partner Institutions' },
    { number: 'Easy', label: 'Verification' },
    { number: '24/7', label: 'Always Accessible' },
  ];

  const features = [
    { icon: <ShieldCheck className="w-8 h-8 text-orange-500" />, title: 'Instant Verification', desc: 'Get real-time validation results in seconds, not days.' },
    { icon: <Search className="w-8 h-8 text-orange-500" />, title: 'Tamper-Proof Records', desc: 'All certificate data is securely stored and cannot be altered.' },
    { icon: <BarChart3 className="w-8 h-8 text-orange-500" />, title: 'Complete Details', desc: 'View grades, scores, program info, and issuance details.' },
    { icon: <Globe className="w-8 h-8 text-orange-500" />, title: 'Public Access', desc: 'Anyone can verify - employers, colleges, and recruiters.' },
  ];

  const downloadableForms = [
    { icon: <FileSignature className="w-8 h-8 text-orange-500" />, title: 'Consent Form', desc: 'Permission for processing your details and online verification of your credentials.', file: 'consent' },
    { icon: <MessageSquare className="w-8 h-8 text-orange-500" />, title: 'Feedback Form', desc: 'Share your experience of the internship program and suggest improvements.', file: 'feedback' },
    { icon: <FileText className="w-8 h-8 text-orange-500" />, title: 'Internship Undertaking', desc: 'Self-declaration of honesty and adherence to the program code of conduct.', file: 'undertaking' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark to-dark-light text-white -mt-24 flex flex-col justify-center px-4 pt-40 pb-24 min-h-[26rem] md:min-h-[30rem]">
        <div className="max-w-4xl mx-auto text-center w-full">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(249,115,22,0.35)]">
            <Search className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-blue-300 font-medium mb-4 uppercase tracking-wider">Certificate Verification</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Verify<br />
            <span className="text-blue-400">Authenticity Instantly</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Enter a certificate ID to verify its authenticity and view complete details. Trusted by employers, colleges, and recruiters worldwide.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto pt-8 border-t border-white/10">
            {heroStats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white">{s.number}</div>
                <div className="text-sm text-blue-100 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Form */}
      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleVerify} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <label htmlFor="cert-id" className="block text-sm font-medium text-gray-700 mb-2">Certificate ID</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="cert-id"
                ref={inputRef}
                type="text"
                value={certId}
                onChange={(e) => {
                  setCertId(normalize(e.target.value));
                  setError('');
                  setResult(null);
                }}
                placeholder="e.g. IQI-2026-123456"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!error}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono tracking-wide uppercase"
              />
              <button
                type="submit"
                disabled={loading || !certId.trim()}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Certificate: IQI-YYYY-NNNNNN · Receipt: IQI-REC-YYYY-NNNNNN · Offer/Report/Attendance: IQI-OL/PR/ATT-YYYY-NNNNNN</p>
          </form>

          {/* Error */}
          {error && (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mt-6">
                <div className="mb-3 flex justify-center"><XCircle className="w-10 h-10 text-red-500" /></div>
              <h3 className="text-lg font-bold text-red-700 mb-1">Invalid Certificate</h3>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={reset}
                className="mt-4 px-5 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
              >
                Try another ID
              </button>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div role="status" aria-live="polite" className="bg-white border-2 border-green-200 rounded-xl overflow-hidden shadow-sm mt-6">
              <div className="bg-green-500 text-white text-center py-4">
                <div className="text-3xl mb-1"><CheckCircle2 className="w-8 h-8 text-white mx-auto" /></div>
                <h3 className="text-lg font-bold">{TYPE_LABELS[result.type || 'certificate']} Verified</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center border-b border-gray-100 pb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Issued To</p>
                  <p className="text-2xl font-bold text-gray-800">{result.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {result.course}{result.college ? ` · ${result.college}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{result.type === 'certificate' ? 'Certificate ID' : 'Document ID'}</p>
                    <p className="font-mono font-bold text-sm break-all">{result.id}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Program</p>
                    <p className="font-semibold text-sm">{result.program}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">College</p>
                    <p className="text-sm">{result.college || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <p className="text-sm">{result.duration} Days</p>
                  </div>
                  {result.grade != null && (
                    <div className="bg-orange-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-orange-600 mb-1">Grade</p>
                      <p className="text-2xl font-bold text-orange-600">{result.grade}</p>
                    </div>
                  )}
                  {result.score != null && (
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-green-600 mb-1">Score</p>
                      <p className="text-2xl font-bold text-green-600">{result.score}%</p>
                    </div>
                  )}
                  {result.amount != null && (
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-green-600 mb-1">Amount Paid</p>
                      <p className="text-2xl font-bold text-green-600">₹{Number(result.amount).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 text-center text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span>Issued on {formatDate(result.issuedAt)}</span>
                  <button
                    onClick={reset}
                    className="text-orange-600 font-semibold hover:text-orange-700"
                  >
                    Verify another →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          {!result && !error && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center mt-6">
              <p className="text-gray-600 text-sm">Enter the ID printed on your certificate, receipt, offer letter, report or attendance sheet to verify it.</p>
              <p className="mt-2 text-xs text-gray-400">Or simply scan the QR code on the document</p>
            </div>
          )}
        </div>
      </section>

      {/* Downloadable Forms */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Downloadable Forms</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Download commonly used forms, fill them in and submit them as required — no login needed.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {downloadableForms.map((f) => (
              <div key={f.file} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm mb-5 flex-1">{f.desc}</p>
                <a
                  href={`/api/forms/${f.file}`}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Download size={16} /> Download PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How Verification Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Our simple 3-step process makes certificate verification fast and reliable.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">{step.num}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Trust Our Verification</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Our verification system is built on secure, tamper-proof technology trusted by institutions worldwide.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white text-center rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/10 animate-float relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="relative py-16 px-8">
            <h2 className="text-3xl font-bold mb-4">Need a Certificate?</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Enroll in our professional training programs, complete assessments, and earn verified certifications recognized by employers.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/programs" className="px-8 py-3 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors">Explore Programs</Link>
              <Link to="/contact" className="px-8 py-3 border border-white/30 font-semibold rounded-lg hover:bg-white/10 transition-colors">Contact Advisors</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
