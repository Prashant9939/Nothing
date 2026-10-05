import { useEffect, useRef, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { AnalyticsBucket } from '../../api';

const H = 300;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return step * pow;
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const formatCompact = (v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v.toLocaleString());

const dayLabel = (bucket: string) => {
  const [, m, d] = bucket.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

export default function TrafficChart({ data, hourly }: { data: AnalyticsBucket[]; hourly: boolean }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const n = data.length;
  const compact = width > 0 && width < 520;
  const pad = { l: compact ? 34 : 46, r: compact ? 34 : 46, t: 18, b: 30 };
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = H - pad.t - pad.b;
  const band = n > 0 ? innerW / n : innerW;
  const x = (i: number) => pad.l + (i + 0.5) * band;

  const leftMax = niceMax(Math.max(...data.map((d) => Math.max(d.visitors, d.pageviews)), 1));
  const rightMax = niceMax(Math.max(...data.map((d) => d.clicks), 1));
  const yLeft = (v: number) => pad.t + innerH - (v / leftMax) * innerH;
  const yRight = (v: number) => pad.t + innerH - (v / rightMax) * innerH;

  const visitors = data.map((d) => d.visitors);
  const clicks = data.map((d) => d.clicks);

  const linePath = (values: number[], yOf: (v: number) => number) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');
  const visitorsLine = linePath(visitors, yLeft);
  const visitorsArea = n > 1
    ? `${visitorsLine} L ${x(n - 1).toFixed(1)} ${pad.t + innerH} L ${x(0).toFixed(1)} ${pad.t + innerH} Z`
    : '';
  const clicksLine = linePath(clicks, yRight);

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = n <= 8 ? (compact ? 2 : 1) : n <= 24 ? 3 : 5;
  const barW = Math.min(30, band * 0.62);

  const isEmpty = data.length === 0 || data.every((d) => d.visitors + d.clicks + d.pageviews === 0);

  const tooltip = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active), 90), Math.max(width - 90, 90)) : 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      {isEmpty ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3"><BarChart3 className="w-6 h-6" /></div>
          <p className="text-sm font-medium text-slate-600">No traffic recorded yet</p>
          <p className="text-xs text-slate-500 mt-1">Visits, page views and clicks will show up here as people browse the site.</p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-1 pb-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500" /> Page views</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded bg-emerald-600" /> Visitors</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded bg-indigo-500" /> Clicks</span>
          </div>

          <svg
            width={width || '100%'}
            height={H}
            viewBox={width ? `0 0 ${width} ${H}` : undefined}
            className="block select-none"
            onMouseLeave={() => setActive(null)}
          >
            <defs>
              <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
              <clipPath id="plotClip">
                <rect x={pad.l} y={pad.t - 6} width={innerW} height={innerH + 6} />
              </clipPath>
            </defs>

            {/* Grid + axis labels */}
            {gridSteps.map((t) => {
              const y = pad.t + innerH - t * innerH;
              return (
                <g key={t}>
                  <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke="#eef2f7" strokeWidth={1} />
                  <text x={pad.l - 7} y={y + 3.5} textAnchor="end" fontSize={10} fill="#94a3b8">
                    {formatCompact(Math.round(leftMax * t))}
                  </text>
                  <text x={width - pad.r + 7} y={y + 3.5} textAnchor="start" fontSize={10} fill="#a5b4fc">
                    {formatCompact(Math.round(rightMax * t))}
                  </text>
                </g>
              );
            })}

            <g clipPath="url(#plotClip)">
              {/* Page-view bars */}
              {data.map((d, i) => {
                const bh = (d.pageviews / leftMax) * innerH;
                return (
                  <rect
                    key={`b${i}`}
                    x={x(i) - barW / 2}
                    y={pad.t + innerH - bh}
                    width={barW}
                    height={Math.max(bh, d.pageviews > 0 ? 1.5 : 0)}
                    rx={3}
                    fill="#10b981"
                    fillOpacity={active === i ? 0.45 : 0.18}
                  />
                );
              })}

              {/* Visitors area + line */}
              {n > 1 && <path d={visitorsArea} fill="url(#visitorsFill)" />}
              <path d={visitorsLine} fill="none" stroke="#059669" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
              {/* Clicks line (right scale) */}
              <path d={clicksLine} fill="none" stroke="#6366f1" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
            </g>

            {/* Hover bands */}
            {data.map((_, i) => (
              <rect
                key={`h${i}`}
                x={pad.l + i * band}
                y={pad.t}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
              />
            ))}

            {/* Active guide + dots */}
            {active !== null && (
              <g>
                <line x1={x(active)} y1={pad.t} x2={x(active)} y2={pad.t + innerH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={x(active)} cy={yLeft(data[active].visitors)} r={4} fill="#fff" stroke="#059669" strokeWidth={2.25} />
                <circle cx={x(active)} cy={yRight(data[active].clicks)} r={4} fill="#fff" stroke="#6366f1" strokeWidth={2.25} />
              </g>
            )}

            {/* X labels */}
            {data.map((d, i) =>
              i % labelEvery === 0 || i === n - 1 ? (
                <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">
                  {hourly ? d.bucket.slice(11, 16) : dayLabel(d.bucket)}
                </text>
              ) : null
            )}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-slate-900 text-white text-xs shadow-[0_12px_32px_rgba(15,23,42,0.35)] px-3 py-2.5 min-w-[148px]"
              style={{ left: tooltipLeft }}
            >
              <p className="font-semibold mb-1.5 text-slate-200">
                {hourly ? tooltip.bucket.slice(0, 10) + ' · ' + tooltip.bucket.slice(11, 16) : dayLabel(tooltip.bucket)}
              </p>
              <div className="space-y-1">
                <p className="flex items-center justify-between gap-4"><span className="text-slate-400">Visitors</span><span className="font-medium text-emerald-400">{tooltip.visitors}</span></p>
                <p className="flex items-center justify-between gap-4"><span className="text-slate-400">Clicks</span><span className="font-medium text-indigo-300">{tooltip.clicks}</span></p>
                <p className="flex items-center justify-between gap-4"><span className="text-slate-400">Page views</span><span className="font-medium">{tooltip.pageviews}</span></p>
                <p className="flex items-center justify-between gap-4"><span className="text-slate-400">Signups</span><span className="font-medium">{tooltip.signups}</span></p>
                <p className="flex items-center justify-between gap-4"><span className="text-slate-400">Revenue</span><span className="font-medium">₹{tooltip.revenue.toLocaleString()}</span></p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
