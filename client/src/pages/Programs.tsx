import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FolderOpen, Search, X } from 'lucide-react';
import { authApi } from '../api';
import type { Internship } from '../api';
import InternshipCard from '../components/InternshipCard';
import { categoryIcons, categoryLabels, knownOrder, titleCase } from '../categories';

export default function Programs() {
  const [active, setActive] = useState('all');
  const [query, setQuery] = useState('');
  const [programs, setPrograms] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchPrograms = () => {
    authApi.getInternships()
      .then(res => { setPrograms(res.data.internships); setLoadError(''); })
      .catch(() => setLoadError('Could not load programs. Please check your connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPrograms(); }, []);

  const retry = () => {
    setLoading(true);
    setLoadError('');
    fetchPrograms();
  };

  const categories = useMemo(() => {
    const present = Array.from(new Set(programs.map((p) => p.category).filter(Boolean)));
    const ordered = [
      ...knownOrder.filter((c) => present.includes(c)),
      ...present.filter((c) => !knownOrder.includes(c)).sort(),
    ];
    const countFor = (key: string) => (key === 'all'
      ? programs.length
      : programs.filter((p) => p.category === key).length);
    return [
      { key: 'all', label: 'All Programs', count: countFor('all') },
      ...ordered.map((key) => ({ key, label: categoryLabels[key] || titleCase(key), count: countFor(key) })),
    ];
  }, [programs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((p) => {
      if (active !== 'all' && p.category !== active) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || (p.topics || '').toLowerCase().includes(q);
    });
  }, [programs, active, query]);

  const clearFilters = () => { setActive('all'); setQuery(''); };

  return (
    <div>
      <section className="bg-gradient-to-br from-dark to-dark-light text-white -mt-24 flex flex-col justify-center px-4 pt-40 pb-24 min-h-[26rem] md:min-h-[30rem]">
        <div className="max-w-3xl mx-auto text-center w-full">
          <p className="text-sm text-blue-300 font-medium mb-4 uppercase tracking-wider">Internship Tracks</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Training Programs</h1>
          <p className="text-gray-400 max-w-xl mx-auto">Explore our industry-aligned internship programs designed to build real-world skills</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-10 pt-8 border-t border-white/10">
            {knownOrder.map((key) => {
              const Icon = categoryIcons[key];
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-sm text-gray-200"
                >
                  {Icon && <Icon size={16} />}
                  {categoryLabels[key]}
                </span>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link to="/register" className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors">Enroll Now</Link>
            <Link to="/contact" className="px-8 py-3 border border-gray-600 text-white font-semibold rounded-lg hover:border-white transition-colors">Speak With Advisor</Link>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Search + filters */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto mb-6">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, topic, or skill..."
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActive(f.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                    active === f.key
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-500 hover:text-orange-500'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 text-[11px] ${active === f.key ? 'text-orange-100' : 'text-gray-400'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft animate-pulse">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-6 pt-6 pb-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/10" />
                        <div className="h-3 w-24 rounded bg-white/10" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-white/10" />
                    </div>
                    <div className="mt-4 h-4 w-3/4 rounded bg-white/10" />
                  </div>
                  <div className="p-6">
                    <div className="mb-3 h-3 w-full rounded bg-slate-100" />
                    <div className="mb-5 h-3 w-5/6 rounded bg-slate-100" />
                    <div className="mb-5 h-4 w-2/3 rounded-full bg-slate-100" />
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="h-5 w-20 rounded bg-slate-100" />
                      <div className="h-8 w-28 rounded-xl bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="text-center py-12">
              <div className="mb-3 flex justify-center"><AlertTriangle className="w-10 h-10 text-amber-500" /></div>
              <p className="text-gray-600 mb-4">{loadError}</p>
              <button onClick={retry} className="px-6 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 flex justify-center"><FolderOpen className="w-10 h-10 text-gray-400" /></div>
              <p className="text-gray-600 mb-1 font-medium">No programs found</p>
              <p className="text-sm text-gray-400 mb-4">Try a different search term or category.</p>
              <button onClick={clearFilters} className="px-6 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors">
                Show all programs
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-5">
                Showing {filtered.length} of {programs.length} program{programs.length === 1 ? '' : 's'}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => (
                  <InternshipCard key={p.id} internship={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white text-center rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/10 animate-float relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="relative py-16 px-8 reveal reveal-pop">
            <h2 className="text-3xl font-bold mb-4">Can't find what you're looking for?</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Contact our team for custom internship programs tailored to your needs</p>
            <Link to="/contact" className="px-8 py-3 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
