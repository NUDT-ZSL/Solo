import { useState, useEffect, useCallback, useRef } from 'react';
import { DataSource, createInitialDataSource, generateId, fetchDataSource } from './utils/fetchData';
import { loadOrderFromStorage, saveOrderToStorage, reorderItems } from './utils/sortableUtils';
import DashboardGrid from './DashboardGrid';
import DataSourceModal from './DataSourceModal';

const defaultDataSources: DataSource[] = [
  createInitialDataSource('ds_stock_1', '股票价格 - AAPL', 'stock', 2),
  createInitialDataSource('ds_traffic_1', '网站访问量', 'traffic', 2),
  createInitialDataSource('ds_sensor_1', '温度传感器', 'sensor', 3),
  createInitialDataSource('ds_progress_1', '项目进度', 'progress', 5),
  createInitialDataSource('ds_revenue_1', '今日营收', 'revenue', 2),
  createInitialDataSource('ds_users_1', '在线用户数', 'users', 2)
];

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export default function App() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const intervalRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pendingUpdates = useRef<Map<string, { value: number; history: number[] }>>(new Map());
  const rafRef = useRef<number | null>(null);
  const dataSourceRefs = useRef<Map<string, DataSource>>(new Map());

  useEffect(() => {
    dataSources.forEach(ds => {
      dataSourceRefs.current.set(ds.id, ds);
    });
  }, [dataSources]);

  useEffect(() => {
    const ordered = loadOrderFromStorage(defaultDataSources);
    setDataSources(ordered);
  }, []);

  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0) {
      rafRef.current = null;
      return;
    }

    const updates = new Map(pendingUpdates.current);
    pendingUpdates.current.clear();

    setDataSources(prev => {
      let hasChanges = false;
      const next: DataSource[] = new Array(prev.length);
      
      for (let i = 0; i < prev.length; i++) {
        const ds = prev[i];
        const update = updates.get(ds.id);
        
        if (!update) {
          next[i] = ds;
          continue;
        }

        const valueChanged = update.value !== ds.value;
        let historyChanged = false;
        
        if (update.history.length === ds.history.length) {
          for (let j = 0; j < update.history.length; j++) {
            if (update.history[j] !== ds.history[j]) {
              historyChanged = true;
              break;
            }
          }
        } else {
          historyChanged = true;
        }

        if (valueChanged || historyChanged) {
          hasChanges = true;
          next[i] = {
            ...ds,
            value: valueChanged ? update.value : ds.value,
            history: historyChanged ? update.history : ds.history
          };
        } else {
          next[i] = ds;
        }
      }

      return hasChanges ? next : prev;
    });

    rafRef.current = requestAnimationFrame(flushPendingUpdates);
  }, []);

  const refreshDataSource = useCallback(async (id: string) => {
    const currentDs = dataSourceRefs.current.get(id);
    if (!currentDs) return;

    try {
      const newValue = await fetchDataSource(currentDs.id, currentDs.name, currentDs.type, currentDs.value);
      
      const newHistory = currentDs.history.slice();
      newHistory.shift();
      newHistory.push(newValue);

      if (newValue === currentDs.value && arraysEqual(newHistory, currentDs.history)) {
        return;
      }

      const existing = pendingUpdates.current.get(id);
      if (existing) {
        existing.value = newValue;
        existing.history = newHistory;
      } else {
        pendingUpdates.current.set(id, { value: newValue, history: newHistory });
      }

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushPendingUpdates);
      }
    } catch {
      // ignore fetch errors
    }
  }, [flushPendingUpdates]);

  useEffect(() => {
    dataSources.forEach(ds => {
      if (!intervalRefs.current.has(ds.id)) {
        const interval = setInterval(() => {
          refreshDataSource(ds.id);
        }, ds.refreshInterval * 1000);
        intervalRefs.current.set(ds.id, interval);
      }
    });

    const existingIds = new Set(dataSources.map(ds => ds.id));
    intervalRefs.current.forEach((interval, id) => {
      if (!existingIds.has(id)) {
        clearInterval(interval);
        intervalRefs.current.delete(id);
      }
    });

    return () => {
      // cleanup handled in separate effect
    };
  }, [dataSources, refreshDataSource]);

  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setDataSources(prev => {
      const reordered = reorderItems(prev, fromIndex, toIndex);
      saveOrderToStorage(reordered);
      return reordered;
    });
  }, []);

  const handleAddDataSource = useCallback((newDataSource: DataSource) => {
    setDataSources(prev => {
      const updated = [...prev, newDataSource];
      saveOrderToStorage(updated);
      return updated;
    });
    dataSourceRefs.current.set(newDataSource.id, newDataSource);
    setNewItemId(newDataSource.id);
    setTimeout(() => setNewItemId(null), 500);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#f0f6fc',
      fontFamily: "'Courier New', monospace"
    }}>
      <header style={{
        height: 56,
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #58a6ff, #1f6feb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(88, 166, 255, 0.5)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <span style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#f0f6fc',
            letterSpacing: 1
          }}>
            PulseBoard
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            width: 160,
            height: 40,
            borderRadius: 8,
            backgroundColor: '#238636',
            color: '#ffffff',
            border: 'none',
            fontSize: 14,
            fontFamily: "'Courier New', monospace",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2ea043';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(46, 160, 67, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#238636';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加数据源
        </button>
      </header>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(88, 166, 255, 0.5);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 30px rgba(88, 166, 255, 0.8), 0 0 60px rgba(88, 166, 255, 0.3);
          }
        }
      `}</style>

      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          fontSize: 13,
          color: '#8b949e',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#3fb950',
            animation: 'pulse 2s ease-in-out infinite'
          }}></span>
          实时监控中 · 共 {dataSources.length} 个数据源
        </div>

        <DashboardGrid
          dataSources={dataSources}
          onReorder={handleReorder}
          newItemId={newItemId}
        />
      </main>

      <DataSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddDataSource}
        generateId={generateId}
        createInitialDataSource={createInitialDataSource}
      />
    </div>
  );
}
