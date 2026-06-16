import { useState, useEffect } from 'react';
import { ScheduleBoard } from '@/components/ScheduleBoard';
import { InventoryPanel } from '@/components/InventoryPanel';
import { appDataStore, type AppState } from '@/DataStore';
import '@/styles.css';

export default function App() {
  const [showDebug, setShowDebug] = useState(false);
  const [stateSnapshot, setStateSnapshot] = useState<AppState | null>(null);

  useEffect(() => {
    refreshSnapshot();
    return appDataStore.subscribe(refreshSnapshot);
  }, []);

  const refreshSnapshot = () => {
    setStateSnapshot(appDataStore.getState());
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="logo-icon">🍳</span>
            共享厨房
          </h1>
          <p className="app-subtitle">社区厨房协作管理平台</p>
        </div>
        <button
          className="debug-toggle"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? '隐藏调试' : '调试面板'}
        </button>
      </header>

      <main className="app-main">
        <section className="main-left">
          <ScheduleBoard from={appDataStore} />
        </section>
        <section className="main-right">
          <InventoryPanel from={appDataStore} />
        </section>
      </main>

      {showDebug && stateSnapshot && (
        <div className="debug-panel">
          <h3>数据状态快照</h3>
          <pre>{JSON.stringify(stateSnapshot, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
