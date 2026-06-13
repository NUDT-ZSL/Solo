import React, { useState, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import RecipeList from './RecipeList';
import RecipeDetail from './RecipeDetail';
import SmartSearch from './SmartSearch';

const navItems = [
  { path: '/', label: '食谱列表', icon: '📖' },
  { path: '/smart', label: '智能推荐', icon: '🔍' },
];

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <>
      <nav className="navbar">
        <button className="navbar-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <span className="navbar-title">RecipeVault</span>
        <div className="navbar-avatar">R</div>
      </nav>

      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            onClick={closeSidebar}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </aside>

      <main className="main-content page-fade-in" key={location.pathname}>
        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/smart" element={<SmartSearch />} />
        </Routes>
      </main>
    </>
  );
};

export default App;
