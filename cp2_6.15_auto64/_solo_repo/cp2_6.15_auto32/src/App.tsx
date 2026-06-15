import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import PlanningModule from './planning/PlanningModule';
import TrackingModule from './tracking/TrackingModule';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-container">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="菜单"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">📚</span>
          <h2 className="sidebar-title">学习路径</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">🗺️</span>
            <span className="nav-label">学习路径</span>
          </NavLink>
          <NavLink
            to="/tracking"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">进度追踪</span>
          </NavLink>
        </nav>
      </aside>

      <main className="content-area">
        <Routes>
          <Route path="/" element={<PlanningModule />} />
          <Route path="/tracking" element={<TrackingModule />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
