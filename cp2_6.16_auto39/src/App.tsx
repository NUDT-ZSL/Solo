import { useState, useEffect, useCallback } from 'react';
import RecordPanel from './components/RecordPanel';
import Dashboard from './components/Dashboard';
import { getStats, StatsResponse } from './api';
import './styles/global.css';

export type ViewMode = 'dashboard' | 'weekly' | 'monthly';

function App() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRecordSubmitted = useCallback(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">💪</span>
          智能健身日志分析
        </h1>
        <div className="view-tabs">
          <button
            className={`tab-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setViewMode('dashboard')}
          >
            总览
          </button>
          <button
            className={`tab-btn ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => setViewMode('weekly')}
          >
            周报
          </button>
          <button
            className={`tab-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            月报
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <main className="app-main">
        <RecordPanel
          exerciseTypes={stats?.exerciseTypes || []}
          onSubmitted={handleRecordSubmitted}
        />
        <Dashboard
          loading={loading}
          stats={stats}
          viewMode={viewMode}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          onCloseTypePanel={() => setSelectedType(null)}
        />
      </main>
    </div>
  );
}

export default App;
