import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { HamburgerButton, MobileMenuSheet, menuItemClass, glCtaClass, glSecondaryClass } from './ui';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  /* Paint blobs for the navbar logo's liquid reveal — coordinates live in a
     -inset-5 box around the logo image. */
  const NAV_BLOBS = [
    { size: 16, left: 0, top: 44, from: '-28px', color: 'bg-orange-500', delay: 0 },
    { size: 11, left: 16, top: 84, from: '-22px', color: 'bg-amber-400', delay: 0.09 },
    { size: 15, left: 122, top: 34, from: '28px', color: 'bg-orange-500', delay: 0.05 },
    { size: 10, left: 128, top: 80, from: '22px', color: 'bg-amber-400', delay: 0.14 },
    { size: 13, left: 66, top: 58, from: '0px', color: 'bg-orange-500', delay: 0.22 },
  ];

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/programs', label: 'Programs' },
    { path: '/certification', label: 'Verify' },
    { path: '/about', label: 'About' },
    { path: '/partners', label: 'Partners' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <nav className={`fixed z-50 transition-all lg:left-1/2 lg:-translate-x-1/2 lg:w-[calc(100%-3rem)] lg:max-w-6xl ${mobileOpen
        ? 'left-0 right-0 top-0 rounded-none bg-white shadow-none ring-0 duration-300'
        : `left-3 right-3 top-3 md:left-6 md:right-6 rounded-2xl duration-500 ${scrolled
          ? 'bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(255,255,255,0.3)] ring-1 ring-black/5'
          : 'bg-gradient-to-b from-white to-white/90 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]'
        }`
      }`}>
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo — liquid reveal on load: blobs merge, logo streaks in
                with smear ghosts, splash ring pops */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <svg aria-hidden="true" className="absolute h-0 w-0">
                  <defs>
                    <filter id="iq-nav-goo" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                      <feColorMatrix
                        in="blur"
                        mode="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                        result="goo"
                      />
                      <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                  </defs>
                </svg>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-5"
                  style={{ filter: 'url(#iq-nav-goo)' }}
                >
                  {NAV_BLOBS.map((b) => (
                    <span
                      key={`${b.left}-${b.top}`}
                      className={`absolute opacity-0 animate-liquid-blob ${b.color}`}
                      style={
                        {
                          width: b.size,
                          height: b.size,
                          left: b.left,
                          top: b.top,
                          borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                          animationDelay: `${b.delay}s`,
                          '--bx': b.from,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-xl border-2 border-orange-400/70 opacity-0 animate-liquid-splat"
                />

                <div
                  className="relative origin-left animate-logo-streak"
                  style={{ '--streak-x': '-80px' } as React.CSSProperties}
                >
                  {[0.56, 0.64].map((delay) => (
                    <div
                      key={delay}
                      aria-hidden="true"
                      className="absolute inset-0 opacity-0 animate-logo-trail"
                      style={{ animationDelay: `${delay}s`, '--streak-x': '-80px' } as React.CSSProperties}
                    >
                      <img
                        src="/logo/logo-full.webp"
                        alt=""
                        width={512}
                        height={418}
                        decoding="async"
                        className="h-20 md:h-24 w-auto mix-blend-multiply"
                      />
                    </div>
                  ))}
                  <img
                    src="/logo/logo-full.webp"
                    alt="IQIntern"
                    width={512}
                    height={418}
                    fetchPriority="high"
                    decoding="async"
                    className="h-20 md:h-24 w-auto mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 text-base font-semibold rounded-full transition-all duration-200 ${
                    isActive(link.path)
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user?.firstName}</span>
                  </div>
                  {user?.role === 'admin' ? (
                    <Link to="/admin" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                      Admin Panel
                    </Link>
                  ) : user?.role === 'partner' ? (
                    <Link to="/partner" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                      Partner Portal
                    </Link>
                  ) : (
                    <Link to="/student" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                      Dashboard
                    </Link>
                  )}
                  <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="px-5 py-2 text-sm font-semibold text-gray-800 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-all">
                    Login
                  </Link>
                  <Link to="/register" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <HamburgerButton
              open={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden"
            />
          </div>
        </div>
      </nav>

      {/* Mobile Menu — GlobalLogic-style full-screen sheet */}
      <MobileMenuSheet open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive(link.path) ? 'page' : undefined}
            className={menuItemClass(isActive(link.path))}
          >
            {link.label}
          </Link>
        ))}
        <div className="mt-8 flex w-full flex-wrap items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to={user?.role === 'admin' ? '/admin' : user?.role === 'partner' ? '/partner' : '/student'}
                onClick={() => setMobileOpen(false)}
                className={glCtaClass}
              >
                {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'partner' ? 'Partner Portal' : 'Dashboard'}
              </Link>
              <button type="button" onClick={handleLogout} className={glSecondaryClass}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className={glSecondaryClass}>
                Log in
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className={glCtaClass}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </MobileMenuSheet>

      {/* Spacer */}
      <div className="h-24" />
    </>
  );
}
