import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePopup } from '../context/PopupContext';
import { studentApi } from '../api';
import {
  LogOutIcon, ChevronLeftIcon, ChevronDownIcon,
  HouseIcon, RocketIcon, FileTextIcon, BookOpenIcon, ClipboardIcon, UserIcon,
} from '@animateicons/react/lucide';
import AnnouncementBell from './AnnouncementBell';
import ChannelPromoBanner from './ChannelPromoBanner';
import { RadarPill } from './bento';
import { ErrorBoundary, PageSkeleton, HamburgerButton, MobileMenuSheet, menuItemClass, glCtaClass } from './ui';

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
  /** Exact-path only: needed for prefix routes like /student (the dashboard),
      whose children (/student/documents, /student/learning, ...) would
      otherwise inherit the highlight. */
  exact?: boolean;
}

const navSections: { label: string; links: NavLink[] }[] = [
  {
    label: 'Menu',
    links: [
      { path: '/student', label: 'Dashboard', icon: 'dashboard', always: true, exact: true },
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
    (!link.exact && (link.match ? location.pathname.startsWith(link.match) : location.pathname.startsWith(link.path + '/')));

  const isVisible = (link: (typeof navSections)[number]['links'][number]) => {
    if ('always' in link && link.always) return true;
    if ('showWhenEnrolled' in link && link.showWhenEnrolled) return !!hasEnrollment;
    if ('hideWhenEnrolled' in link && link.hideWhenEnrolled) return !hasEnrollment;
    return true;
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-cream font-jakarta">
      <ChannelPromoBanner />

      {/* Floating editorial dock (desktop only; mobile uses the full-screen menu sheet) */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-dvh transition-all duration-300 ease-in-out lg:flex
          ${collapsed ? 'lg:w-[104px]' : 'lg:w-64'}`}
      >
        {/* Ink panel floats 14px off the viewport edge; the main column's left
            margin mirrors its width so the gutter stays ~18px in both states. */}
        <div
          aria-hidden="true"
          className={`absolute bottom-3.5 left-3.5 top-3.5 rounded-[22px] border border-noir-card bg-noir shadow-dock transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-56'}`}
        />

        <div className={`absolute bottom-3.5 left-3.5 top-3.5 z-10 flex flex-col p-3.5 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-56'}`}>
          {/* Brand */}
          <div className={`flex shrink-0 items-center border-b border-cream/10 pb-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              {/* Raw white logo on the ink dock; sized down when the rail is
                  collapsed so it fits the 72px width. */}
              <img
                src="/logo/logo-white.png"
                alt="IQIntern"
                className={`shrink-0 w-auto object-contain ${collapsed ? 'h-5' : 'h-7'}`}
                draggable={false}
              />
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto hidden h-7 w-7 items-center justify-center rounded-lg text-cream/50 transition-colors hover:bg-cream/10 hover:text-cream lg:flex"
            >
              <ChevronLeftIcon size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overscroll-contain px-1 py-2">
            {navSections.map((section) => {
              const links = section.links.filter(isVisible);
              if (!links.length) return null;
              return (
                <div key={section.label} className="mb-1">
                  <p className={`px-3 pb-1.5 pt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-burnt ${collapsed ? 'lg:hidden' : ''}`}>
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
                              ? 'bg-burnt font-semibold text-cream shadow-[0_4px_12px_rgba(217,84,30,0.35)]'
                              : 'text-cream/60 hover:bg-cream/10 hover:text-cream'}`}
                        >
                          <span className={`shrink-0 transition-colors ${isActive ? 'text-cream' : 'text-cream/55'}`}>
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

          {/* Sidebar footer — profile card + logout */}
          <div className={`shrink-0 border-t border-cream/10 pt-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
            {!collapsed ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-cream/10 bg-cream/[0.05] p-2.5">
                <Link to="/student/edit-profile" className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burnt font-display font-bold text-xs text-cream">
                    {initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-cream">{user?.firstName} {user?.lastName}</span>
                    <span className="block truncate text-[11px] text-cream/55">Student</span>
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="rounded-xl p-2 text-cream/70 transition-colors hover:bg-burnt hover:text-cream"
                >
                  <LogOutIcon size={16} />
                </button>
              </div>
            ) : (
              <>
                <Link to="/student/edit-profile" title="Profile" className="flex justify-center rounded-xl p-2 transition-colors hover:bg-cream/10">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-burnt font-display font-bold text-[11px] text-cream">
                    {initials}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="flex w-full justify-center rounded-xl p-2 text-cream/60 transition-all hover:bg-cream/10 hover:text-cream"
                >
                  <LogOutIcon size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[104px]' : 'lg:ml-64'}`}>
        {/* Editorial command header */}
        <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-7">
            <HamburgerButton
              open={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden"
            />

            <div className="min-w-0">
              <p className="hidden font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal sm:block">Student Portal</p>
              <div className="flex min-w-0 items-center gap-2.5">
                <p className="truncate font-display text-lg font-bold tracking-tight text-ink">{titleFor(location.pathname)}</p>
                {hasEnrollment !== null && (
                  <RadarPill className="hidden shrink-0 sm:inline-flex">
                    {hasEnrollment ? 'Enrolled' : 'No active track'}
                  </RadarPill>
                )}
              </div>
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
                  className="flex items-center gap-2 rounded-full border border-sand bg-alabaster py-1 pl-1 pr-2 shadow-sm transition-all hover:border-sand-dark hover:shadow-md sm:pr-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-burnt font-display text-[10px] font-bold text-cream ring-2 ring-burnt-tint">
                    {initials}
                  </span>
                  <span className="hidden text-xs font-semibold text-ink md:block">{user?.firstName}</span>
                  <ChevronDownIcon size={14} className={`hidden text-charcoal transition-transform md:block ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div role="menu" className="animate-fade-in absolute right-0 top-full mt-2 w-56 rounded-2xl border border-sand bg-alabaster p-1.5 shadow-lift">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-ink">{user?.firstName} {user?.lastName}</p>
                      <p className="truncate text-xs text-charcoal">{user?.email}</p>
                    </div>
                    <div className="mx-2 my-1 h-px bg-sand" />
                    <Link
                      to="/student/edit-profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-charcoal transition-colors hover:bg-cream hover:text-ink"
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
          </div>
        </header>

        {/* Mobile menu — GlobalLogic-style full-screen sheet */}
        <MobileMenuSheet open={mobileOpen} onClose={() => setMobileOpen(false)}>
          {navSections
            .flatMap((section) => section.links)
            .filter(isVisible)
            .map((link) => {
              const active = isLinkActive(link);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={menuItemClass(active)}
                >
                  {link.label}
                </Link>
              );
            })}
          <div className="mt-8 flex w-full flex-wrap items-center gap-4">
            <button type="button" onClick={handleLogout} className={glCtaClass}>
              Logout
            </button>
          </div>
        </MobileMenuSheet>

        {/* Content */}
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-7">
          {/* Keyed by path on purpose: every navigation mounts a FRESH,
              never-revealed Suspense boundary. Without the key a route chunk
              that is slow or never resolves suspends inside a boundary that
              already revealed the previous page, so React keeps that page on
              screen — URL moves, no skeleton, no error (the navigation freeze
              reproduced on production with /student/documents). */}
          <ErrorBoundary>
            <Suspense key={location.pathname} fallback={<PageSkeleton label="Loading page..." />}>
              <div key={location.pathname} className="animate-page-in">
                <Outlet />
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
