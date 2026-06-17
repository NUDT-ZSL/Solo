import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ActivityList from '../components/ActivityList';
import { api } from '../utils/api';
import type { Activity, PaginatedResponse } from '../../shared/types';

const PAGE_SIZE = 10;

const ActivityListPage = () => {
  const [data, setData] = useState<PaginatedResponse<Activity>>({ items: [], total: 0, page: 1, size: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [registrationCounts, setRegCounts] = useState<Record<string, number>>({});

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Activity>>(`/activities?page=${page}&size=${PAGE_SIZE}`);
      setData(res);
      const counts: Record<string, number> = {};
      await Promise.all(
        res.items.map(async (a) => {
          try {
            const detail = await api.get<any>(`/activities/${a.id}`);
            counts[a.id] = detail.registrationCount || 0;
          } catch {}
        })
      );
      setRegCounts(counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const renderPager = () => {
    if (totalPages <= 1) return null;
    const pages = new Set<number>([1, totalPages, data.page, data.page - 1, data.page + 1]);
    const sorted = Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 32,
      }}>
        <button
          className="btn-secondary"
          style={{ padding: '8px 12px', minWidth: 40 }}
          disabled={data.page <= 1 || loading}
          onClick={() => load(data.page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        {sorted.map((p, i) => {
          const showGap = i > 0 && sorted[i - 1] !== p - 1;
          return (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {showGap && <span style={{ color: '#BDBDBD', padding: '0 4px' }}>...</span>}
              <button
                onClick={() => load(p)}
                disabled={loading}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: p === data.page ? '#1976D2' : '#fff',
                  color: p === data.page ? '#fff' : '#424242',
                  fontWeight: p === data.page ? 600 : 500,
                  fontSize: 13,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  cursor: p === data.page ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (p !== data.page) e.currentTarget.style.backgroundColor = '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  if (p !== data.page) e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                {p}
              </button>
            </span>
          );
        })}
        <button
          className="btn-secondary"
          style={{ padding: '8px 12px', minWidth: 40 }}
          disabled={data.page >= totalPages || loading}
          onClick={() => load(data.page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#212121', marginBottom: 6 }}>读书会活动</h1>
        <p style={{ fontSize: 14, color: '#757575' }}>
          共 <strong style={{ color: '#1976D2' }}>{data.total}</strong> 场活动，与同好共读一本好书
        </p>
      </div>

      <ActivityList
        activities={data.items}
        registrationCounts={registrationCounts}
        loading={loading}
      />

      {renderPager()}
    </div>
  );
};

export default ActivityListPage;
