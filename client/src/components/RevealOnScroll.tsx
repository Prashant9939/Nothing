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
    // Track remaining elements in a Set instead of re-querying the DOM on
    // every scroll frame (querySelectorAll + N getBoundingClientRect per
    // frame was a forced synchronous layout on each rAF while scrolling).
    const pending = new Set<HTMLElement>(
      Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.animate-in)'))
    );
    if (pending.size === 0) return;

    if (!('IntersectionObserver' in window)) {
      pending.forEach((el) => el.classList.add('animate-in'));
      return;
    }

    let raf = 0;
    const onScroll = () => {
      if (!raf && pending.size > 0) raf = requestAnimationFrame(sweep);
    };

    const reveal = (el: HTMLElement) => {
      pending.delete(el);
      el.classList.add('animate-in');
      observer.unobserve(el);
      if (pending.size === 0) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        window.removeEventListener('scroll', onScroll);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        });
      },
      { threshold: 0.08 }
    );
    pending.forEach((el) => observer.observe(el));

    const sweep = () => {
      raf = 0;
      // Read all rects first, then write classes — keeps layout thrash to one pass.
      const hits: HTMLElement[] = [];
      pending.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) hits.push(el);
      });
      hits.forEach(reveal);
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
