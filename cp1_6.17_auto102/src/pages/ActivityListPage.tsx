import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import ActivityList from '../components/ActivityList';
import { api } from '../utils/api';
import type { ActivityListItem, PaginatedResponse } from '../../shared/types';

const PAGE_SIZE = 10;

const ActivityListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get('date') || '';
  const [data, setData] = useState<PaginatedResponse<ActivityListItem>>({ items: [], total: 0, page: 1, size: PAGE_SIZE });
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const dateParam = dateFilter ? `&date=${dateFilter}` : '';
      const res = await api.get<PaginatedResponse<ActivityListItem>>(
        `/activities?page=${page}&size=${PAGE_SIZE}${dateParam}`
      );
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [dateFilter]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const clearDateFilter = () => {
    searchParams.delete('date');
    setSearchParams(searchParams);
  };

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
          共 <strong style={{ color: '#1976D2' }}>{data.total}</strong> 场活动{dateFilter ? `（筛选日期：${dateFilter}）` : ''}，与同好共读一本好书
        </p>
        {dateFilter && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            padding: '8px 14px',
            backgroundColor: '#E3F2FD',
            color: '#1565C0',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
          }}>
            <Filter size={14} />
            <span>筛选日期：{dateFilter}</span>
            <button
              onClick={clearDateFilter}
              style={{
                marginLeft: 6,
                padding: '2px 8px',
                backgroundColor: '#fff',
                color: '#1565C0',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      <ActivityList
        activities={data.items}
        loading={loading}
      />

      {renderPager()}
    </div>
  );
};

export default ActivityListPage;
