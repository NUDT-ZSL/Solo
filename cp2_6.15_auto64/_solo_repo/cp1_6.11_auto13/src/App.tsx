import { useState, useEffect, useCallback } from 'react';
import CapsuleList from './pages/CapsuleList';
import CreateCapsule from './pages/CreateCapsule';
import CapsuleDetail from './pages/CapsuleDetail';
import type { Capsule } from './types';

type Page = 'list' | 'create' | 'detail';

export default function App() {
  const [page, setPage] = useState<Page>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCapsules = useCallback(async () => {
    try {
      const res = await fetch('/api/capsules');
      if (res.ok) {
        const data = await res.json();
        setCapsules(data);
      }
    } catch (err) {
      console.error('Failed to fetch capsules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  const goToList = useCallback(() => {
    setPage('list');
    setSelectedId(null);
    fetchCapsules();
  }, [fetchCapsules]);

  const goToCreate = useCallback(() => {
    setPage('create');
  }, []);

  const goToDetail = useCallback((id: string) => {
    setSelectedId(id);
    setPage('detail');
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title" onClick={goToList} style={{ cursor: 'pointer' }}>
          <span className="title-icon">✉️</span>
          时光信使
        </h1>
        {page !== 'create' && (
          <button className="nav-btn" onClick={goToCreate}>
            + 新胶囊
          </button>
        )}
        {page !== 'list' && (
          <button className="nav-btn back-btn" onClick={goToList}>
            ← 返回
          </button>
        )}
      </header>
      <main className="app-main">
        {loading && <div className="loading">加载中...</div>}
        {!loading && page === 'list' && (
          <CapsuleList
            capsules={capsules}
            onSelect={goToDetail}
            onRefresh={fetchCapsules}
          />
        )}
        {page === 'create' && <CreateCapsule onCreated={goToList} />}
        {page === 'detail' && selectedId && (
          <CapsuleDetail id={selectedId} onBack={goToList} onDeleted={goToList} />
        )}
      </main>
    </div>
  );
}
