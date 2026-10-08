import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { LogOutIcon, ChevronLeftIcon, LayoutDashboardIcon, UsersIcon, CreditCardIcon, FileTextIcon } from '@animateicons/react/lucide';
import { Spinner, HamburgerButton, MobileMenuSheet, menuItemClass, glCtaClass, ErrorBoundary } from './ui';

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboardIcon size={20} />,
  students: <UsersIcon size={20} />,
  payments: <CreditCardIcon size={20} />,
  documents: <FileTextIcon size={20} />,
};

const links = [
  { path: '/partner', label: 'Dashboard', icon: 'dashboard' },
  { path: '/partner/students', label: 'Students', icon: 'students' },
  { path: '/partner/payments', label: 'Payments', icon: 'payments' },
  { path: '/partner/documents', label: 'Documents', icon: 'documents' },
];

function titleFor(path: string): string {
  const match = [...links].reverse().find((l) => l.path === '/partner' ? path === l.path : path.startsWith(l.path));
  return match?.label ?? 'Dashboard';
}

export default function PartnerLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const handleLogout = async () => { setProfileOpen(false); await logout(); navigate('/'); };

  const isActive = (path: string) =>
    path === '/partner'
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-surface">
      {profileOpen && <div className="fixed inset-0 z-[25] lg:hidden" onClick={() => setProfileOpen(false)} aria-hidden="true" />}

      {/* Sidebar (desktop only; mobile uses the full-screen menu sheet) */}
      <aside className={`fixed top-0 left-0 z-50 hidden h-dvh w-64 flex-col transition-all duration-300 ease-in-out lg:flex
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
      `}>
        {/* 3D Sidebar background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1e] via-[#0f172a] to-[#111827] rounded-r-2xl shadow-[8px_0_30px_rgba(0,0,0,0.4),4px_0_10px_rgba(0,0,0,0.2)]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className={`h-16 flex items-center border-b border-white/5 shrink-0 ${collapsed ? 'lg:justify-center px-2' : 'px-5'}`}>
            <Link to="/partner" className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(249,115,22,0.35)] shrink-0">
                <img src="/logo/logo-iq.png" alt="IQIntern" className="h-7 w-7 object-contain" />
              </div>
              {!collapsed && (
                <div className="hidden lg:block min-w-0">
                  <span className="text-sm font-bold text-white">IQ<span className="text-slate-300">Intern</span></span>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">Partner Portal</p>
                </div>
              )}
            </Link>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex ml-auto w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 transition-colors">
              <ChevronLeftIcon size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {links.map((link) => {
              const active = isActive(link.path);
              return (
                <Link key={link.path} to={link.path} title={collapsed ? link.label : undefined}
                  className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${collapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5'}
                    ${active
                      ? 'bg-orange-500/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-orange-400/25'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <span className={`shrink-0 ${active ? 'text-orange-400' : 'text-slate-400'}`}>
                    {iconMap[link.icon]}
                  </span>
                  {!collapsed && <span className="hidden lg:block truncate">{link.label}</span>}
                  <span className="lg:hidden truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className={`shrink-0 border-t border-white/5 p-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2.5 p-2 rounded-xl mb-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-slate-400 truncate">Partner</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 rounded-xl text-xs font-medium hover:bg-red-500/10 hover:text-red-400 transition-all">
                  <LogOutIcon size={14} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center p-2 rounded-xl mb-1" title={`${user?.firstName} ${user?.lastName}`}>
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </div>
                <button onClick={handleLogout} className="flex justify-center w-full p-2 text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all" title="Logout">
                  <LogOutIcon size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/70 backdrop-blur-xl border-b border-gray-200/60 flex items-center px-4 sm:px-6 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <HamburgerButton
            open={mobileOpen}
            onClick={() => {
              setProfileOpen(false);
              setMobileOpen((v) => !v);
            }}
            className="lg:hidden"
          />

          <div className="min-w-0">
            <p className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-500 sm:block">Partner Portal</p>
            <p className="truncate text-sm font-semibold text-slate-900">{titleFor(location.pathname)}</p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)] ring-2 ring-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lift animate-fade-in">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOutIcon size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu — GlobalLogic-style full-screen sheet */}
        <MobileMenuSheet open={mobileOpen} onClose={() => setMobileOpen(false)}>
          {links.map((link) => {
            const active = isActive(link.path);
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
        <main className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><Spinner size={36} /></div>}>
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
