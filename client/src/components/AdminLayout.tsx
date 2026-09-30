import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { MenuIcon, LogOutIcon, ChevronLeftIcon, SearchIcon, BellIcon, LayoutDashboardIcon, BookOpenIcon, UsersIcon, CreditCardIcon, FileTextIcon, LightbulbIcon, GlobeIcon, MegaphoneIcon, ClipboardIcon, SettingsIcon, ChartPieIcon, MessageSquareIcon } from "@animateicons/react/lucide";
import { Spinner } from './ui';

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboardIcon size={20} />,
  analytics: <ChartPieIcon size={20} />,
  internships: <BookOpenIcon size={20} />,
  users: <UsersIcon size={20} />,
  payments: <CreditCardIcon size={20} />,
  exams: <FileTextIcon size={20} />,
  marks: <ClipboardIcon size={20} />,
  questions: <LightbulbIcon size={20} />,
  institutions: <GlobeIcon size={20} />,
  announcements: <MegaphoneIcon size={20} />,
  issues: <MessageSquareIcon size={20} />,
  settings: <SettingsIcon size={20} />,
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const handleLogout = async () => { setProfileOpen(false); await logout(); navigate('/'); };

  const links = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/admin/internships', label: 'Internships', icon: 'internships' },
    { path: '/admin/questions', label: 'Questions', icon: 'questions' },
    { path: '/admin/users', label: 'Users', icon: 'users' },
    { path: '/admin/payments', label: 'Payments', icon: 'payments' },
    { path: '/admin/exams', label: 'Exams', icon: 'exams' },
    { path: '/admin/marks', label: 'Marks', icon: 'marks' },
    { path: '/admin/institutions', label: 'Colleges', icon: 'institutions' },
    { path: '/admin/announcements', label: 'Announcements', icon: 'announcements' },
    { path: '/admin/issues', label: 'Issues', icon: 'issues' },
    { path: '/admin/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-[#eef0f4]">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}
      {profileOpen && <div className="fixed inset-0 z-20 lg:hidden" onClick={() => setProfileOpen(false)} aria-hidden="true" />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-dvh w-64 z-50 flex flex-col transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
      `}>
        {/* 3D Sidebar background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1e] via-[#0f172a] to-[#111827] rounded-r-2xl shadow-[8px_0_30px_rgba(0,0,0,0.4),4px_0_10px_rgba(0,0,0,0.2)]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className={`h-16 flex items-center border-b border-white/5 shrink-0 ${collapsed ? 'lg:justify-center px-2' : 'px-5'}`}>
            <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] shrink-0">
                <span className="text-slate-900 font-bold text-xs">IQ</span>
              </div>
              {!collapsed && (
                <div className="hidden lg:block min-w-0">
                  <span className="text-sm font-bold text-white">IQ<span className="text-slate-300">Intern</span></span>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">Admin Panel</p>
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
              const isActive = location.pathname === link.path;
              return (
                <Link key={link.path} to={link.path} title={collapsed ? link.label : undefined}
                  className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${collapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5'}
                    ${isActive
                      ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>
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
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-white rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shrink-0 shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-slate-500 truncate">Administrator</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 rounded-xl text-xs font-medium hover:bg-red-500/10 hover:text-red-400 transition-all">
                  <LogOutIcon size={14} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center p-2 rounded-xl mb-1" title={`${user?.firstName} ${user?.lastName}`}>
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-white rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </div>
                <button onClick={handleLogout} className="flex justify-center w-full p-2 text-slate-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all" title="Logout">
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
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <MenuIcon size={20} />
          </button>

          <div className="flex-1 hidden sm:block max-w-md">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <BellIcon size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
            </button>
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lift">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <SettingsIcon size={14} />
                    Settings
                  </Link>
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

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><Spinner size={36} /></div>}>
            <div key={location.pathname} className="animate-page-in">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
