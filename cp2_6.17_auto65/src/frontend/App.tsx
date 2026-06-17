import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import FilmsPage from './pages/FilmsPage.js';
import FilmDetailPage from './pages/FilmDetailPage.js';
import Dashboard from './pages/Dashboard.js';

const App: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo" onClick={() => navigate('/')}>🎬 电影节</div>
        <div className="navbar-nav">
          <NavLink to="/films" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            影片列表
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            数据分析
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <div className="container">
          <Routes>
            <Route path="/" element={<FilmsPage />} />
            <Route path="/films" element={<FilmsPage />} />
            <Route path="/film/:id" element={<FilmDetailPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </main>
    </>
  );
};

export default App;
