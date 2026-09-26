import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePopup } from '../context/PopupContext';
import { studentApi } from '../api';
import {
  MenuIcon, LogOutIcon, ChevronLeftIcon, ChevronDownIcon,
  HouseIcon, RocketIcon, FileTextIcon, BookOpenIcon, ClipboardIcon, UserIcon,
} from '@animateicons/react/lucide';
import AnnouncementBell from './AnnouncementBell';
import { ErrorBoundary, PageLoader } from './ui';

const iconMap: Record<string, ReactNode> = {
  dashboard: <HouseIcon size={20} />,
  target: <RocketIcon size={20} />,
  documents: <FileTextIcon size={20} />,
  learning: <BookOpenIcon size={20} />,
  exam: <ClipboardIcon size={20} />,
  profile: <UserIcon size={20} />,
};

interface NavLink {
  path: string;
  label: string;
  icon: string;
  always?: boolean;
  showWhenEnrolled?: boolean;
  hideWhenEnrolled?: boolean;
  match?: string;
}

const navSections: { label: string; links: NavLink[] }[] = [
  {
    label: 'Menu',
    links: [
      { path: '/student', label: 'Dashboard', icon: 'dashboard', always: true },
      { path: '/student/select-track', label: 'Select Track', icon: 'target', hideWhenEnrolled: true },
      { path: '/student/documents', label: 'Documents', icon: 'documents', showWhenEnrolled: true },
      { path: '/student/learning', label: 'Learning', icon: 'learning', showWhenEnrolled: true },
      { path: '/student/exam-page', label: 'Exam', icon: 'exam', showWhenEnrolled: true, match: '/student/exam' },
    ],
  },
  {
    label: 'Account',
    links: [
      { path: '/student/edit-profile', label: 'Profile', icon: 'profile', always: true },
    ],
  },
];

function titleFor(path: string) {
  if (path.startsWith('/student/select-track')) return 'Select Track';
  if (path.startsWith('/student/documents')) return 'Documents';
  if (path.startsWith('/student/learning')) return 'Learning';
  if (path.startsWith('/student/exam')) return 'Examination';
  if (path.startsWith('/student/pay')) return 'Payment';
  if (path.startsWith('/student/edit-profile')) return 'Profile';
  return 'Dashboard';
}

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const popup = usePopup();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasEnrollment, setHasEnrollment] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch enrollment once; re-validate only when returning from the
  // enroll/payment flow — keeps the previous value so the nav never flickers.
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      studentApi.getEnrollmentStatus()
        .then((res) => { if (alive) setHasEnrollment(res.data.hasEnrollment); })
        .catch(() => { if (alive) setHasEnrollment((prev) => prev ?? false); });

    const from = prevPathRef.current;
    const to = location.pathname;
    prevPathRef.current = to;

    // Refresh when landing on the dashboard, when re-validating on mount, or
    // whenever leaving the enroll/payment flow — after a successful payment the
    // app navigates pay → /student/learning, and the new enrollment must be
    // reflected in the nav without a full page reload.
    if (from === to) refresh();
    else if (to === '/student' || from.startsWith('/student/select-track') || from.startsWith('/student/pay')) refresh();

    return () => { alive = false; };
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  // Scroll to top when navigating to a different route (skip initial mount
  // so a browser-restored scroll position on refresh is preserved)
  const scrolledForPath = useRef(location.pathname);
  useEffect(() => {
    if (scrolledForPath.current === location.pathname) return;
    scrolledForPath.current = location.pathname;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Lock background scroll while the mobile/tablet drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [mobileOpen]);

  // The drawer and its overlay are hidden at lg (lg:translate-x-0 / lg:hidden).
  // If the viewport crosses into lg while the drawer is open (device rotation,
  // split-view resize, DevTools breakpoint change) the overlay that closes it
  // disappears while the scroll lock stays applied — leaving the page
  // unscrollable. Close the drawer whenever we reach lg so the lock is
  // always released.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (mq.matches) setMobileOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Scroll-lock safety net. Runs on route change and whenever the drawer
  // closes — i.e. AFTER the lock effect's cleanup above (cleanups always run
  // before effects) — so a stale `prev` restored by any unmounting overlay
  // can never leave the page unscrollable. Skipped while the drawer is open
  // so the drawer's own lock is never cancelled.
  useEffect(() => {
    if (!mobileOpen) document.body.style.overflow = '';
  }, [location.pathname, mobileOpen]);

  // Close avatar menu on outside click / Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    const ok = await popup.confirm('Are you sure you want to logout?', {
      title: 'Logout', confirmLabel: 'Logout', cancelLabel: 'Cancel',
    });
    if (ok) { await logout(); navigate('/'); }
  };

  const isLinkActive = (link: (typeof navSections)[number]['links'][number]) =>
    location.pathname === link.path ||
    (link.match ? location.pathname.startsWith(link.match) : location.pathname.startsWith(link.path + '/'));

  const isVisible = (link: (typeof navSections)[number]['links'][number]) => {
    if ('always' in link && link.always) return true;
    if ('showWhenEnrolled' in link && link.showWhenEnrolled) return !!hasEnrollment;
    if ('hideWhenEnrolled' in link && link.hideWhenEnrolled) return !hasEnrollment;
    return true;
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-surface">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh flex-col transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        <div className="absolute inset-0 rounded-r-2xl bg-gradient-to-b from-[#0a0f1e] via-[#0f172a] to-[#111827] shadow-[8px_0_30px_rgba(0,0,0,0.4)]" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Brand */}
          <div className={`flex h-16 shrink-0 items-center border-b border-white/5 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.35)]">
                <span className="text-xs font-bold text-white">IQ</span>
              </div>
              {!collapsed && (
                <span className="hidden text-sm font-bold text-white lg:block">
                  IQ<span className="text-slate-300">Intern</span>
                </span>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto hidden h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 lg:flex"
            >
              <ChevronLeftIcon size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
            {navSections.map((section) => {
              const links = section.links.filter(isVisible);
              if (!links.length) return null;
              return (
                <div key={section.label} className="mb-1">
                  <p className={`px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {links.map((link) => {
                      const isActive = isLinkActive(link);
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          title={collapsed ? link.label : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200
                            ${collapsed ? 'justify-center px-0 py-2.5 lg:px-0' : 'px-3 py-2.5'}
                            ${isActive
                              ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
                              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                        >
                          <span className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {iconMap[link.icon]}
                          </span>
                          {!collapsed && <span className="hidden truncate lg:block">{link.label}</span>}
                          <span className="truncate lg:hidden">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className={`shrink-0 border-t border-white/5 p-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {!collapsed ? (
              <>
                <Link to="/student/edit-profile" className="mb-1 flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-white/5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden min-w-0 lg:block">
                    <span className="block truncate text-xs font-medium text-slate-200">{user?.firstName} {user?.lastName}</span>
                    <span className="block truncate text-[10px] text-slate-500">{user?.email}</span>
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOutIcon size={14} />
                  <span className="hidden lg:block">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/student/edit-profile" title="Profile" className="flex justify-center rounded-xl p-2 transition-colors hover:bg-white/5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
                    {initials}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="flex w-full justify-center rounded-xl p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOutIcon size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon size={20} />
          </button>

          <div className="min-w-0">
            <p className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:block">Student Portal</p>
            <p className="truncate text-sm font-semibold text-slate-900">{titleFor(location.pathname)}</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <AnnouncementBell />

            {/* Avatar menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition-all hover:shadow-md sm:pr-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white">
                  {initials}
                </span>
                <span className="hidden text-xs font-semibold text-slate-700 md:block">{user?.firstName}</span>
                <ChevronDownIcon size={14} className={`hidden text-slate-400 transition-transform md:block ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div role="menu" className="animate-fade-in absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <div className="mx-2 my-1 h-px bg-slate-100" />
                  <Link
                    to="/student/edit-profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <UserIcon size={15} />
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOutIcon size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader label="Loading..." className="h-[50vh]" />}>
              <div key={location.pathname} className="animate-fade-in">
                <Outlet />
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
