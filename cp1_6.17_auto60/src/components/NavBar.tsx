import { useState } from 'react';
import type { FC } from 'react';

interface NavBarProps {
  currentView: 'courses' | 'student';
  onNavigate: (view: 'courses' | 'student') => void;
  onCreateCourse: () => void;
}

const NavBar: FC<NavBarProps> = ({ currentView, onNavigate, onCreateCourse }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'courses' as const, label: '课程列表', icon: '📚' },
    { id: 'student' as const, label: '个人面板', icon: '👤' },
  ];

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">教学助手</span>
        </div>
        <ul className="nav-list">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button className="create-course-btn" onClick={onCreateCourse}>
            <span>＋</span> 创建课程
          </button>
        </div>
      </nav>

      <header className="topbar">
        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
        <span className="topbar-title">🎓 教学助手</span>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-menu" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span>菜单</span>
              <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>✕</button>
            </div>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`mobile-nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button
              className="mobile-create-btn"
              onClick={() => {
                onCreateCourse();
                setMobileMenuOpen(false);
              }}
            >
              ＋ 创建课程
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
