import React, { useState, useMemo } from 'react';
import { useInventory } from '../App';
import type { InventoryItem } from '../App';

type SortKey = 'name' | 'category' | 'storage_area' | 'quantity' | 'safety_stock' | 'status';
type SortDirection = 'asc' | 'desc';

const InventoryList: React.FC = () => {
  const { items, refreshData } = useInventory();

  const [sortKey, setSortKey] = useState<SortKey>('updated_at' as SortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchName, setSearchName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set).sort();
  }, [items]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleStatusFilter = (status: string) => {
    setFilterStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchName.trim()) {
      const term = searchName.trim().toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(term));
    }

    if (filterCategory) {
      result = result.filter((i) => i.category === filterCategory);
    }

    if (filterStatuses.length > 0) {
      result = result.filter((i) => filterStatuses.includes(i.status));
    }

    result.sort((a, b) => {
      let valA: string | number = a[sortKey as keyof InventoryItem] as string | number;
      let valB: string | number = b[sortKey as keyof InventoryItem] as string | number;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchName, filterCategory, filterStatuses, sortKey, sortDirection]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, page]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / pageSize);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pagedItems.length && pagedItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedItems.map((i) => i.id));
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 件物品吗？`)) return;
    try {
      await fetch('/api/inventory/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      setSelectedIds([]);
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchMarkInventoried = async () => {
    try {
      await fetch('/api/inventory/batch-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status: 'normal' }),
      });
      setSelectedIds([]);
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const SortArrow = ({ column }: { column: SortKey }) => {
    const isActive = sortKey === column;
    return (
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          marginLeft: 4,
          opacity: isActive ? 1 : 0.3,
          transition: 'opacity 0.2s',
        }}
      >
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          style={{
            marginBottom: -2,
            transition: 'transform 0.2s',
            transform: isActive && sortDirection === 'asc' ? 'scale(1.2)' : 'scale(1)',
            fill: isActive && sortDirection === 'asc' ? '#4a9eff' : '#6b7f94',
          }}
        >
          <path d="M5 0L10 6H0L5 0Z" />
        </svg>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          style={{
            marginTop: -2,
            transition: 'transform 0.2s',
            transform: isActive && sortDirection === 'desc' ? 'scale(1.2)' : 'scale(1)',
            fill: isActive && sortDirection === 'desc' ? '#4a9eff' : '#6b7f94',
          }}
        >
          <path d="M5 6L0 0H10L5 6Z" />
        </svg>
      </span>
    );
  };

  const columns: { key: SortKey; label: string; width?: string }[] = [
    { key: 'name', label: '物品名称', width: '22%' },
    { key: 'category', label: '类别', width: '14%' },
    { key: 'storage_area', label: '存储区域', width: '12%' },
    { key: 'quantity', label: '当前数量', width: '12%' },
    { key: 'safety_stock', label: '安全库存阈值', width: '14%' },
    { key: 'status', label: '状态', width: '14%' },
  ];

  const statusOptions = [
    { value: 'normal', label: '正常', color: '#34d399' },
    { value: 'low_stock', label: '低库存', color: '#fbbf24' },
    { value: 'critical', label: '紧急', color: '#f87171' },
    { value: 'out_of_stock', label: '缺货', color: '#ef4444' },
  ];

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find((s) => s.value === status) || statusOptions[3];
    return (
      <span
        style={{
          padding: '3px 10px',
          borderRadius: 10,
          fontSize: 12,
          background: `${config.color}15`,
          color: config.color,
          fontWeight: 500,
          display: 'inline-block',
          transition: 'background 0.3s, color 0.3s',
        }}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 700, color: '#fff' }}>库存列表</h2>

      <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
          <label style={{ fontSize: 13, color: '#8899aa', whiteSpace: 'nowrap' }}>物品名称:</label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
            placeholder="模糊搜索..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#f0f4f8',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#4a9eff'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#8899aa', whiteSpace: 'nowrap' }}>类别:</label>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#f0f4f8',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
              minWidth: 120,
            }}
          >
            <option value="">全部</option>
            {categories.map((c) => (
              <option key={c} value={c} style={{ background: '#1a2332' }}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#8899aa', whiteSpace: 'nowrap' }}>状态:</label>
          {statusOptions.map((status) => (
            <label key={status.value} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={filterStatuses.includes(status.value)}
                onChange={() => { toggleStatusFilter(status.value); setPage(1); }}
                style={{
                  accentColor: status.color,
                  width: 14,
                  height: 14,
                  cursor: 'pointer',
                }}
              />
              <span style={{ color: filterStatuses.includes(status.value) ? status.color : '#8899aa', transition: 'color 0.2s' }}>
                {status.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="glass-card" style={{
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(251, 146, 60, 0.08)',
          borderColor: 'rgba(251, 146, 60, 0.3)',
        }}>
          <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500 }}>
            已选中 {selectedIds.length} 项
          </span>
          <button
            onClick={handleBatchMarkInventoried}
            style={{
              padding: '6px 14px',
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 6,
              color: '#34d399',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52, 211, 153, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52, 211, 153, 0.15)'; }}
          >
            批量标记已盘点
          </button>
          <button
            onClick={handleBatchDelete}
            style={{
              padding: '6px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 6,
              color: '#ef4444',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
          >
            批量删除
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{
              padding: '6px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#8899aa',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f4f8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8899aa'; }}
          >
            取消选择
          </button>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                width: 40,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <input
                  type="checkbox"
                  checked={pagedItems.length > 0 && selectedIds.length === pagedItems.length}
                  onChange={toggleSelectAll}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4a9eff' }}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#8899aa',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    width: col.width,
                    userSelect: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f0f4f8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8899aa'; }}
                >
                  {col.label}
                  <SortArrow column={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ padding: 40, textAlign: 'center', color: '#6b7f94', fontSize: 14 }}>
                  暂无数据
                </td>
              </tr>
            ) : (
              pagedItems.map((item) => (
                <tr
                  key={item.id}
                  className={selectedIds.includes(item.id) ? 'selected' : ''}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.15s',
                    background: selectedIds.includes(item.id) ? 'rgba(251, 146, 60, 0.06)' : undefined,
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4a9eff' }}
                    />
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: '#f0f4f8' }}>{item.name}</td>
                  <td style={{ padding: '12px', fontSize: 14, color: '#8899aa' }}>{item.category}</td>
                  <td style={{ padding: '12px', fontSize: 14, color: '#8899aa' }}>{item.storage_area}</td>
                  <td style={{ padding: '12px', fontSize: 14, color: item.quantity < item.safety_stock ? '#ef4444' : '#f0f4f8', fontWeight: item.quantity < item.safety_stock ? 600 : 400 }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: '#8899aa' }}>{item.safety_stock}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(item.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.08)',
              color: page === 1 ? '#4a5a6a' : '#8899aa',
              fontSize: 13,
              transition: 'all 0.15s',
            }}
          >
            上一页
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: page === pageNum ? '#4a9eff' : 'rgba(255,255,255,0.08)',
                  color: page === pageNum ? '#fff' : '#8899aa',
                  fontSize: 13,
                  minWidth: 36,
                  transition: 'all 0.15s',
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.08)',
              color: page === totalPages ? '#4a5a6a' : '#8899aa',
              fontSize: 13,
              transition: 'all 0.15s',
            }}
          >
            下一页
          </button>
          <span style={{ color: '#6b7f94', fontSize: 12, marginLeft: 12 }}>
            共 {filteredAndSortedItems.length} 条
          </span>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
