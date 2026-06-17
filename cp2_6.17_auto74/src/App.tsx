import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Borrow from './pages/Borrow';
import MyBorrows from './pages/MyBorrows';
import AdminRepairs from './pages/AdminRepairs';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: '工具大厅', icon: '🏠' },
    { to: '/my-borrows', label: '我的借用', icon: '📋' },
    { to: '/admin/repairs', label: '维修管理', icon: '🔧' },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span className="navbar-logo-icon">🔨</span>
            <span>共享工坊</span>
          </div>

          <div className="navbar-menu">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `navbar-link ${isActive ? 'active' : ''}`
                }
              >
                <span style={{ marginRight: 4 }}>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>

          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `navbar-link ${isActive ? 'active' : ''}`
            }
            onClick={handleNavClick}
          >
            <span style={{ marginRight: 8 }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </div>

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/borrow/:toolId" element={<Borrow />} />
          <Route path="/my-borrows" element={<MyBorrows />} />
          <Route path="/admin/repairs" element={<AdminRepairs />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
