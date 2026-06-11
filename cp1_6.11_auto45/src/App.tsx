import React, { useState, useEffect, useCallback } from 'react';
import Form from './Form';
import Heatmap from './Heatmap';
import type { Rating, CategoryStats, DashboardData } from './types';
import './App.css';

const CATEGORIES = ['技术协作', '创新能力', '响应速度', '文档质量', '沟通效率'];

const App: React.FC = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [simulating, setSimulating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ratings');
      const data: DashboardData = await res.json();
      setRatings(data.ratings);
      setStats(data.stats);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSubmit = async (data: { category: string; score: number; note: string }) => {
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchData();
  };

  const handleClear = async () => {
    if (!window.confirm('确定要清空所有评分数据吗？此操作不可撤销。')) {
      return;
    }
    await fetch('/api/ratings', { method: 'DELETE' });
    await fetchData();
  };

  const handleSimulate = async () => {
    if (simulating) return;
    setSimulating(true);
    for (let i = 0; i < 20; i++) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const score = Math.floor(Math.random() * 5) + 1;
      const note = `模拟评分 #${i + 1}`;
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, score, note }),
      });
      await fetchData();
      await new Promise((r) => setTimeout(r, 200));
    }
    setSimulating(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🔥 评价热流</h1>
        <p className="app-subtitle">跨部门匿名互评仪表板</p>
      </header>

      <div className="app-main">
        <div className="left-panel">
          <Form onSubmit={handleSubmit} />
        </div>

        <div className="right-panel">
          <Heatmap stats={stats} ratings={ratings} />

          <div className="toolbar">
            <button
              className="toolbar-btn clear-btn"
              onClick={handleClear}
            >
              清空所有数据
            </button>
            <button
              className="toolbar-btn simulate-btn"
              onClick={handleSimulate}
              disabled={simulating}
            >
              {simulating ? '生成中...' : '生成模拟评分'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
