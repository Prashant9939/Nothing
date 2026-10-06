import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthSplitProps {
  children: ReactNode;
  wide?: boolean;
}

export default function AuthSplit({ children, wide = false }: AuthSplitProps) {
  // The decorative panel is hidden below lg — mount it only when the viewport
  // is actually lg, so phones never download the 1.1 MB video for a panel
  // they will never paint.
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setShowVideo(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <section className="min-h-[calc(100dvh-6rem)] flex items-center justify-center px-4 py-6 bg-gradient-to-br from-gray-100 via-gray-100 to-gray-200">
      <div
        className={`w-full grid bg-white rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.10),0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up ${
          wide ? 'max-w-6xl lg:grid-cols-[1.25fr_1fr]' : 'max-w-5xl lg:grid-cols-[2fr_3fr]'
        }`}
      >
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">{children}</div>
        {showVideo && (
          <div className="relative hidden lg:block bg-gradient-to-br from-gray-200 to-gray-300 rounded-tl-[7rem] overflow-hidden">
            <video
              src="/fluid-loop.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
