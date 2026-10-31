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
    // Remaining elements are tracked in a Set instead of re-querying the DOM
    // on every scroll frame (querySelectorAll + N getBoundingClientRect per
    // frame was a forced synchronous layout on each rAF while scrolling).
    //
    // Pages are lazy-loaded (React.lazy), so on a hard refresh their `.reveal`
    // nodes are committed AFTER this effect's first run. Bailing out when the
    // initial DOM scan came up empty (the old behaviour) left no observer
    // behind — the whole page then stayed at opacity 0, i.e. a blank page on
    // refresh. Instead we keep a MutationObserver watching for new nodes and
    // attach them as they land; IO/sweep take over from there as usual.
    const pending = new Set<HTMLElement>();
    let raf = 0;
    const hasIO = 'IntersectionObserver' in window;

    const onScroll = () => {
      // Wrapped so rAF's timestamp never lands in sweep's `instant` param.
      if (!raf && pending.size > 0) raf = requestAnimationFrame(() => sweep());
    };

    const stopWhenDone = () => {
      if (pending.size === 0) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        window.removeEventListener('scroll', onScroll);
      }
    };

    const reveal = (el: HTMLElement, instant = false) => {
      pending.delete(el);
      if (instant) {
        // Content already on screen at mount must not spend 0.7s fading in
        // from opacity 0 — that transition counts against LCP for the hero
        // (opacity-0 elements are not "visible"). Kill the transition for the
        // flip, then restore it so hover transitions still animate later.
        el.style.transition = 'none';
        el.classList.add('animate-in');
        requestAnimationFrame(() => { el.style.transition = ''; });
      } else {
        el.classList.add('animate-in');
      }
      observer?.unobserve(el);
      stopWhenDone();
    };

    const observer = hasIO
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) reveal(entry.target as HTMLElement);
            });
          },
          { threshold: 0.08 }
        )
      : null;

    // `instant` must ONLY come from the explicit initial call — never from
    // rAF/IO arguments (rAF passes a timestamp, which would be truthy).
    const sweep = (instant = false) => {
      raf = 0;
      // Read all rects first, then write classes — keeps layout thrash to one pass.
      const hits: HTMLElement[] = [];
      pending.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) hits.push(el);
      });
      hits.forEach((el) => reveal(el, instant));
    };

    // Scan the DOM for `.reveal` nodes and hook them up. Runs at mount and
    // again whenever the DOM grows (late lazy-route content, conditionally
    // rendered sections).
    const attach = () => {
      const fresh = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.animate-in)')).filter(
        (el) => !pending.has(el)
      );
      if (fresh.length === 0) return;
      if (!observer) {
        // No IntersectionObserver available: reveal everything as it appears.
        fresh.forEach((el) => el.classList.add('animate-in'));
        return;
      }
      fresh.forEach((el) => {
        pending.add(el);
        observer.observe(el);
      });
      // Re-arm the scroll sweep in case it was already torn down.
      window.removeEventListener('scroll', onScroll);
      window.addEventListener('scroll', onScroll, { passive: true });
    };

    attach();
    sweep(true); // anything already in view appears instantly (LCP)

    // Lazy routes commit their content after this effect ran — pick new
    // `.reveal` nodes up as soon as they land. Coalesced to one rAF pass so
    // bursts of unrelated DOM churn (spinners, popups, tables) cost one scan.
    const mutations = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; attach(); });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      observer?.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
