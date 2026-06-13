import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import GuestsTab from './GuestsTab';
import ReminderTab from './ReminderTab';

interface Milestone {
  _id: string;
  activityId: string;
  title: string;
  description: string;
  date: string;
  order: number;
  completed: boolean;
}

interface Activity {
  _id: string;
  name: string;
  date: string;
  status: string;
  location: string;
  description: string;
}

type TabType = 'timeline' | 'guests' | 'reminders';

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', date: '' });
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchActivity();
      fetchMilestones();
    }
  }, [id]);

  const fetchActivity = async () => {
    try {
      const res = await axios.get<Activity>(`/api/activities/${id}`);
      setActivity(res.data);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await axios.get<Milestone[]>(`/api/activities/${id}/milestones`);
      setMilestones(res.data.sort((a, b) => a.order - b.order));
    } catch (err) {
      console.error('Failed to fetch milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    setCompletingId(milestone._id);
    try {
      await axios.put(`/api/milestones/${milestone._id}`, {
        completed: !milestone.completed,
      });
      await fetchMilestones();
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    } finally {
      setTimeout(() => setCompletingId(null), 300);
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...milestones];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);
    setMilestones(reordered);

    try {
      await axios.put(`/api/milestones/${moved._id}/reorder`, {
        newOrder: dragOverIndex,
        activityId: id,
      });
      await fetchMilestones();
    } catch (err) {
      console.error('Failed to reorder milestone:', err);
      fetchMilestones();
    }

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title || !newMilestone.date) return;
    try {
      await axios.post(`/api/activities/${id}/milestones`, {
        ...newMilestone,
        order: milestones.length,
        completed: false,
      });
      setShowAddMilestone(false);
      setNewMilestone({ title: '', description: '', date: '' });
      fetchMilestones();
    } catch (err) {
      console.error('Failed to add milestone:', err);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await axios.delete(`/api/milestones/${milestoneId}`);
      fetchMilestones();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
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

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'timeline', label: '时间线', icon: '⏱️' },
    { key: 'guests', label: '嘉宾', icon: '👥' },
    { key: 'reminders', label: '提醒', icon: '🔔' },
  ];

  if (loading || !activity) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={{ color: '#94a3b8', marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(activity.status);
  const daysUntil = getDaysUntil(activity.date);

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.breadcrumb}>
        <span style={styles.breadcrumbLink} onClick={() => navigate('/')}>活动列表</span>
        <span style={styles.breadcrumbSep}>/</span>
        <span style={styles.breadcrumbCurrent}>{activity.name}</span>
      </div>

      <div style={styles.detailHeader}>
        <div style={styles.headerLeft}>
          <h1 style={styles.detailTitle}>{activity.name}</h1>
          <div style={styles.headerMeta}>
            <span style={styles.metaTag}>
              <span>📅</span> {activity.date}
            </span>
            <span style={styles.metaTag}>
              <span>📍</span> {activity.location || '待确认'}
            </span>
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
          {activity.description && (
            <p style={styles.description}>{activity.description}</p>
          )}
        </div>
        <div style={styles.headerRight}>
          <div style={styles.countdownCard}>
            <div style={styles.countdownNumber}>
              {daysUntil < 0 ? '已结束' : daysUntil === 0 ? '今天' : daysUntil}
            </div>
            <div style={styles.countdownLabel}>
              {daysUntil < 0 ? '' : daysUntil === 0 ? '活动就在今天' : '天后开始'}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab.key ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'timeline' && (
          <div>
            <div style={styles.timelineHeader}>
              <h3 style={styles.sectionTitle}>活动里程碑</h3>
              <button
                style={styles.addButton}
                onClick={() => setShowAddMilestone(true)}
              >
                ＋ 添加里程碑
              </button>
            </div>

            <div style={styles.hintText}>
              💡 拖拽里程碑可调整顺序，调整后自动重算日期
            </div>

            {milestones.length === 0 ? (
              <div style={styles.emptyTimeline}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📌</div>
                <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>暂无里程碑</div>
                <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>点击"添加里程碑"开始规划活动时间线</div>
              </div>
            ) : (
              <div style={styles.timelineContainer}>
                {milestones.map((milestone, index) => {
                  const isDragging = dragIndex === index;
                  const isDragOver = dragOverIndex === index && dragIndex !== index;
                  const isCompleting = completingId === milestone._id;

                  return (
                    <div
                      key={milestone._id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        ...styles.timelineItem,
                        opacity: isDragging ? 0.4 : 1,
                        borderLeft: isDragOver ? '3px solid #6366f1' : '3px solid transparent',
                      }}
                    >
                      <div style={styles.timelineRow}>
                        <div style={styles.timelineLeft}>
                          <div style={styles.dragHandle} title="拖拽排序">⠿</div>
                          <div style={styles.timelineDotWrapper}>
                            <div
                              style={{
                                ...styles.timelineDot,
                                backgroundColor: milestone.completed ? '#22c55e' : '#d1d5db',
                                transform: isCompleting ? 'scale(1.3)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {milestone.completed && (
                                <span style={styles.checkIcon}>✓</span>
                              )}
                            </div>
                            {index < milestones.length - 1 && (
                              <div style={styles.timelineLine} />
                            )}
                          </div>
                        </div>

                        <div style={styles.timelineContent}>
                          <div style={styles.milestoneHeader}>
                            <h4 style={{
                              ...styles.milestoneTitle,
                              textDecoration: milestone.completed ? 'line-through' : 'none',
                              color: milestone.completed ? '#94a3b8' : '#e2e8f0',
                            }}>
                              {milestone.title}
                            </h4>
                            <div style={styles.milestoneActions}>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  ...styles.toggleBtn,
                                  backgroundColor: milestone.completed
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(34, 197, 94, 0.15)',
                                  color: milestone.completed ? '#f59e0b' : '#22c55e',
                                }}
                                onClick={() => handleToggleComplete(milestone)}
                              >
                                {milestone.completed ? '撤回' : '完成'}
                              </button>
                              <button
                                style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                                onClick={() => handleDeleteMilestone(milestone._id)}
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          {milestone.description && (
                            <p style={styles.milestoneDesc}>{milestone.description}</p>
                          )}
                          <div style={styles.milestoneDate}>
                            <span>📅</span> {milestone.date}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showAddMilestone && (
              <div style={styles.modalOverlay} onClick={() => setShowAddMilestone(false)}>
                <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                  <h2 style={styles.modalTitle}>添加里程碑</h2>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>里程碑名称 *</label>
                    <input
                      style={styles.formInput}
                      placeholder="例如：确定活动场地"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>描述</label>
                    <input
                      style={styles.formInput}
                      placeholder="简要描述此里程碑内容"
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>目标日期 *</label>
                    <input
                      type="date"
                      style={styles.formInput}
                      value={newMilestone.date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                    />
                  </div>
                  <div style={styles.modalActions}>
                    <button style={styles.cancelButton} onClick={() => setShowAddMilestone(false)}>
                      取消
                    </button>
                    <button style={styles.confirmButton} onClick={handleAddMilestone}>
                      添加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'guests' && <GuestsTab activityId={id!} />}
        {activeTab === 'reminders' && <ReminderTab activityId={id!} activityDate={activity.date} />}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    padding: '28px 36px',
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
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  breadcrumbLink: {
    color: '#6366f1',
    cursor: 'pointer',
  },
  breadcrumbSep: {
    color: '#475569',
  },
  breadcrumbCurrent: {
    color: '#94a3b8',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: 28,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 32,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    marginBottom: 12,
    letterSpacing: '-0.02em',
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaTag: {
    fontSize: 14,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    lineHeight: 1.5,
  },
  countdownCard: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderRadius: 12,
    padding: '20px 28px',
    textAlign: 'center',
    minWidth: 120,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: 700,
    color: '#ffffff',
  },
  countdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 6,
    marginBottom: 24,
  },
  tabButton: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  tabButtonActive: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  tabContent: {
    minHeight: 400,
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    margin: 0,
  },
  addButton: {
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  hintText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
    padding: '10px 16px',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 8,
  },
  emptyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
  },
  timelineContainer: {
    position: 'relative',
  },
  timelineItem: {
    marginBottom: 4,
    paddingLeft: 4,
    borderRadius: 8,
    transition: 'all 0.2s ease',
    cursor: 'grab',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  dragHandle: {
    fontSize: 16,
    color: '#475569',
    cursor: 'grab',
    userSelect: 'none',
    padding: '0 4px',
  },
  timelineDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexShrink: 0,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#334155',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '14px 18px',
    marginBottom: 8,
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  milestoneActions: {
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    padding: '4px 12px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleBtn: {},
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  milestoneDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 0,
    lineHeight: 1.4,
  },
  milestoneDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
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
  },
};

export default ActivityDetail;
