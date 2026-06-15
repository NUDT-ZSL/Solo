import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, PawPrint } from 'lucide-react';

const navLinks = [
  { to: '/', label: '宠物列表' },
  { to: '/pets/new', label: '新增档案' },
  { to: '/kanban', label: '领养看板' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-logo">
          <PawPrint size={24} color="#4a90d9" />
          <span>PetPal</span>
        </NavLink>

        <div className="navbar-links">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="打开菜单"
        >
          <Menu size={24} />
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="mobile-overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">菜单</span>
              <button
                className="mobile-close-btn"
                onClick={() => setMobileOpen(false)}
                aria-label="关闭菜单"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mobile-menu-links">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`mobile-nav-link ${isActive(link.to) ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
