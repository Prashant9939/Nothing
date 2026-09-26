import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { AnalyticsResponse } from '../../api';
import TrafficChart from '../../components/admin/TrafficChart';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { EyeIcon, MousePointerClickIcon, GlobeIcon, TrendingUpIcon, UserPlusIcon, DollarSignIcon, ClipboardIcon } from "@animateicons/react/lucide";

type Range = '1d' | '7d' | '30d';

const RANGES: { id: Range; label: string }[] = [
  { id: '1d', label: '1 Day' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '1 Month' },
];

const rangeCopy: Record<Range, string> = {
  '1d': 'Hourly traffic over the last 24 hours',
  '7d': 'Daily traffic over the last 7 days',
  '30d': 'Daily traffic over the last 30 days',
};

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return <span className="text-[11px] text-slate-400">—</span>;
  if (prev === 0) return <span className="text-[11px] font-semibold text-emerald-600">new</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(pct)}%
    </span>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<Range>('7d');
  const [attempt, setAttempt] = useState(0);
  const [payload, setPayload] = useState<{ key: string; data: AnalyticsResponse } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `${range}:${attempt}`;
    adminApi.getAnalytics(range)
      .then((res) => { if (!cancelled) setPayload({ key, data: res.data }); })
      .catch(() => { if (!cancelled) setFailedKey(key); });
    return () => { cancelled = true; };
  }, [range, attempt]);

  const key = `${range}:${attempt}`;
  const loading = payload?.key !== key && failedKey !== key;
  const error = failedKey === key;
  const data = payload?.key === key ? payload.data : null;
  const retry = () => { setFailedKey(null); setAttempt((a) => a + 1); };

  const summary = data?.summary;
  const previous = data?.previous;
  const series = data?.series || [];
  const topPages = data?.topPages || [];

  const kpis = summary && previous ? [
    { label: 'Visitors', value: summary.visitors.toLocaleString(), cur: summary.visitors, prev: previous.visitors, icon: <EyeIcon size={18} />, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Clicks', value: summary.clicks.toLocaleString(), cur: summary.clicks, prev: previous.clicks, icon: <MousePointerClickIcon size={18} />, color: 'text-indigo-700 bg-indigo-50' },
    { label: 'Page Views', value: summary.pageviews.toLocaleString(), cur: summary.pageviews, prev: previous.pageviews, icon: <GlobeIcon size={18} />, color: 'text-blue-700 bg-blue-50' },
    { label: 'Clicks / Visitor', value: summary.avgClicks.toFixed(1), cur: summary.avgClicks, prev: previous.avgClicks, icon: <TrendingUpIcon size={18} />, color: 'text-slate-700 bg-slate-100' },
    { label: 'New Signups', value: summary.signups.toLocaleString(), cur: summary.signups, prev: previous.signups, icon: <UserPlusIcon size={18} />, color: 'text-amber-700 bg-amber-50' },
    { label: 'Revenue', value: `₹${summary.revenue.toLocaleString()}`, cur: summary.revenue, prev: previous.revenue, icon: <DollarSignIcon size={18} />, color: 'text-emerald-700 bg-emerald-50' },
  ] : [];

  const maxViews = Math.max(...topPages.map((p) => p.views), 1);
  const maxRev = Math.max(...series.map((s) => s.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header banner + range filter — 3D dark */}
      <div className="bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a2332] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/3 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/3 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-medium mb-1">Admin Panel</p>
            <h1 className="text-xl sm:text-2xl font-bold drop-shadow-lg">Site Analytics</h1>
            <p className="text-white/50 text-sm mt-1">{rangeCopy[range]}</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-white/8 border border-white/10 rounded-xl backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  range === r.id
                    ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-medium text-gray-900">Could not load analytics</p>
          <p className="text-xs text-gray-500 mt-1">Something went wrong while fetching the report.</p>
          <button
            onClick={retry}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {data && summary && previous && !loading && !error && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}>{s.icon}</div>
                  <Delta cur={s.cur} prev={s.prev} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Main traffic chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Traffic Overview</h3>
                <p className="text-xs text-gray-400 mt-0.5">{rangeCopy[range]} · compared with the previous period</p>
              </div>
            </div>
            <TrafficChart data={series} hourly={data.hourly} />
          </div>

          {/* Top pages + conversions */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Top Pages</h3>
                <span className="text-xs text-gray-400">{topPages.length} pages</span>
              </div>
              <div className="px-5 py-2 divide-y divide-gray-50">
                {topPages.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">No page views recorded in this period.</p>
                )}
                {topPages.map((p) => (
                  <div key={p.path} className="py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-xs font-mono text-slate-600 truncate max-w-[55%]">{p.path}</span>
                      <span className="text-[11px] text-gray-400 shrink-0">{p.views} views · {p.clicks} clicks</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max((p.views / maxViews) * 100, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Conversions</h3>
                <span className="text-xs text-gray-400">{RANGES.find((r) => r.id === range)?.label}</span>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-lg font-bold text-gray-900">{summary.signups}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Signups</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-lg font-bold text-gray-900">{summary.enrollments}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Enrollments</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <div className="text-lg font-bold text-emerald-700">₹{summary.revenue.toLocaleString()}</div>
                    <div className="text-[11px] text-emerald-700/70 mt-0.5">Revenue</div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <ClipboardIcon size={13} /> Revenue trend
                  </p>
                  <div className="flex items-end gap-[3px] h-24">
                    {series.map((s) => (
                      <div
                        key={s.bucket}
                        title={`${s.bucket}: ₹${s.revenue.toLocaleString()}`}
                        className={`flex-1 rounded-t-sm transition-all duration-500 ${s.revenue > 0 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-slate-100'}`}
                        style={{ height: `${s.revenue > 0 ? Math.max((s.revenue / maxRev) * 100, 6) : 3}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                    <span>{data.hourly ? series[0]?.bucket.slice(11, 16) : series[0]?.bucket}</span>
                    <span>{data.hourly ? 'now' : 'today'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
