import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePopup } from '../context/PopupContext';
import { Button } from './ui';

// Auto-logout rule: 15 minutes without any interaction on the site = signed out.
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const WARN_MS = 60 * 1000; // countdown warning shown 60s before the logout

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'wheel', 'scroll', 'pointermove'] as const;

export default function IdleLogout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const popup = usePopup();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const warnTimer = useRef<number | undefined>(undefined);
  const logoutTimer = useRef<number | undefined>(undefined);
  const tickTimer = useRef<number | undefined>(undefined);
  const deadline = useRef(0);

  const clearTimers = useCallback(() => {
    window.clearTimeout(warnTimer.current);
    window.clearTimeout(logoutTimer.current);
    window.clearInterval(tickTimer.current);
  }, []);

  const endSession = useCallback(async () => {
    clearTimers();
    setSecondsLeft(null);
    await logout();
    popup.notify(
      'You were signed out because you were inactive for 15 minutes. Sign in again to continue.',
      { kind: 'warning', title: 'Signed Out — Inactivity' }
    );
    navigate('/login');
  }, [clearTimers, logout, popup, navigate]);

  // (Re)start the inactivity countdown — only touches timers, state resets
  // happen in the event handlers that call it
  const arm = useCallback(() => {
    clearTimers();
    deadline.current = Date.now() + IDLE_LIMIT_MS;
    warnTimer.current = window.setTimeout(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      tickTimer.current = window.setInterval(() => {
        setSecondsLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      }, 250);
    }, IDLE_LIMIT_MS - WARN_MS);
    logoutTimer.current = window.setTimeout(() => { endSession(); }, IDLE_LIMIT_MS);
  }, [clearTimers, endSession]);

  const onActivity = useCallback(() => {
    setSecondsLeft(null);
    arm();
  }, [arm]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    arm();
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearTimers();
    };
  }, [isAuthenticated, arm, onActivity, clearTimers]);

  if (!isAuthenticated || secondsLeft === null || secondsLeft <= 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[320px] max-w-[calc(100vw-2rem)] animate-fade-in" role="alert">
      <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-lift">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600" aria-hidden="true">
            <Clock size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Session expiring</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              You'll be signed out in{' '}
              <span className="font-bold text-amber-600">{secondsLeft}s</span> due to
              inactivity. Move or click anywhere to stay signed in.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onActivity}>
              Stay Signed In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
