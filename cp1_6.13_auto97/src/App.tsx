import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EntryPage from './pages/EntryPage';
import SearchPage from './pages/SearchPage';

const NAV_ITEMS = [
  {
    to: '/',
    label: '仪表盘',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/entry',
    label: '记录',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    to: '/search',
    label: '搜索',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
];

const ExportButton: React.FC = () => {
  const handleExport = async () => {
    try {
      const res = await fetch('/api/entries/all');
      const allEntries = await res.json();
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const monthEntries = allEntries.filter((e: { date: string }) => e.date.startsWith(monthStr));
      const monthMoods = monthEntries.map((e: { mood: number }) => e.mood);
      const monthAvg =
        monthMoods.length > 0
          ? (monthMoods.reduce((a: number, b: number) => a + b, 0) / monthMoods.length).toFixed(2)
          : 'N/A';

      const dailyStats: Record<string, { moods: number[]; notes: string[] }> = {};
      monthEntries.forEach((e: { date: string; mood: number; note: string }) => {
        if (!dailyStats[e.date]) dailyStats[e.date] = { moods: [], notes: [] };
        dailyStats[e.date].moods.push(e.mood);
        if (e.note) dailyStats[e.date].notes.push(e.note);
      });

      const exportData = {
        reportMonth: monthStr,
        overallAverage: monthAvg,
        totalEntries: monthEntries.length,
        dailyBreakdown: Object.entries(dailyStats).map(([date, data]) => ({
          date,
          averageMood: (data.moods.reduce((a, b) => a + b, 0) / data.moods.length).toFixed(2),
          entryCount: data.moods.length,
          notes: data.notes,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mind-palette-report-${monthStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <button className="sidebar-export-btn" onClick={handleExport}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      导出本月报告
    </button>
  );
};

const Sidebar: React.FC = () => {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="10" r="1" fill="#6366f1" />
          <circle cx="15" cy="10" r="1" fill="#6366f1" />
        </svg>
        <span className="sidebar-title">MindPalette</span>
      </div>
      <div className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="sidebar-footer">
        <ExportButton />
      </div>
    </nav>
  );
};

const BottomTab: React.FC = () => {
  const location = useLocation();
  return (
    <nav className="bottom-tab">
      {NAV_ITEMS.map((item) => {
        const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={`bottom-tab-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

const TopBar: React.FC = () => {
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="10" r="1" fill="#6366f1" />
          <circle cx="15" cy="10" r="1" fill="#6366f1" />
        </svg>
        <span>MindPalette</span>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <TopBar />
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entry" element={<EntryPage />} />
              <Route path="/search" element={<SearchPage />} />
            </Routes>
          </main>
        </div>
        <BottomTab />
      </div>
    </BrowserRouter>
  );
};

export default App;
