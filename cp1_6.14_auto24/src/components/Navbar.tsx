import React, { useEffect, useState } from 'react';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface NavbarProps {
  active: string;
  onNavigate: (key: string) => void;
  username: string;
  avatar: string;
  isAdmin: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ active, onNavigate, username, avatar, isAdmin, onLogout }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const items: NavItem[] = [
    { key: 'home', label: '首页', icon: '🏠' },
    { key: 'library', label: '书库', icon: '📚' },
    { key: 'dashboard', label: '我的', icon: '📊' },
    { key: 'votes', label: '投票', icon: '🗳️' },
  ];

  if (isAdmin) {
    items.push({ key: 'admin', label: '管理', icon: '⚙️' });
  }

  if (isMobile) {
    return (
      <nav className="navbar mobile-navbar">
        <ul className="nav-list">
          {items.map((item) => (
            <li
              key={item.key}
              className={`nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </li>
          ))}
          <li className="nav-item" onClick={onLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">退出</span>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="brand-icon">📖</span>
        <span className="brand-text">ReadCircle</span>
      </div>
      <div className="nav-user">
        <img src={avatar} alt={username} className="nav-avatar" />
        <div className="nav-username">{username}</div>
      </div>
      <ul className="nav-list">
        {items.map((item) => (
          <li
            key={item.key}
            className={`nav-item ${active === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </li>
        ))}
      </ul>
      <button className="logout-btn" onClick={onLogout}>退出登录</button>
    </nav>
  );
};

export default Navbar;
