import { Routes, Route, NavLink } from 'react-router-dom';
import { useState } from 'react';
import HomePage from './pages/HomePage';
import StatsPage from './pages/StatsPage';
import CreateHabitModal from './components/CreateHabitModal';
import type { Habit } from './types';
import { createHabit } from './api/habits';

export default function App() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateHabit = async (habit: Omit<Habit, 'id' | 'createdAt'>) => {
    await createHabit(habit);
    setShowCreateModal(false);
    window.dispatchEvent(new CustomEvent('habit:created'));
  };

  return (
    <>
      <nav className="nav-bar">
        <div className="logo">
          <div className="logo-icon">🔥</div>
          <span>HabitFlow</span>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索习惯..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              window.dispatchEvent(new CustomEvent('habit:search', { detail: e.target.value }));
            }}
          />
        </div>

        <div className="nav-actions">
          <NavLink to="/" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            🏠 首页
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            📊 统计
          </NavLink>
          <button
            className="add-habit-btn"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            + 新建
          </button>
          <div className="user-avatar">U</div>
        </div>
      </nav>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage onAddClick={() => setShowCreateModal(true)} />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>

      {showCreateModal && (
        <CreateHabitModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateHabit}
        />
      )}
    </>
  );
}
