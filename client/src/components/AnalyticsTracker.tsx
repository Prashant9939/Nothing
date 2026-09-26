import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type EventType = 'visit' | 'pageview' | 'click';

const CLICKABLE = 'a, button, [role="button"], input, select, textarea, [onclick]';

function getVisitorId(): string {
  try {
    let id = localStorage.getItem('iq_vid');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('iq_vid', id);
    }
    return id;
  } catch {
    return 'storage-blocked-visitor';
  }
}

function send(type: EventType, path?: string) {
  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ visitorId: getVisitorId(), type, path }),
    }).catch(() => {});
  } catch {
    /* tracking must never break the app */
  }
}

// Silent site-wide tracker: one visit per browser session, a pageview per
// route change, and throttled clicks on interactive elements.
export default function AnalyticsTracker() {
  const location = useLocation();
  const lastClickAt = useRef(0);

  useEffect(() => {
    let isNewSession = true;
    try {
      isNewSession = !sessionStorage.getItem('iq_visit');
      if (isNewSession) sessionStorage.setItem('iq_visit', '1');
    } catch {
      /* storage blocked — still count the visit */
    }
    if (isNewSession) send('visit', window.location.pathname);
  }, []);

  useEffect(() => {
    send('pageview', location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest(CLICKABLE)) return;
      const now = Date.now();
      if (now - lastClickAt.current < 1000) return;
      lastClickAt.current = now;
      send('click', window.location.pathname);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
