import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'px-4 py-2 rounded-lg transition-all duration-250 relative',
      'hover:bg-white/40 hover:text-[var(--color-primary-dark)]',
      isActive && 'text-[var(--color-primary-dark)] font-medium',
      isActive && 'after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-6 after:h-0.5 after:bg-[var(--color-primary)] after:rounded-full'
    );

  return (
    <nav className="sticky top-0 z-50 w-full">
      <div
        className="w-full px-4 sm:px-6 lg:px-8"
        style={{
          background: 'rgba(255, 251, 245, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(139, 126, 200, 0.18)',
        }}
      >
        <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 group">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="transition-transform duration-300 group-hover:scale-110"
            >
              <rect x="2" y="7" width="28" height="20" rx="3" fill="url(#envelope-grad)" />
              <path d="M2 9L16 19L30 9" stroke="#FFFBF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 7L16 14L25 7" stroke="#FFFBF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              <defs>
                <linearGradient id="envelope-grad" x1="2" y1="7" x2="30" y2="27" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8B7EC8" />
                  <stop offset="1" stopColor="#D4A574" />
                </linearGradient>
              </defs>
            </svg>
            <span
              className="text-xl font-bold tracking-wide"
              style={{
                fontFamily: 'var(--font-family-serif)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              时光信件
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass}>
              首页
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/create" className={navLinkClass}>
                  写信
                </NavLink>
                <NavLink to="/dashboard" className={navLinkClass}>
                  个人面板
                </NavLink>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg glass-button text-[var(--color-text-secondary)] hover:text-[var(--color-primary-dark)]"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all duration-250 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                  }}
                >
                  注册
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  你好，<span className="font-medium text-[var(--color-primary-dark)]">{user?.username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg glass-button text-[var(--color-text-secondary)] hover:text-red-500"
                >
                  登出
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg glass-button"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden px-4 py-4 mx-4 mt-2 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: 'rgba(255, 251, 245, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 126, 200, 0.2)',
            boxShadow: 'var(--shadow-glass-lg)',
          }}
        >
          <div className="flex flex-col gap-1">
            <NavLink
              to="/"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'px-4 py-3 rounded-xl transition-all',
                  isActive ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] font-medium' : 'hover:bg-white/50'
                )
              }
            >
              首页
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink
                  to="/create"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-3 rounded-xl transition-all',
                      isActive ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] font-medium' : 'hover:bg-white/50'
                    )
                  }
                >
                  写信
                </NavLink>
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-3 rounded-xl transition-all',
                      isActive ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] font-medium' : 'hover:bg-white/50'
                    )
                  }
                >
                  个人面板
                </NavLink>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              {!isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-xl text-center glass-button text-[var(--color-text-secondary)]"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-xl text-center text-white font-medium"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    }}
                  >
                    注册
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-xl text-center glass-button text-red-500 font-medium"
                >
                  登出
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
