import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useUser } from '../context/UserContext';
import CircularProgress from '../components/CircularProgress';
import type { BorrowRecord } from '../types';

const getCreditLevel = (score: number) => {
  if (score >= 90) return { label: '信用优秀', className: 'excellent' };
  if (score >= 75) return { label: '信用良好', className: 'good' };
  if (score >= 60) return { label: '信用一般', className: 'fair' };
  return { label: '信用较低', className: 'poor' };
};

const getRecordStatusLabel = (status: BorrowRecord['status']) => {
  switch (status) {
    case 'borrowing': return '未归还';
    case 'returned-on-time': return '按时归还';
    case 'overdue-returned': return '超时归还';
    default: return status;
  }
};

export default function Profile() {
  const { user, loading: userLoading, error: userError, refreshUser } = useUser();
  const [activeTab, setActiveTab] = useState<'all' | 'borrowing' | 'returned'>('all');

  const loadData = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredHistory = user?.borrowHistory?.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'borrowing') return r.status === 'borrowing';
    return r.status !== 'borrowing';
  }) || [];

  const stats = {
    total: user?.borrowHistory?.length || 0,
    borrowing: user?.borrowHistory?.filter(r => r.status === 'borrowing').length || 0,
    returnedOnTime: user?.borrowHistory?.filter(r => r.status === 'returned-on-time').length || 0,
    overdue: user?.borrowHistory?.filter(r => r.status === 'overdue-returned').length || 0
  };

  if (userLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>😕</div>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          {userError || '加载用户信息失败'}
        </h2>
      </div>
    );
  }

  const creditLevel = getCreditLevel(user.creditScore);

  return (
    <div className="page-transition">
      <div className="page-header">
        <h1 className="page-title">我的档案</h1>
        <p className="page-subtitle">查看您的信用评分和借用记录</p>
      </div>

      <div className="profile-layout">
        <div>
          <div className="profile-sidebar-card">
            <img
              src={user.avatar}
              alt={user.name}
              className="profile-avatar"
              style={{ width: '96px', height: '96px', borderRadius: '50%', border: '2px solid #e5e7eb' }}
            />
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-department">{user.department} · {user.role === 'admin' ? '管理员' : '用户'}</p>

            <div className="credit-score-section">
              <div className="credit-score-label">信用评分</div>
              <CircularProgress value={user.creditScore} max={100} size={160} strokeWidth={12} />
              <div>
                <span className={`credit-level ${creditLevel.className}`}>
                  {creditLevel.label}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '28px' }}>
              <div className="profile-info-item">
                <span className="profile-info-label">邮箱</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">加入日期</span>
                <span className="profile-info-value">{dayjs(user.joinDate).format('YYYY-MM-DD')}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">用户编号</span>
                <span className="profile-info-value" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {user.id.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            marginTop: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              借用统计
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              <div style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  总借用次数
                </div>
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(234, 179, 8, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>
                  {stats.borrowing}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  借用中
                </div>
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>
                  {stats.returnedOnTime}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  按时归还
                </div>
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>
                  {stats.overdue}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  超时归还
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-main-card">
          <div className="table-section-header">
            <h2 className="table-section-title">借用历史记录</h2>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                全部 ({stats.total})
              </button>
              <button
                className={`filter-tab ${activeTab === 'borrowing' ? 'active' : ''}`}
                onClick={() => setActiveTab('borrowing')}
              >
                借用中 ({stats.borrowing})
              </button>
              <button
                className={`filter-tab ${activeTab === 'returned' ? 'active' : ''}`}
                onClick={() => setActiveTab('returned')}
              >
                已归还 ({stats.returnedOnTime + stats.overdue})
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">暂无借用记录</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>设备名称</th>
                    <th>借用时间</th>
                    <th>归还时间</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(record => (
                    <tr key={record.id}>
                      <td style={{ fontWeight: '500' }}>
                        {record.deviceName}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {record.returnTime
                          ? dayjs(record.returnTime).format('YYYY-MM-DD HH:mm')
                          : <span style={{ color: 'var(--accent-blue)' }}>
                              预计 {dayjs(record.expectedReturnTime).format('MM-DD HH:mm')}
                            </span>
                        }
                      </td>
                      <td>
                        <span className={`status-tag ${record.status}`}>
                          {getRecordStatusLabel(record.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
