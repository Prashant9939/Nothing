import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Site-wide scroll reveal: watches every `.reveal` element on the current
// route and adds `.animate-in` the first time it enters the viewport
// (one-shot — navigation back re-mounts page content, so it replays then).
// A scroll-driven sweep runs alongside IntersectionObserver as a safety net:
// IO callbacks can be skipped for elements that cross the viewport during very
// fast programmatic scrolls, leaving them stuck hidden.
export default function RevealOnScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pending = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.animate-in)'));
    const targets = pending();
    if (targets.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('animate-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    targets.forEach((el) => observer.observe(el));

    let raf = 0;
    const sweep = () => {
      raf = 0;
      pending().forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          el.classList.add('animate-in');
          observer.unobserve(el);
        }
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sweep);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    sweep();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
