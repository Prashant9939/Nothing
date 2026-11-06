import { useEffect, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';

/* ---------------------------------------------------------------------------
   Route chunk prefetching.

   Every page in this app is behind React.lazy(), so the FIRST click into a
   section has to download its JS (measured: 4-10 chunks, 100-400ms) while
   later clicks are instant. Prefetching on hover / focus / idle moves that
   cost off the click and onto a moment where the user is already waiting.

   Two registries rather than one, because layouts and pages want different
   treatment:
     - `lazyLayout(prefix, load)` matches by path prefix, so hovering any
       /student/* link pulls in StudentLayout (the sidebar shell) exactly once.
     - `lazyRoute(path, load)` matches the exact href, so hovering
       /student/documents does NOT also drag in the dashboard page.

   Loaders are keyed by the function object itself, so a module registered
   under several paths is only ever fetched once.
--------------------------------------------------------------------------- */

// The shape React.lazy() requires, so these can be handed straight to it.
type Loader = () => Promise<{ default: ComponentType }>;

const exact = new Map<string, Loader[]>();
const prefix = new Map<string, Loader[]>();
const started = new WeakSet<object>();

const add = (map: Map<string, Loader[]>, key: string, load: Loader) => {
  const list = map.get(key);
  if (list) list.push(load);
  else map.set(key, [load]);
};

/** Register a leaf page: prefetch only when its exact path is targeted. */
export function lazyRoute(path: string, load: Loader): Loader {
  add(exact, path, load);
  return load;
}

/** Register a layout/shell: prefetch for the path and everything under it. */
export function lazyLayout(path: string, load: Loader): Loader {
  add(prefix, path, load);
  return load;
}

function run(load: Loader) {
  if (started.has(load)) return;
  started.add(load);
  try {
    // A failed import must not poison the entry — allow a later retry.
    Promise.resolve(load()).catch(() => started.delete(load));
  } catch {
    started.delete(load);
  }
}

/** Warm the chunks a navigation to `path` will need. Safe to call repeatedly. */
export function prefetchRoute(path: string) {
  const hit = exact.get(path);
  if (hit) hit.forEach(run);

  // Every registered prefix that contains this path. A shell (/student) and a
  // dynamic-route stem (/student/pay) can both apply at once — e.g.
  // /student/pay/11 needs StudentLayout *and* Payment — and prefixes are
  // never registered across sections, so this cannot over-fetch.
  for (const [key, loads] of prefix) {
    if (path === key || path.startsWith(key + '/')) loads.forEach(run);
  }
}

/**
 * Bulk prefetching must never fight the page for bandwidth. Warming ~25
 * chunks in one burst measured at +5.7s on /admin/payments under Slow 3G:
 * the requests queue ahead of the API call the navigation actually needs, so
 * the "optimisation" made the page slower. Skip it when the link cannot
 * afford it; hover/focus prefetching stays on because that chunk is about to
 * be requested anyway.
 */
function connectionIsSlow() {
  const c = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number; rtt?: number };
  }).connection;
  if (!c) return false;
  if (c.saveData) return true;
  if (/(^|-)2g$/.test(c.effectiveType || '')) return true;
  if (typeof c.downlink === 'number' && c.downlink < 0.7) return true;
  if (typeof c.rtt === 'number' && c.rtt > 300) return true;
  return false;
}

/**
 * Delegated hover/focus prefetcher plus an idle warm-up of the links that are
 * on screen. Mounted once, above the router, so it covers every layout.
 */
export default function RoutePrefetcher() {
  const location = useLocation();

  useEffect(() => {
    const resolve = (el: Element | null): string | null => {
      const a = el instanceof Element ? el.closest('a[href^="/"]') : null;
      if (!a) return null;
      const href = a.getAttribute('href') || '';
      // Skip downloads, external links, in-page anchors and query-only links.
      if (!href.startsWith('/') || href.startsWith('//')) return null;
      return href.split(/[?#]/)[0] || null;
    };

    const onEnter = (e: Event) => {
      const path = resolve(e.target as Element);
      if (path) prefetchRoute(path);
    };

    // pointerenter doesn't bubble, but pointerover does — use it and filter.
    document.addEventListener('pointerover', onEnter, { passive: true });
    document.addEventListener('focusin', onEnter);
    return () => {
      document.removeEventListener('pointerover', onEnter);
      document.removeEventListener('focusin', onEnter);
    };
  }, []);

  // Warm the rest of the current section's nav once the page is idle, so the
  // second click in any section is already instant. Held back until `load` so
  // the page's own images/fonts/API get the connection first, and skipped
  // entirely on links too slow to share.
  useEffect(() => {
    if (connectionIsSlow()) return;

    let cancelled = false;
    let cancelIdle: (() => void) | undefined;

    const run = () => {
      if (cancelled) return;
      document
        .querySelectorAll<HTMLAnchorElement>('a[href^="/"]')
        .forEach((a) => prefetchRoute((a.getAttribute('href') || '').split(/[?#]/)[0]));
    };

    const kick = () => {
      if (cancelled) return;
      const idle = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) {
        const id = idle(run, { timeout: 2500 });
        cancelIdle = () => (window as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      } else {
        const t = window.setTimeout(run, 2000);
        cancelIdle = () => window.clearTimeout(t);
      }
    };

    if (document.readyState === 'complete') kick();
    else window.addEventListener('load', kick, { once: true });

    return () => {
      cancelled = true;
      cancelIdle?.();
      window.removeEventListener('load', kick);
    };
  }, [location.pathname]);

  return null;
}
