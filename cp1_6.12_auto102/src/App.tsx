import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOrders, fetchStats, importOrders } from './api';
import type { Order, Stats } from './api';
import Dashboard from './Dashboard';
import PickingView from './PickingView';

type FilterStatus = 'all' | 'completed' | 'pending';

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearchRef = useRef('');

  const loadOrders = useCallback(async (search?: string, status?: FilterStatus) => {
    try {
      const data = await fetchOrders({ search, status });
      setOrders(data);
    } catch (err) {
      console.error('加载订单失败:', err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadOrders(pendingSearchRef.current, filterStatus), loadStats()]);
  }, [loadOrders, loadStats, filterStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = await importOrders(text);
        if (result.failed > 0) {
          showToast(
            `导入完成：成功 ${result.success} 行，失败 ${result.failed} 行`,
            'error'
          );
        } else {
          showToast(`导入成功：共 ${result.success} 行`, 'success');
        }
        await loadAll();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '导入失败';
        showToast(msg, 'error');
      }
    };
    input.click();
  }, [loadAll, showToast]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      pendingSearchRef.current = value;
      searchTimerRef.current = setTimeout(() => {
        loadOrders(value, filterStatus);
      }, 400);
    },
    [filterStatus, loadOrders]
  );

  const handleFilterChange = useCallback(
    (status: FilterStatus) => {
      setFilterStatus(status);
      loadOrders(pendingSearchRef.current, status);
    },
    [loadOrders]
  );

  const handlePickedChange = useCallback(async () => {
    await loadStats();
    await loadOrders(pendingSearchRef.current, filterStatus);
  }, [loadStats, loadOrders, filterStatus]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">GroupBuyHub</h1>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="搜索订单号或客户名"
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => handleFilterChange(e.target.value as FilterStatus)}
          >
            <option value="all">全部</option>
            <option value="completed">已完成分拣</option>
            <option value="pending">未完成分拣</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn-import" onClick={handleImport}>
            导入订单
          </button>
        </div>
      </div>

      <div className="app-body">
        <div className="panel-left">
          <Dashboard stats={stats} />
        </div>
        <div className="panel-divider" />
        <div className="panel-right">
          <PickingView orders={orders} onPickedChange={handlePickedChange} />
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default App;
