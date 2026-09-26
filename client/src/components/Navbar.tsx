import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/programs', label: 'Programs' },
    { path: '/certification', label: 'Verify' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <nav className={`fixed top-3 left-3 right-3 md:left-6 md:right-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-[calc(100%-3rem)] lg:max-w-6xl z-50 rounded-2xl transition-all duration-500 ${scrolled
        ? 'bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1),inset_0_1px 0_rgba(255,255,255,0.7),inset_0_-1px 0_rgba(255,255,255,0.3)] ring-1 ring-black/5'
        : 'bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px 0_rgba(255,255,255,0.9)]'
      }`}>
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo/logo-full.png"
                alt="IQIntern"
                className="h-20 md:h-24 w-auto mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
              />
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
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                  ) : (
                    <Link to="/student" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                      Dashboard
                    </Link>
                  )}
                  <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-all">
                    Login
                  </Link>
                  <Link to="/register" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-5 flex flex-col gap-1.5">
                <span className={`block h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
                <span className={`block h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${mobileOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileOpen(false)} />
        <div className={`absolute top-16 left-4 right-4 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden transition-all duration-300 ${mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="p-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  isActive(link.path) ? 'text-orange-600 bg-orange-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link to={user?.role === 'admin' ? '/admin' : '/student'} onClick={() => setMobileOpen(false)} className="block w-full py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl">
                  {user?.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                </Link>
                <button onClick={handleLogout} className="block w-full py-2.5 text-center text-sm font-medium text-gray-500 hover:text-red-500 rounded-xl">
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full py-2.5 text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block w-full py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-24" />
    </>
  );
}
