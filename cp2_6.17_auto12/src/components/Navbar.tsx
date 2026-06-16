import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? 700 : 400,
    borderBottom: isActive ? '3px solid #8b5cf6' : '3px solid transparent',
    paddingBottom: '19px',
    paddingTop: '19px'
  });

  const styles = `
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #ffffff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      padding: 0 32px;
      z-index: 100;
    }
    .navbar-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #8b5cf6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }
    .navbar-links {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-left: 32px;
      flex: 1;
    }
    .navbar-links a {
      color: #374151;
      font-size: 15px;
      transition: color 0.2s ease;
    }
    .navbar-links a:hover {
      color: #8b5cf6;
    }
    .navbar-user {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .navbar-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #8b5cf6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }
    .navbar-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .navbar-btn-primary {
      background: #8b5cf6;
      color: white;
    }
    .navbar-btn-primary:hover {
      background: #7c3aed;
    }
    .navbar-btn-ghost {
      color: #374151;
    }
    .navbar-btn-ghost:hover {
      background: #f3f4f6;
    }
    .navbar-hamburger {
      display: none;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      cursor: pointer;
    }
    .navbar-hamburger span {
      width: 24px;
      height: 2px;
      background: #374151;
      border-radius: 1px;
      transition: all 0.2s ease;
    }
    .mobile-menu {
      display: none;
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 16px;
      flex-direction: column;
      gap: 12px;
    }
    .mobile-menu a {
      padding: 10px 12px;
      border-radius: 6px;
      color: #374151;
    }
    .mobile-menu a.active {
      background: #faf5ff;
      color: #8b5cf6;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .navbar {
        padding: 0 16px;
        justify-content: space-between;
      }
      .navbar-links,
      .navbar-user {
        display: none;
      }
      .navbar-hamburger {
        display: flex;
      }
      .mobile-menu.open {
        display: flex;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <nav className="navbar">
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="navbar-logo">墨</div>
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" style={navLinkStyle} end>
            首页
          </NavLink>
          <NavLink to="/books" style={navLinkStyle}>
            图书
          </NavLink>
          <NavLink to="/activities" style={navLinkStyle}>
            读书会
          </NavLink>
          {user && (
            <NavLink to="/bookshelf" style={navLinkStyle}>
              我的书架
            </NavLink>
          )}
        </div>
        <div className="navbar-user">
          {user ? (
            <>
              <NavLink to="/bookshelf">
                <div className="navbar-avatar">
                  {user.nickname.charAt(0)}
                </div>
              </NavLink>
              <button className="navbar-btn navbar-btn-ghost" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">
                <button className="navbar-btn navbar-btn-ghost">登录</button>
              </NavLink>
              <NavLink to="/register">
                <button className="navbar-btn navbar-btn-primary">注册</button>
              </NavLink>
            </>
          )}
        </div>
        <div
          className="navbar-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </div>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <NavLink
          to="/"
          end
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          首页
        </NavLink>
        <NavLink
          to="/books"
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          图书
        </NavLink>
        <NavLink
          to="/activities"
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          读书会
        </NavLink>
        {user && (
          <NavLink
            to="/bookshelf"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            我的书架
          </NavLink>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: '15px',
              color: '#ef4444'
            }}
          >
            退出登录
          </button>
        ) : (
          <>
            <NavLink to="/login" onClick={() => setMenuOpen(false)}>
              登录
            </NavLink>
            <NavLink to="/register" onClick={() => setMenuOpen(false)}>
              注册
            </NavLink>
          </>
        )}
      </div>
    </>
  );
}
