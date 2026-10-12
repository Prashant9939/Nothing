import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';

interface LiquidLogoProps {
  className?: string;
  to?: string;
}

/* Decorative paint blobs: squish in from both sides of the mark, merge through
   the SVG goo filter, then collapse as the logo streaks into place.
   Coordinates live in a -inset-4 (72x72) box around the 40x40 logo. */
const BLOBS = [
  { size: 22, left: -2, top: 6, from: '-32px', color: 'bg-orange-500', delay: 0 },
  { size: 15, left: 8, top: 34, from: '-26px', color: 'bg-amber-400', delay: 0.09 },
  { size: 20, left: 52, top: 2, from: '32px', color: 'bg-orange-500', delay: 0.05 },
  { size: 14, left: 56, top: 30, from: '26px', color: 'bg-amber-400', delay: 0.14 },
  { size: 17, left: 28, top: 27, from: '0px', color: 'bg-orange-500', delay: 0.22 },
];

/* The logo mark, reused by the ghost trails (alt="" + aria-hidden wrapper). */
function LogoBox({ ghost = false }: { ghost?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-100">
      <img
        src="/logo/logo-iq.png"
        alt={ghost ? '' : 'IQIntern'}
        className={`h-7 w-7 object-contain ${ghost ? '' : 'relative animate-logo-bob [animation-delay:1.4s]'}`}
        draggable={false}
      />
    </div>
  );
}

/**
 * IQIntern header logo with a "liquid smear" reveal (pure CSS/SVG, no libs):
 * 1. paint blobs squish in from both sides and merge (SVG goo filter)
 * 2. the mark streaks in from the left — stretched + blurred, with ghost trails —
 *    and snaps into place with a back-out bounce
 * 3. a splash ring pops on landing, then the mark settles into an idle bob
 *    with a periodic sheen sweep
 */
export default function LiquidLogo({ className = '', to = '/' }: LiquidLogoProps) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2.5 mb-4 ${className}`}>
      <div className="relative w-10 h-10">
        {/* Gooey filter: adjacent paint blobs merge into one liquid mass */}
        <svg aria-hidden="true" className="absolute h-0 w-0">
          <defs>
            <filter id="iq-liquid-goo" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
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

        {/* Paint blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4"
          style={{ filter: 'url(#iq-liquid-goo)' }}
        >
          {BLOBS.map((b) => (
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

        {/* Splash ring on landing */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-orange-400/80 opacity-0 animate-liquid-splat"
        />

        {/* The mark: streaks in from the left with trailing smear ghosts */}
        <div className="relative origin-left animate-logo-streak">
          {[0.56, 0.64].map((delay) => (
            <div
              key={delay}
              aria-hidden="true"
              className="absolute inset-0 opacity-0 animate-logo-trail"
              style={{ animationDelay: `${delay}s` }}
            >
              <LogoBox ghost />
            </div>
          ))}
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-100 transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-orange-500/40">
            <img
              src="/logo/logo-iq.png"
              alt="IQIntern"
              className="relative h-7 w-7 object-contain animate-logo-bob [animation-delay:1.4s]"
              draggable={false}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-logo-sheen [animation-delay:2.6s] bg-gradient-to-r from-transparent via-orange-200/70 to-transparent"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
