import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface AuthSplitProps {
  children: ReactNode;
  wide?: boolean;
}

/* Paint blobs for the hero reveal — coordinates live in a -inset-12 box
   around the full logo lockup (270x160). */
const PANEL_BLOBS = [
  { size: 56, left: -6, top: 26, from: '-70px', color: 'bg-orange-500', delay: 0 },
  { size: 34, left: 26, top: 104, from: '-58px', color: 'bg-amber-400', delay: 0.1 },
  { size: 48, left: 228, top: 12, from: '70px', color: 'bg-orange-500', delay: 0.06 },
  { size: 30, left: 236, top: 96, from: '58px', color: 'bg-amber-400', delay: 0.16 },
  { size: 40, left: 115, top: 48, from: '0px', color: 'bg-orange-500', delay: 0.24 },
];

/* The full logo lockup sits directly on the panel (no white card) — the warm
   drop-shadow keeps it readable over the amber gradient and blob glow. */
const logoClass = 'block h-16 w-auto object-contain drop-shadow-[0_12px_28px_rgba(120,53,15,0.30)]';

export default function AuthSplit({ children, wide = false }: AuthSplitProps) {
  // Decorative brand panel: liquid logo reveal (pure CSS/SVG, no video).
  // Replaced fluid-loop.mp4 — no ~287KB download, no continuous decode,
  // and it works offline. Desktop only (hidden below lg via CSS) — the
  // animation is not shown on phones.
  // The reveal replays on a loop; remounting via key restarts the one-shot
  // entrance animations. Plays regardless of prefers-reduced-motion.
  const [revealCycle, setRevealCycle] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setRevealCycle((c) => c + 1), 9000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="min-h-[calc(100dvh-6rem)] flex items-center justify-center px-4 py-6 bg-white">
      <div
        className={`w-full grid bg-white rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.10),0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up ${
          wide ? 'max-w-6xl lg:grid-cols-[1.25fr_1fr]' : 'max-w-5xl lg:grid-cols-[2fr_3fr]'
        }`}
      >
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">{children}</div>

        <div
          aria-hidden="true"
          className="relative hidden lg:block bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 rounded-tl-[7rem] overflow-hidden"
        >
          {/* Ambient glows */}
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl animate-logo-breathe" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-amber-400/25 blur-3xl animate-logo-breathe [animation-delay:2.4s]" />

          {/* Pulse rings behind the logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-44 w-44 rounded-full border-2 border-orange-500/25 animate-ring-pulse" />
            <div className="absolute h-44 w-44 rounded-full border-2 border-orange-400/25 animate-ring-pulse [animation-delay:1.2s]" />
          </div>

          {/* Orbiting accent dots */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-80 w-80 animate-orbit-slow">
              <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
              <span className="absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-300" />
            </div>
          </div>

          {/* Diagonal sheen sweep — BEHIND the logo content so it never
              washes over the mark or wordmark */}
          <div className="absolute inset-0 animate-panel-sheen bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          {/* Logo card + wordmark — liquid reveal, replayed on a loop */}
          <div className="relative flex h-full flex-col items-center justify-center gap-6 p-10">
            {/* Card: paint blobs merge in, card streaks in with smear ghosts, splash pops */}
            <div className="animate-float">
              <div key={`mark-${revealCycle}`} className="relative">
                {/* Gooey filter: adjacent paint blobs merge into one liquid mass */}
                <svg aria-hidden="true" className="absolute h-0 w-0">
                  <defs>
                    <filter id="iq-panel-goo" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
                      <feColorMatrix
                        in="blur"
                        mode="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                        result="goo"
                      />
                      <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                  </defs>
                </svg>

                {/* Animated SVG: morphing liquid blob + rotating dashed orbit
                    rings with glowing travelling dots (spins forever, behind
                    the logo). Stage is -inset-20 so the ring clears the wide
                    lockup. */}
                <div aria-hidden="true" className="pointer-events-none absolute -inset-20">
                  <svg className="h-full w-full overflow-visible" viewBox="0 0 240 240" fill="none">
                    <defs>
                      <radialGradient id="iq-blob-grad" cx="35%" cy="30%" r="75%">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
                        <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Slowly morphing liquid blob */}
                    <path
                      className="animate-blob-morph blur-xl"
                      d="M 120 44 C 162 44 196 78 196 120 C 196 162 162 196 120 196 C 78 196 44 162 44 120 C 44 78 78 44 120 44 Z"
                      fill="url(#iq-blob-grad)"
                    />

                    {/* Dashed orbit ring */}
                    <g className="svg-orbit animate-ring-spin">
                      <circle
                        cx="120"
                        cy="120"
                        r="112"
                        stroke="#fb923c"
                        strokeOpacity="0.4"
                        strokeWidth="2"
                        strokeDasharray="3 10"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Counter-rotating arc */}
                    <g className="svg-orbit animate-ring-spin-rev">
                      <circle cx="120" cy="120" r="96" stroke="#f59e0b" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="80 523" />
                    </g>

                    {/* Glowing travelling dots on the rings */}
                    <g className="svg-orbit animate-ring-spin">
                      <circle cx="120" cy="8" r="4.5" fill="#f97316" className="drop-shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
                    </g>
                    <g className="svg-orbit animate-ring-spin-rev [animation-duration:26s]">
                      <circle cx="120" cy="24" r="3" fill="#fbbf24" className="drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                    </g>
                  </svg>
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-12"
                  style={{ filter: 'url(#iq-panel-goo)' }}
                >
                  {PANEL_BLOBS.map((b) => (
                    <span
                      key={`${b.left}-${b.top}`}
                      className={`absolute opacity-0 animate-liquid-blob ${b.color}`}
                      style={
                        {
                          width: b.size,
                          height: b.size,
                          left: b.left,
                          top: b.top,
                          borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                          animationDelay: `${b.delay}s`,
                          '--bx': b.from,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-orange-400/70 opacity-0 animate-liquid-splat"
                />

                <div
                  className="relative origin-left animate-logo-streak"
                  style={{ '--streak-x': '-180px' } as CSSProperties}
                >
                  {[0.56, 0.64].map((delay) => (
                    <div
                      key={delay}
                      aria-hidden="true"
                      className="absolute inset-0 opacity-0 animate-logo-trail"
                      style={{ animationDelay: `${delay}s`, '--streak-x': '-180px' } as CSSProperties}
                    >
                      <img src="/logo/logo-trimmed.png" alt="" className={logoClass} draggable={false} />
                    </div>
                  ))}
                  <img src="/logo/logo-trimmed.png" alt="IQIntern" className={logoClass} draggable={false} />
                </div>
              </div>
            </div>

            {/* Tagline streaks in after the logo lands */}
            <div key={`word-${revealCycle}`} className="text-center">
              <p className="text-sm font-medium text-slate-500 animate-fade-in-up [animation-delay:1.45s]">
                Practical Training, Verified Outcomes
              </p>
            </div>
          </div>

          {/* Diagonal sheen sweep */}
        </div>
      </div>
    </section>
  );
}
