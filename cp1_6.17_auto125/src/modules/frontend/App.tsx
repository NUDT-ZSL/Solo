import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Coffee, Clock, BarChart3 } from 'lucide-react';
import BrewForm from './BrewForm';
import History from './History';
import Stats from './Stats';

const navItems = [
  { to: '/', icon: Coffee, label: '记录' },
  { to: '/history', icon: Clock, label: '历史' },
  { to: '/stats', icon: BarChart3, label: '统计' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <div className="header-inner">
            <Coffee size={28} color="#6B4226" />
            <h1 className="header-title">手冲咖啡日志</h1>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<BrewForm />} />
            <Route path="/history" element={<History />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>

        <nav className="bottom-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <Icon size={22} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  );
}
