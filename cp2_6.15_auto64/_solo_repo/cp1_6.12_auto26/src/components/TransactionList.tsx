import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  TransactionFilters,
  getCategoryColor,
  DEFAULT_CATEGORIES
} from '../types';

interface Props {
  transactions: Transaction[];
  total: number;
  allTags: string[];
  allCategories: string[];
  loading?: boolean;
  onFilter: (filters: Partial<TransactionFilters>) => Promise<void>;
  onDelete: (id: string) => Promise<boolean>;
}

const PAGE_SIZE = 10;

export default function TransactionList({
  transactions,
  total,
  allTags,
  allCategories,
  loading,
  onFilter,
  onDelete
}: Props) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    category: string;
    tag: string;
  }>({
    startDate: '',
    endDate: '',
    category: 'all',
    tag: 'all'
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = useCallback(
    (newFilters?: typeof filters, newPage?: number) => {
      const f = newFilters || filters;
      const p = newPage || 1;
      const params: Partial<TransactionFilters> = {
        page: p,
        pageSize: PAGE_SIZE
      };
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.category !== 'all') params.category = f.category;
      if (f.tag !== 'all') params.tag = f.tag;
      setPage(p);
      onFilter(params);
    },
    [filters, onFilter]
  );

  useEffect(() => {
    applyFilters(filters, 1);
  }, []);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters, 1);
  };

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    applyFilters(filters, p);
  };

  const handleReset = () => {
    const reset = { startDate: '', endDate: '', category: 'all', tag: 'all' };
    setFilters(reset);
    applyFilters(reset, 1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条记录吗？')) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const categoriesForFilter = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES.map(c => c.name), ...allCategories]);
    return Array.from(set).sort();
  }, [allCategories]);

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    const maxShow = 5;
    if (totalPages <= maxShow + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
          交易记录
          <span style={{ marginLeft: '10px', fontSize: '13px', color: '#999', fontWeight: 400 }}>
            共 {total} 条
          </span>
        </h2>
        <button
          onClick={handleReset}
          className="btn-secondary"
          style={resetBtnStyle}
        >
          重置筛选
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}
      >
        <div>
          <label style={filterLabelStyle}>开始日期</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={e => handleFilterChange('startDate', e.target.value)}
            style={filterInputStyle}
          />
        </div>
        <div>
          <label style={filterLabelStyle}>结束日期</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => handleFilterChange('endDate', e.target.value)}
            style={filterInputStyle}
          />
        </div>
        <div>
          <label style={filterLabelStyle}>分类</label>
          <select
            value={filters.category}
            onChange={e => handleFilterChange('category', e.target.value)}
            style={filterInputStyle}
          >
            <option value="all">全部分类</option>
            {categoriesForFilter.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={filterLabelStyle}>标签</label>
          <select
            value={filters.tag}
            onChange={e => handleFilterChange('tag', e.target.value)}
            style={filterInputStyle}
          >
            <option value="all">全部标签</option>
            {allTags.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8e8e8' }}>
              <th style={thStyle}>日期</th>
              <th style={thStyle}>类型</th>
              <th style={thStyle}>分类</th>
              <th style={thStyle}>金额</th>
              <th style={thStyle}>描述</th>
              <th style={thStyle}>标签</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  加载中...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  暂无记录
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => {
                const catColor = getCategoryColor(tx.category);
                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      animation: `fadeSlideIn 300ms ease ${idx * 30}ms both`
                    }}
                  >
                    <td style={tdStyle}>{tx.date}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background:
                            tx.type === 'expense' ? '#FFEBEE' : '#E8F5E9',
                          color: tx.type === 'expense' ? '#E53935' : '#43A047'
                        }}
                      >
                        {tx.type === 'expense' ? '支出' : '收入'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: catColor,
                          marginRight: '6px'
                        }}
                      />
                      {tx.category}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        color: tx.type === 'expense' ? '#E53935' : '#43A047',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {tx.type === 'expense' ? '-' : '+'}¥{tx.amount.toFixed(2)}
                    </td>
                    <td style={tdStyle}>{tx.description || '-'}</td>
                    <td style={tdStyle}>
                      {tx.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tx.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                padding: '2px 8px',
                                background: '#f0f4f8',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#666'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={deletingId === tx.id}
                        className="delete-btn"
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: deletingId === tx.id ? '#ccc' : '#FFEBEE',
                          color: '#E53935',
                          cursor: deletingId === tx.id ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          transition: 'all 200ms'
                        }}
                      >
                        {deletingId === tx.id ? '...' : '删除'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f0f0f0'
          }}
        >
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="page-btn"
            style={pageBtnStyle(page === 1)}
          >
            ‹ 上一页
          </button>
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} style={{ padding: '0 4px', color: '#999' }}>
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className="page-btn"
                style={{
                  ...pageBtnStyle(false),
                  minWidth: '36px',
                  padding: '6px 10px',
                  background: p === page ? '#4A90D9' : '#f5f5f5',
                  color: p === page ? '#fff' : '#555',
                  fontWeight: p === page ? 600 : 400
                }}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="page-btn"
            style={pageBtnStyle(page === totalPages)}
          >
            下一页 ›
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 600,
  color: '#666',
  background: '#fafafa'
};

const tdStyle: React.CSSProperties = {
  padding: '14px',
  fontSize: '14px',
  color: '#333',
  verticalAlign: 'middle'
};

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#666'
};

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1.5px solid #e0e0e0',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff'
};

const resetBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1.5px solid #e0e0e0',
  background: '#fff',
  color: '#666',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 200ms'
};

const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '6px',
  border: 'none',
  background: disabled ? '#f5f5f5' : '#f5f5f5',
  color: disabled ? '#ccc' : '#555',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  transition: 'all 200ms'
});
