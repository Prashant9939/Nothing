import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, SearchX, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';
import { studentApi } from '../../api';
import type { Internship } from '../../api';
import { PageLoader, EmptyState, Button } from '../../components/ui';
import InternshipCard from '../../components/InternshipCard';

export default function SelectTrack() {
  const { user } = useAuth();
  const popup = usePopup();
  const navigate = useNavigate();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    studentApi.getInternships()
      .then((res) => { setInternships(res.data.internships); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  // While the selection overlay is open: close on Esc, lock background scroll
  useEffect(() => {
    if (selected == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  const handleEnroll = async () => {
    if (!selected) return;
    setEnrolling(true);
    try {
      const res = await studentApi.enroll(selected);
      navigate(`/student/pay/${res.data.payment.id}`);
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Enrollment failed. Please try again.', 'Enrollment Failed');
      setEnrolling(false);
    }
  };

  const categories = [
    { key: 'all', label: 'All Programs' },
    { key: 'web', label: 'Web Development' },
    { key: 'python', label: 'Python' },
    { key: 'data', label: 'Data Science' },
    { key: 'ai', label: 'AI/ML' },
    { key: 'cyber', label: 'Cybersecurity' },
    { key: 'skill', label: 'Skill Development' },
    { key: 'teaching', label: 'Teacher Training' },
    { key: 'hr', label: 'Human Resource' },
    { key: 'entrepreneurship', label: 'Entrepreneurship' },
    { key: 'tourism', label: 'Tourism & Hospitality' },
  ];

  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? internships : internships.filter(i => i.category === filter);
  const selectedInternship = internships.find((i) => i.id === selected) || null;

  if (loading) return <PageLoader label="Loading programs..." />;

  if (loadError) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome, {user?.firstName}!</h1>
          <p className="text-slate-500 text-sm">Select an internship track to begin your journey</p>
        </div>
        <EmptyState
          tone="error"
          icon={<AlertTriangle size={22} />}
          title="Couldn't load programs"
          description="Something went wrong while fetching available tracks. Check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome, {user?.firstName}!</h1>
        <p className="text-slate-500 text-sm">Select an internship track to begin your journey</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Filter programs by category">
        {categories.map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={filter === c.key}
            onClick={() => setFilter(c.key)}
            className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              filter === c.key ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="No programs in this category"
          description="Try a different category to find a track that fits you."
          action={<Button variant="secondary" onClick={() => setFilter('all')}>Show All Programs</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <InternshipCard
              key={i.id}
              internship={i}
              variant="select"
              selected={selected === i.id}
              onSelect={() => setSelected(i.id)}
            />
          ))}
        </div>
      )}

      {selectedInternship && !selectedInternship.isEnrolled && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm program selection"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-white/40 bg-white/70 p-8 text-center shadow-2xl backdrop-blur-xl animate-fade-in"
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
            >
              <X size={16} />
            </button>
            <span className="inline-block rounded-full border border-slate-200/80 bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">Selected Program</span>
            <h2 className="mt-4 text-xl font-bold text-slate-900">{selectedInternship.title}</h2>
            <p className="mt-3 text-3xl font-bold text-slate-900">₹{selectedInternship.price.toLocaleString()}</p>
            <Button className="mt-6 w-full" loading={enrolling} onClick={handleEnroll}>
              {enrolling ? 'Enrolling...' : 'Proceed to Payment'}
            </Button>
            <button
              onClick={() => setSelected(null)}
              className="mt-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Choose another track
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
