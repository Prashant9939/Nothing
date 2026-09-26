import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../api';
import type { Enrollment, Payment, Exam, Certificate } from '../../api';
import { RocketIcon, BookOpenIcon, ClipboardIcon, StarIcon, ArrowRightIcon, TrendingUpIcon, ClockIcon } from "@animateicons/react/lucide";
import { PageLoader, EmptyState, Button, Card } from '../../components/ui';
import { categoryImages } from '../../categories';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getDashboard().then((res) => {
      setEnrollments(res.data.enrollments);
      setPayments(res.data.payments);
      setExams(res.data.exams);
      setCertificates(res.data.certificates);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader label="Loading your dashboard..." />;

  if (loadError) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangle size={22} />}
        title="Couldn't load your dashboard"
        description="Something went wrong while fetching your data. Check your connection and try again."
        action={<Button onClick={load}>Retry</Button>}
      />
    );
  }

  const hasAnyEnrollment = enrollments.length > 0;
  const activeEnrollment = enrollments.find(e => e.status === 'active');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');

  if (!hasAnyEnrollment) {
    return (
      <div className="space-y-6">
        {/* Empty state - 3D hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-lift sm:p-10">
          <div className="absolute top-0 right-0 h-80 w-80 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-60 w-60 -translate-x-1/4 translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
              <span className="text-xs font-medium">Welcome to IQIntern</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold drop-shadow-lg sm:text-3xl">Start Your Learning Journey</h1>
            <p className="mb-6 max-w-lg text-sm text-white/60 sm:text-base">Choose from our industry-relevant internship programs and kickstart your career with hands-on experience.</p>
            <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-soft transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
              Explore Programs <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>

        {/* Features - 3D cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: <RocketIcon size={20} />, title: 'Industry Projects', desc: 'Work on real-world projects', color: 'text-slate-700 bg-slate-100' },
            { icon: <BookOpenIcon size={20} />, title: 'Structured Learning', desc: 'Step-by-step modules', color: 'text-emerald-700 bg-emerald-50' },
            { icon: <StarIcon size={20} />, title: 'Certified', desc: 'Get certified on completion', color: 'text-slate-700 bg-slate-100' },
          ].map((f, i) => (
            <Card key={i} hover className="p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>{f.icon}</div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="text-xs text-slate-500">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Enrolled', value: enrollments.length, icon: <RocketIcon size={18} />, color: 'text-slate-700 bg-slate-100' },
    { label: 'In Progress', value: enrollments.filter(e => e.status === 'active').length, icon: <TrendingUpIcon size={18} />, color: 'text-slate-700 bg-slate-100' },
    { label: 'Completed', value: completedEnrollments.length, icon: <ClipboardIcon size={18} />, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Certificates', value: certificates.length, icon: <StarIcon size={18} />, color: 'text-emerald-700 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner - 3D dark */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lift sm:p-8">
        <div className="absolute top-0 right-0 h-80 w-80 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-60 w-60 -translate-x-1/4 translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-xs font-medium text-white/50">Welcome back</p>
            <h1 className="text-xl font-bold drop-shadow-lg sm:text-2xl">{user?.firstName} {user?.lastName}</h1>
            <p className="mt-1 text-sm text-white/50">
              {activeEnrollment
                ? `Currently learning: ${activeEnrollment.internshipTitle}`
                : completedEnrollments.length > 0
                  ? 'All programs completed!'
                  : 'Ready to continue learning?'}
            </p>
          </div>
          {activeEnrollment && (
            <Link to="/student/learning" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
              Continue Learning <ArrowRightIcon size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Stats Row - 3D cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={i} hover className="p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>{s.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Active Program + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {activeEnrollment ? (
            <ActiveCard enrollment={activeEnrollment} payments={payments} exams={exams} certificates={certificates} />
          ) : completedEnrollments.length > 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-center shadow-soft">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <StarIcon size={24} />
              </div>
              <h3 className="mb-1 font-bold text-slate-900">All Caught Up!</h3>
              <p className="mb-4 text-sm text-slate-500">You've completed all enrolled programs. Enroll in a new one!</p>
              <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                Browse Programs <ArrowRightIcon size={14} />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <RocketIcon size={24} />
              </div>
              <h3 className="mb-1 font-bold text-slate-900">Ready for Your Next Step?</h3>
              <p className="mb-4 text-sm text-slate-500">Pick a track to start learning and working toward your certificate.</p>
              <Link to="/student/select-track" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                Select a Track <ArrowRightIcon size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { to: '/student/documents', icon: <BookOpenIcon size={16} />, label: 'View Documents', color: 'text-slate-700 bg-slate-100' },
              { to: '/student/exam-page', icon: <ClipboardIcon size={16} />, label: 'Take Exam', color: 'text-emerald-700 bg-emerald-50' },
              { to: '/student/edit-profile', icon: <TrendingUpIcon size={16} />, label: 'Edit Profile', color: 'text-slate-700 bg-slate-100' },
              { to: '/student/select-track', icon: <RocketIcon size={16} />, label: 'New Program', color: 'text-emerald-700 bg-emerald-50' },
            ].map((a, i) => (
              <Link key={i} to={a.to} className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-slate-50">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.color}`}>{a.icon}</div>
                <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-slate-900">{a.label}</span>
                <ArrowRightIcon size={14} className="text-slate-300 transition-colors group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Completed Programs */}
      {completedEnrollments.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Completed Programs</h2>
            <span className="text-xs text-slate-400">{completedEnrollments.length} total</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedEnrollments.map(enrollment => {
              const payment = payments.find(p => p.enrollmentId === enrollment.id);
              const exam = exams.find(e => e.enrollmentId === enrollment.id);
              const cert = certificates.find(c => c.enrollmentId === enrollment.id);
              return (
                <div key={enrollment.id} className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-orange-200/80 hover:shadow-lift">
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-5 py-4 text-white">
                    <img
                      src={categoryImages.default}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
                    <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-orange-500/20 blur-3xl transition-all duration-500 group-hover:bg-orange-500/35" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm">
                          <StarIcon size={15} />
                        </span>
                        <h4 className="truncate text-sm font-semibold">{enrollment.internshipTitle}</h4>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                        Done
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 p-5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Payment</span>
                      <span className={payment?.status === 'completed' ? 'font-medium text-emerald-700' : 'text-slate-800'}>
                        {payment?.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Exam Score</span>
                      <span className={exam?.score != null ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                        {exam?.score != null ? `${exam.score}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Grade</span>
                      <span className="font-bold text-slate-800">{cert?.grade || '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveCard({ enrollment, payments, exams, certificates }: { enrollment: Enrollment; payments: Payment[]; exams: Exam[]; certificates: Certificate[] }) {
  const payment = payments.find(p => p.enrollmentId === enrollment.id);
  const exam = exams.find(e => e.enrollmentId === enrollment.id);
  const cert = certificates.find(c => c.enrollmentId === enrollment.id);
  const topics = enrollment.topics?.split(',') || [];
  const progress = enrollment.progress || 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-shadow duration-300 hover:shadow-lift">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white">
        <img
          src={categoryImages.default}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <BookOpenIcon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{enrollment.internshipTitle}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-white/60">
                <ClockIcon size={12} /> {topics.length} modules
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-blue-400/30 bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-200">
            Active
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Progress */}
        <div className="mb-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-500">Progress</span>
            <span className="font-semibold text-slate-900">{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Status Row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Payment', done: payment?.status === 'completed', text: payment?.status === 'completed' ? 'Paid' : 'Pending' },
            { label: 'Exam', done: exam?.status === 'completed', text: exam?.score != null ? `${exam.score}%` : 'Pending' },
            { label: 'Certificate', done: !!cert, text: cert?.grade || 'Pending' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border p-3 text-center ${s.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`text-sm font-semibold ${s.done ? 'text-emerald-700' : 'text-slate-500'}`}>{s.text}</div>
              <div className="mt-0.5 text-[10px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link to="/student/learning" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40">
            Continue <ArrowRightIcon size={14} />
          </Link>
          <Link to="/student/documents" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
