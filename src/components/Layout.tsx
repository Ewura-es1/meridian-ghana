import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, unreadNotifications, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'editor' ? '/editor' : '/dashboard';
  const dashboardLabel =
    user?.role === 'admin'
      ? 'Admin Console'
      : user?.role === 'editor'
      ? 'Editor Queue'
      : 'My Dashboard';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-0.5 border-b-2 ${
      isActive
        ? 'text-[#0f294a] border-[#0d9488]'
        : 'text-slate-600 border-transparent hover:text-[#0f294a] hover:border-slate-300'
    }`;

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 overflow-x-clip">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#0f294a] whitespace-nowrap shrink-0 py-2"
          >
            Meridian Ghana
          </Link>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/internships" className={navLinkClass}>
              Find Internships
            </NavLink>
            <NavLink to="/regions" className={navLinkClass}>
              Ghana Regions
            </NavLink>
            <NavLink to={dashboardPath} className={navLinkClass}>
              {dashboardLabel}
            </NavLink>
            <NavLink to="/documents" className={navLinkClass}>
              My Documents
            </NavLink>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="hidden md:flex items-center shrink-0 relative">
            {!user ? (
              <Link
                to="/login"
                className="px-4 py-2 min-h-[40px] inline-flex items-center text-sm font-medium text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="px-3.5 py-2 min-h-[40px] text-sm font-medium text-[#0f294a] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-[#0d9488]" aria-hidden="true" />
                  <span className="max-w-[140px] truncate">{user.full_name.split(' ')[0]}</span>
                  {unreadNotifications > 0 && (
                    <span className="font-mono text-xs tabular-nums text-[#0d9488] font-semibold">
                      ({unreadNotifications})
                    </span>
                  )}
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-500 capitalize">Role: {user.role}</p>
                    </div>
                    <Link
                      to={dashboardPath}
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>{dashboardLabel}</span>
                      {unreadNotifications > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-[#0d9488]">
                          <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                    {user.role === 'applicant' && (
                      <Link
                        to="/documents"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        My Documents
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 mt-1 border-t border-slate-100"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile quick action + menu toggle (>= 44px touch target) */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {user && unreadNotifications > 0 && (
              <Link
                to={dashboardPath}
                onClick={() => setMobileOpen(false)}
                aria-label={`${unreadNotifications} unread notifications`}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1 px-2 rounded-lg text-xs font-mono tabular-nums font-semibold text-[#0d9488] hover:bg-slate-100"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {unreadNotifications}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto shadow-lg"
          >
            {user && (
              <div className="px-3 py-2.5 mb-2 rounded-lg bg-[#f4f6f9] border border-slate-200">
                <p className="text-sm font-semibold text-[#0f294a] truncate">{user.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">Signed in · {user.role}</p>
              </div>
            )}
            <NavLink
              to="/"
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/internships"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              Find Internships
            </NavLink>
            <NavLink
              to="/regions"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              Ghana Regions
            </NavLink>
            <NavLink
              to="/categories"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              Categories
            </NavLink>
            <NavLink
              to={dashboardPath}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              <span>{dashboardLabel}</span>
              {user && unreadNotifications > 0 && (
                <span className="font-mono text-xs tabular-nums text-[#0d9488] font-semibold">
                  {unreadNotifications} unread
                </span>
              )}
            </NavLink>
            <NavLink
              to="/documents"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              My Documents
            </NavLink>
            <div className="pt-2 mt-2 border-t border-slate-100">
              {!user ? (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg"
                >
                  Sign In
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-left text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign Out ({user.full_name})
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 min-w-0">{children}</main>

      <footer className="bg-[#091a32] text-slate-300 border-t border-slate-800 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base sm:text-lg">
                <ShieldCheck className="w-5 h-5 text-[#0d9488] shrink-0" aria-hidden="true" />
                <span>Meridian Youth Internship Registry</span>
              </div>
              <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                A Ghana-focused internship discovery and private application document support registry serving applicants across all 16 administrative regions. Configurable institutional branding placeholder.
              </p>
              <p className="text-xs text-slate-400">
                Sample listings marked [DEMO] are for demonstration only and do not represent official government endorsements or active vacancies for named institutions.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Explore Ghana</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link to="/internships" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    Find Internships
                  </Link>
                </li>
                <li>
                  <Link to="/regions" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    16 Ghana Regions
                  </Link>
                </li>
                <li>
                  <Link to="/categories" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    Industry Categories
                  </Link>
                </li>
                <li>
                  <Link to="/documents" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    Document Review Vault
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Governance & Support</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link to="/about" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    About the Registry
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    Privacy Policy (Act 843 Notice)
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="inline-flex items-center min-h-[40px] hover:text-white transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Meridian Youth Internship Registry (Ghana). All rights reserved.</p>
            <p>Private document storage · Ghana-only eligibility verified by administrators</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
