import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { Navigate } from 'react-router-dom';
import { getRecords, getStats } from '../api/borrowApi';
import { useBorrow } from '../hooks/useBorrow';
import { useUser } from '../context/UserContext';
import type { BorrowRecord, Stats } from '../types';

type FilterType = 'all' | 'borrowing' | 'overdue' | 'returned';

const getRecordStatusLabel = (status: BorrowRecord['status']) => {
  switch (status) {
    case 'borrowing': return '借用中';
    case 'returned-on-time': return '按时归还';
    case 'overdue-returned': return '超时归还';
    default: return status;
  }
};

export default function Admin() {
  const { user, loading: userLoading } = useUser();
  const { returnDevice, returnLoading, returnError, returnData, resetReturnState } = useBorrow();

  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsRes, statsRes] = await Promise.all([
        getRecords(),
        getStats()
      ]);
      setRecords(recordsRes.data);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (returnData) {
      loadData();
      setTimeout(() => resetReturnState(), 3000);
    }
  }, [returnData, loadData, resetReturnState]);

  const now = dayjs();

  const filteredRecords = records.filter(r => {
    const isOverdue = r.status === 'borrowing' && now.isAfter(r.expectedReturnTime);
    switch (filter) {
      case 'borrowing': return r.status === 'borrowing';
      case 'overdue': return isOverdue;
      case 'returned': return r.status !== 'borrowing';
      default: return true;
    }
  });

  const handleReturn = async (recordId: string) => {
    if (!window.confirm('确认标记该设备为已归还？')) return;
    await returnDevice(recordId);
  };

  const isOverdue = (r: BorrowRecord) => {
    return r.status === 'borrowing' && now.isAfter(r.expectedReturnTime);
  };

  if (userLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/overview" replace />;
  }

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: records.length },
    { key: 'borrowing', label: '借用中', count: stats?.activeBorrowings || 0 },
    { key: 'overdue', label: '已超时', count: stats?.overdueBorrowings || 0 },
    { key: 'returned', label: '已归还', count: records.filter(r => r.status !== 'borrowing').length }
  ];

  return (
    <div className="page-transition">
      <div className="page-header">
        <h1 className="page-title">管理面板</h1>
        <p className="page-subtitle">查看并管理所有设备借用记录</p>
      </div>

      {stats && (
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-label">设备总数</div>
            <div className="stat-value">{stats.totalDevices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">当前借用</div>
            <div className="stat-value warning">{stats.activeBorrowings}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">超时未还</div>
            <div className="stat-value danger">{stats.overdueBorrowings}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">注册用户</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">总记录数</div>
            <div className="stat-value">{stats.totalRecords}</div>
          </div>
        </div>
      )}

      <div className="admin-table-section">
        <div className="table-section-header">
          <h2 className="table-section-title">借用记录管理</h2>
          <div className="filter-tabs">
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                className={`filter-tab ${filter === opt.key ? 'active' : ''}`}
                onClick={() => setFilter(opt.key)}
              >
                {opt.label}
                <span style={{ marginLeft: '6px', opacity: 0.7 }}>({opt.count})</span>
              </button>
            ))}
          </div>
        </div>

        {returnData && (
          <div className="alert alert-success">
            <span>✓</span>
            <span>
              设备已归还！
              {returnData.isOverdue && '（超时归还，信用分 -5）'}
              {!returnData.isOverdue && '（按时归还，信用分 +1）'}
              {returnData.updatedCreditScore !== undefined && ` 当前信用分: ${returnData.updatedCreditScore}`}
            </span>
          </div>
        )}

        {returnError && (
          <div className="alert alert-error">
            <span>✗</span>
            <span>{returnError}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="alert alert-error" style={{ display: 'inline-block' }}>{error}</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">该分类下暂无记录</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="records-table">
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>借用人</th>
                  <th>借用时间</th>
                  <th>预计归还</th>
                  <th>实际归还</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => {
                  const overdue = isOverdue(record);
                  return (
                    <tr key={record.id} style={overdue ? { background: 'rgba(239, 68, 68, 0.03)' } : {}}>
                      <td style={{ fontWeight: '500' }}>{record.deviceName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: '600', fontSize: '14px'
                          }}>
                            {record.userName.charAt(0)}
                          </div>
                          <span>{record.userName}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td style={{
                        color: overdue ? 'var(--danger)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: overdue ? '600' : '400'
                      }}>
                        {dayjs(record.expectedReturnTime).format('YYYY-MM-DD HH:mm')}
                        {overdue && record.status === 'borrowing' && (
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            已超时 {now.diff(record.expectedReturnTime, 'hour')} 小时
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {record.returnTime
                          ? dayjs(record.returnTime).format('YYYY-MM-DD HH:mm')
                          : '—'
                        }
                      </td>
                      <td>
                        {overdue && record.status === 'borrowing' ? (
                          <span className="status-tag overdue-returned">已超时</span>
                        ) : (
                          <span className={`status-tag ${record.status}`}>
                            {getRecordStatusLabel(record.status)}
                          </span>
                        )}
                      </td>
                      <td>
                        {record.status === 'borrowing' ? (
                          <button
                            className="action-btn action-btn-primary"
                            onClick={() => handleReturn(record.id)}
                            disabled={returnLoading}
                          >
                            {returnLoading ? '处理中...' : '标记归还'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            已完成
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
