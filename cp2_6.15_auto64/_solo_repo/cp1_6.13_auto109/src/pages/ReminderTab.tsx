import { useState, useEffect } from 'react';
import axios from 'axios';

interface Reminder {
  _id: string;
  activityId: string;
  title: string;
  type: 'email' | 'sms' | 'push';
  daysBefore: number;
  enabled: boolean;
  message: string;
}

interface ReminderTabProps {
  activityId: string;
  activityDate: string;
}

const ReminderTab = ({ activityId, activityDate }: ReminderTabProps) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'email' as Reminder['type'],
    daysBefore: 1,
    message: '',
    enabled: true,
  });

  useEffect(() => {
    fetchReminders();
  }, [activityId]);

  const fetchReminders = async () => {
    try {
      const res = await axios.get<Reminder[]>(`/api/activities/${activityId}/reminders`);
      setReminders(res.data);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', type: 'email', daysBefore: 1, message: '', enabled: true });
    setEditingReminder(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setFormData({
      title: reminder.title,
      type: reminder.type,
      daysBefore: reminder.daysBefore,
      message: reminder.message,
      enabled: reminder.enabled,
    });
    setEditingReminder(reminder);
  };

  const handleSubmit = async () => {
    if (!formData.title) return;
    try {
      if (editingReminder) {
        await axios.put(`/api/reminders/${editingReminder._id}`, formData);
      } else {
        await axios.post(`/api/activities/${activityId}/reminders`, formData);
      }
      resetForm();
      setShowAddModal(false);
      fetchReminders();
    } catch (err) {
      console.error('Failed to save reminder:', err);
    }
  };

  const handleDelete = async (reminderId: string) => {
    try {
      await axios.delete(`/api/reminders/${reminderId}`);
      fetchReminders();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const handleToggleEnabled = async (reminder: Reminder) => {
    try {
      await axios.put(`/api/reminders/${reminder._id}`, {
        enabled: !reminder.enabled,
      });
      fetchReminders();
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
    }
  };

  const handleSendNow = async (reminder: Reminder) => {
    const reminderDate = new Date(activityDate);
    reminderDate.setDate(reminderDate.getDate() - reminder.daysBefore);
    const dateStr = reminderDate.toISOString().split('T')[0];

    const notification = {
      title: `📢 ${reminder.title}`,
      message: reminder.message,
      date: dateStr,
      type: reminder.type,
      sentAt: new Date().toISOString(),
    };

    try {
      console.log('Sending reminder notification:', notification);
      alert(
        `提醒已触发！\n\n` +
        `标题：${reminder.title}\n` +
        `类型：${reminder.type === 'email' ? '邮件' : reminder.type === 'sms' ? '短信' : '推送'}\n` +
        `消息：${reminder.message}\n` +
        `预定发送日期：${dateStr}\n\n` +
        `（演示模式：提醒已模拟发送成功）`
      );
    } catch (err) {
      console.error('Failed to send reminder:', err);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'email':
        return { label: '邮件', icon: '📧', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'sms':
        return { label: '短信', icon: '📱', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
      case 'push':
        return { label: '推送', icon: '🔔', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      default:
        return { label: '未知', icon: '❓', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)' };
    }
  };

  const getReminderDateStr = (daysBefore: number) => {
    const d = new Date(activityDate);
    d.setDate(d.getDate() - daysBefore);
    return d.toISOString().split('T')[0];
  };

  const getDaysLabel = (daysBefore: number) => {
    if (daysBefore === 0) return '活动当天';
    if (daysBefore === 1) return '活动前1天';
    return `活动前${daysBefore}天`;
  };

  const enabledCount = reminders.filter((r) => r.enabled).length;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.remindersHeader}>
        <div>
          <h3 style={styles.sectionTitle}>日程提醒</h3>
          <div style={styles.statsRow}>
            <span style={styles.statItem}>总计 <strong>{reminders.length}</strong></span>
            <span style={{ ...styles.statItem, color: '#22c55e' }}>已启用 <strong>{enabledCount}</strong></span>
            <span style={{ ...styles.statItem, color: '#9ca3af' }}>已禁用 <strong>{reminders.length - enabledCount}</strong></span>
          </div>
        </div>
        <button style={styles.addButton} onClick={openAddModal}>
          ＋ 添加提醒
        </button>
      </div>

      <div style={styles.hintText}>
        💡 设置自动提醒后，系统会在指定天数前自动向嘉宾发送日程提醒通知
      </div>

      {reminders.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔔</div>
          <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>暂无提醒</div>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>点击"添加提醒"设置活动日程提醒</div>
        </div>
      ) : (
        <div style={styles.reminderList}>
          {reminders.map((reminder) => {
            const typeInfo = getTypeInfo(reminder.type);
            const reminderDate = getReminderDateStr(reminder.daysBefore);

            return (
              <div
                key={reminder._id}
                style={{
                  ...styles.reminderCard,
                  opacity: reminder.enabled ? 1 : 0.6,
                }}
              >
                <div style={styles.reminderTop}>
                  <div style={styles.reminderLeft}>
                    <div style={{ ...styles.typeIcon, backgroundColor: typeInfo.bg, color: typeInfo.color }}>
                      {typeInfo.icon}
                    </div>
                    <div>
                      <div style={styles.reminderTitle}>{reminder.title}</div>
                      <div style={styles.reminderMeta}>
                        <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                        <span style={styles.metaDot}>·</span>
                        <span>{getDaysLabel(reminder.daysBefore)}</span>
                        <span style={styles.metaDot}>·</span>
                        <span>发送日期：{reminderDate}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.toggleWrapper}>
                    <div
                      style={{
                        ...styles.toggle,
                        backgroundColor: reminder.enabled ? '#22c55e' : '#475569',
                      }}
                      onClick={() => handleToggleEnabled(reminder)}
                    >
                      <div style={{
                        ...styles.toggleKnob,
                        transform: reminder.enabled ? 'translateX(20px)' : 'translateX(0)',
                      }} />
                    </div>
                  </div>
                </div>

                {reminder.message && (
                  <div style={styles.reminderMessage}>
                    {reminder.message}
                  </div>
                )}

                <div style={styles.reminderActions}>
                  <button
                    style={styles.sendNowBtn}
                    onClick={() => handleSendNow(reminder)}
                    disabled={!reminder.enabled}
                  >
                    🚀 立即发送
                  </button>
                  <button style={styles.editBtn} onClick={() => openEditModal(reminder)}>
                    编辑
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(reminder._id)}>
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAddModal || editingReminder) && (
        <div style={styles.modalOverlay} onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editingReminder ? '编辑提醒' : '添加提醒'}</h2>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>提醒标题 *</label>
              <input
                style={styles.formInput}
                placeholder="例如：发布会前3天提醒"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div style={styles.formRow}>
              <div style={{ ...styles.formGroup, flex: 1, marginRight: 12 }}>
                <label style={styles.formLabel}>提醒类型</label>
                <select
                  style={styles.formInput}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Reminder['type'] })}
                >
                  <option value="email">邮件 📧</option>
                  <option value="sms">短信 📱</option>
                  <option value="push">推送通知 🔔</option>
                </select>
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.formLabel}>提前天数</label>
                <input
                  type="number"
                  style={styles.formInput}
                  min={0}
                  value={formData.daysBefore}
                  onChange={(e) => setFormData({ ...formData, daysBefore: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>提醒内容</label>
              <textarea
                style={{ ...styles.formInput, height: 80, resize: 'vertical' }}
                placeholder="请输入提醒消息内容"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>提醒预览</label>
              <div style={styles.previewBox}>
                <div style={styles.previewDate}>
                  将于 <strong>{getReminderDateStr(formData.daysBefore)}</strong>（{getDaysLabel(formData.daysBefore)}）自动发送
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => { setShowAddModal(false); resetForm(); }}
              >
                取消
              </button>
              <button style={styles.confirmButton} onClick={handleSubmit}>
                {editingReminder ? '保存修改' : '添加提醒'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #334155',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
  },
  remindersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    margin: 0,
    marginBottom: 8,
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    fontSize: 13,
    color: '#94a3b8',
  },
  statItem: {
    color: '#94a3b8',
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
  },
  hintText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
    padding: '10px 16px',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
  },
  reminderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  reminderCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 20,
    transition: 'all 0.2s ease',
  },
  reminderTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  reminderMeta: {
    fontSize: 13,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  metaDot: {
    color: '#475569',
  },
  toggleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 2,
    left: 2,
    transition: 'transform 0.2s ease',
  },
  reminderMessage: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 12,
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    lineHeight: 1.5,
  },
  reminderActions: {
    display: 'flex',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #334155',
  },
  sendNowBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  editBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
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
    width: 480,
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
  formRow: {
    display: 'flex',
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
  previewBox: {
    padding: '12px 16px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
  },
  previewDate: {
    fontSize: 13,
    color: '#94a3b8',
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

export default ReminderTab;
