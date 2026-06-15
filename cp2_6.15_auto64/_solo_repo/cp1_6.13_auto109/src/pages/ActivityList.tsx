import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Activity {
  _id: string;
  name: string;
  date: string;
  status: 'preparing' | 'in_progress' | 'finished';
  location: string;
  description: string;
  createdAt?: string;
}

type StatusFilter = 'all' | 'preparing' | 'in_progress' | 'finished';
type DateSort = 'asc' | 'desc';

const ActivityList = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateSort, setDateSort] = useState<DateSort>('asc');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await axios.get<Activity[]>('/api/activities');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCountdownText = (dateStr: string, status: string) => {
    if (status === 'finished') return '活动已结束';
    const days = getDaysUntil(dateStr);
    if (days < 0) return '活动已结束';
    if (days === 0) return '今天开始！';
    if (days === 1) return '明天开始';
    return `距开始还有${days}天`;
  };

  const getCountdownColor = (dateStr: string, status: string) => {
    if (status === 'finished') return '#9ca3af';
    const days = getDaysUntil(dateStr);
    if (days <= 3) return '#ef4444';
    if (days <= 7) return '#f59e0b';
    return '#22c55e';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'preparing':
        return { label: '准备中', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
      case 'in_progress':
        return { label: '进行中', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'finished':
        return { label: '已结束', bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
      default:
        return { label: '未知', bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...activities];
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return result;
  }, [activities, statusFilter, dateSort]);

  const stats = useMemo(() => {
    return {
      total: activities.length,
      preparing: activities.filter((a) => a.status === 'preparing').length,
      in_progress: activities.filter((a) => a.status === 'in_progress').length,
      finished: activities.filter((a) => a.status === 'finished').length,
    };
  }, [activities]);

  const handleCreateActivity = async () => {
    if (!newActivity.name || !newActivity.date) return;
    try {
      await axios.post('/api/activities', {
        ...newActivity,
        status: 'preparing',
      });
      setShowNewModal(false);
      setNewActivity({ name: '', date: '', location: '', description: '' });
      fetchActivities();
    } catch (err) {
      console.error('Failed to create activity:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={{ color: '#94a3b8', marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>活动管理</h1>
          <p style={styles.pageSubtitle}>管理和跟踪所有策划中的活动</p>
        </div>
        <button
          style={styles.createButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5, #4338ca)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
          }}
          onClick={() => setShowNewModal(true)}
        >
          <span style={{ marginRight: 8 }}>＋</span> 新建活动
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>📋</div>
          <div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>全部活动</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>🔧</div>
          <div>
            <div style={styles.statValue}>{stats.preparing}</div>
            <div style={styles.statLabel}>准备中</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>🚀</div>
          <div>
            <div style={styles.statValue}>{stats.in_progress}</div>
            <div style={styles.statLabel}>进行中</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>✅</div>
          <div>
            <div style={styles.statValue}>{stats.finished}</div>
            <div style={styles.statLabel}>已结束</div>
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>状态筛选：</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'preparing', label: '准备中' },
            { value: 'in_progress', label: '进行中' },
            { value: 'finished', label: '已结束' },
          ].map((item) => (
            <button
              key={item.value}
              style={{
                ...styles.filterButton,
                ...(statusFilter === item.value ? styles.filterButtonActive : {}),
              }}
              onClick={() => setStatusFilter(item.value as StatusFilter)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={styles.sortGroup}>
          <span style={styles.filterLabel}>日期排序：</span>
          <select
            style={styles.sortSelect}
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as DateSort)}
          >
            <option value="asc">从近到远</option>
            <option value="desc">从远到近</option>
          </select>
        </div>
      </div>

      <div style={styles.cardGrid}>
        {filteredAndSorted.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <div style={styles.emptyTitle}>暂无活动</div>
            <div style={styles.emptyDesc}>点击右上角"新建活动"开始创建</div>
          </div>
        ) : (
          filteredAndSorted.map((activity) => {
            const statusInfo = getStatusInfo(activity.status);
            const isHovered = hoveredCard === activity._id;
            return (
              <div
                key={activity._id}
                onClick={() => navigate(`/activity/${activity._id}`)}
                onMouseEnter={() => setHoveredCard(activity._id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  ...styles.activityCard,
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? '0 12px 32px rgba(0,0,0,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={styles.cardTopRow}>
                  <div style={styles.cardIcon}>🎯</div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.border}`,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <h3 style={styles.cardTitle}>{activity.name}</h3>
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>
                    <span>📅</span> {activity.date}
                  </span>
                </div>
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>
                    <span>📍</span> {activity.location || '待确认'}
                  </span>
                </div>
                <div style={styles.cardDivider}></div>
                <div style={styles.cardFooter}>
                  <span
                    style={{
                      ...styles.countdownText,
                      color: getCountdownColor(activity.date, activity.status),
                    }}
                  >
                    {getCountdownText(activity.date, activity.status)}
                  </span>
                  <span style={styles.viewDetail}>查看详情 →</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showNewModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>新建活动</h2>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>活动名称 *</label>
              <input
                style={styles.formInput}
                placeholder="请输入活动名称"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>活动日期 *</label>
              <input
                type="date"
                style={styles.formInput}
                value={newActivity.date}
                onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>活动地点</label>
              <input
                style={styles.formInput}
                placeholder="请输入活动地点"
                value={newActivity.location}
                onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>活动描述</label>
              <textarea
                style={{ ...styles.formInput, height: 80, resize: 'vertical' }}
                placeholder="请输入活动描述"
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
              />
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowNewModal(false)}
              >
                取消
              </button>
              <button
                style={styles.confirmButton}
                onClick={handleCreateActivity}
              >
                创建活动
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    padding: '32px 40px',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    boxSizing: 'border-box',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 0,
  },
  createButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    transition: 'all 0.2s ease',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: 28,
  },
  statCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 4,
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    color: '#ffffff',
  },
  sortSelect: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 360px)',
    gap: 24,
    justifyContent: 'flex-start',
  },
  activityCard: {
    width: 360,
    height: 180,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'all 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
    marginBottom: 10,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    marginBottom: 4,
  },
  metaItem: {
    fontSize: 13,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    margin: '12px 0',
    flex: 'none',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: 600,
  },
  viewDetail: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: 500,
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: 28,
    width: 440,
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default ActivityList;
