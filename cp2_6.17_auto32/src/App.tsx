import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import TroupeModule from './components/TroupeModule';
import MapModule from './components/MapModule';
import AnalysisModule from './components/AnalysisModule';
import TicketModule from './components/TicketModule';
import './App.css';

const user = { role: 'admin' };

const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/troupe', label: '剧目管理', icon: '🎭' },
    { path: '/map', label: '巡演地图', icon: '🗺️' },
    { path: '/analysis', label: '数据分析', icon: '📊' },
    { path: '/tickets', label: '在线购票', icon: '🎫' },
  ];

  return (
    <nav className="navbar">
      <div className="nav-brand">巡演排期与观众洞察</div>
      <div className="nav-links">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="nav-user">
          <span className="user-role">管理员</span>
        </div>
    </nav>
  );
};

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>巡演排期与观众洞察平台</h1>
        <p>为民间戏剧团体提供一站式巡演管理解决方案</p>
      </div>
      <div className="features-grid">
        <Link to="/troupe" className="feature-card">
          <div className="feature-icon">🎭</div>
          <h3>剧目管理</h3>
          <p>高效管理多个剧目信息，支持类型筛选和搜索</p>
        </Link>
        <Link to="/map" className="feature-card">
          <div className="feature-icon">🗺️</div>
          <h3>巡演地图</h3>
          <p>可视化展示巡演路线，实时查看各站点详情</p>
        </Link>
        <Link to="/analysis" className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>数据分析</h3>
          <p>票房趋势分析，数据驱动决策</p>
        </Link>
        <Link to="/tickets" className="feature-card">
          <div className="feature-icon">🎫</div>
          <h3>在线购票</h3>
          <p>观众选座购票，电子票生成</p>
        </Link>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/troupe" element={<TroupeModule user={user} />} />
          <Route path="/map" element={<MapModule />} />
          <Route path="/analysis" element={<AnalysisModule />} />
          <Route path="/tickets" element={<TicketModule />} />
        </Routes>
      </main>
    </div>
    </Router>
  );
};

export default App;
