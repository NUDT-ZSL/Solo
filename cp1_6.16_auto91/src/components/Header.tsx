import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    const rect = button.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple-effect');

    const ripple = button.getElementsByClassName('ripple-effect')[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  }

  function handleLogout(e: React.MouseEvent<HTMLButtonElement>) {
    createRipple(e);
    setTimeout(() => {
      onLogout();
      navigate('/');
    }, 150);
  }

  return (
    <header className="header">
      <div className="header-inner container">
        <Link to="/" className="logo">
          <span className="logo-icon">♪</span>
          <span className="logo-text">乐鉴</span>
        </Link>

        <nav className="nav-desktop">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            首页
          </Link>
          <Link to="/upload" className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}>
            上传鉴定
          </Link>
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-avatar-btn ripple-container"
                onClick={(e) => {
                  createRipple(e);
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <div className="user-avatar">
                  {user.username.charAt(0)}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">
                    个人中心
                  </Link>
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button
                className="btn btn-secondary ripple-container"
                onClick={(e) => {
                  createRipple(e);
                  navigate('/login');
                }}
              >
                登录
              </button>
              <button
                className="btn btn-primary ripple-container"
                onClick={(e) => {
                  createRipple(e);
                  navigate('/register');
                }}
              >
                注册
              </button>
            </div>
          )}

          <button
            className={`hamburger-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          <nav className="mobile-nav">
            <Link to="/" className="mobile-nav-link">
              首页
            </Link>
            <Link to="/upload" className="mobile-nav-link">
              上传鉴定
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="mobile-nav-link">
                  个人中心
                </Link>
                <button
                  className="mobile-nav-link logout-mobile"
                  onClick={(e) => {
                    createRipple(e);
                    onLogout();
                    navigate('/');
                  }}
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-nav-link">
                  登录
                </Link>
                <Link to="/register" className="mobile-nav-link">
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
