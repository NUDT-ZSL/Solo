import { useState, useEffect } from 'react';
import axios from 'axios';

interface Guest {
  _id: string;
  activityId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'confirmed' | 'pending' | 'declined';
  note: string;
}

interface GuestsTabProps {
  activityId: string;
}

const GuestsTab = ({ activityId }: GuestsTabProps) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    note: '',
    status: 'pending' as Guest['status'],
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchGuests();
  }, [activityId]);

  const fetchGuests = async () => {
    try {
      const res = await axios.get<Guest[]>(`/api/activities/${activityId}/guests`);
      setGuests(res.data);
    } catch (err) {
      console.error('Failed to fetch guests:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: '', note: '', status: 'pending' });
    setEditingGuest(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (guest: Guest) => {
    setFormData({
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      role: guest.role,
      note: guest.note,
      status: guest.status,
    });
    setEditingGuest(guest);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) return;
    try {
      if (editingGuest) {
        await axios.put(`/api/guests/${editingGuest._id}`, formData);
      } else {
        await axios.post(`/api/activities/${activityId}/guests`, formData);
      }
      resetForm();
      setShowAddModal(false);
      fetchGuests();
    } catch (err) {
      console.error('Failed to save guest:', err);
    }
  };

  const handleDelete = async (guestId: string) => {
    try {
      await axios.delete(`/api/guests/${guestId}`);
      fetchGuests();
    } catch (err) {
      console.error('Failed to delete guest:', err);
    }
  };

  const handleStatusChange = async (guest: Guest, newStatus: Guest['status']) => {
    try {
      await axios.put(`/api/guests/${guest._id}`, { status: newStatus });
      fetchGuests();
    } catch (err) {
      console.error('Failed to update guest status:', err);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: '已确认', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'pending':
        return { label: '待确认', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      case 'declined':
        return { label: '已拒绝', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { label: '未知', bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  const filteredGuests = filterStatus === 'all'
    ? guests
    : guests.filter((g) => g.status === filterStatus);

  const confirmedCount = guests.filter((g) => g.status === 'confirmed').length;
  const pendingCount = guests.filter((g) => g.status === 'pending').length;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.guestsHeader}>
        <div>
          <h3 style={styles.sectionTitle}>嘉宾名单</h3>
          <div style={styles.statsRow}>
            <span style={styles.statItem}>总计 <strong>{guests.length}</strong></span>
            <span style={{ ...styles.statItem, color: '#22c55e' }}>已确认 <strong>{confirmedCount}</strong></span>
            <span style={{ ...styles.statItem, color: '#f59e0b' }}>待确认 <strong>{pendingCount}</strong></span>
          </div>
        </div>
        <button style={styles.addButton} onClick={openAddModal}>
          ＋ 添加嘉宾
        </button>
      </div>

      <div style={styles.filterRow}>
        {[
          { value: 'all', label: '全部' },
          { value: 'confirmed', label: '已确认' },
          { value: 'pending', label: '待确认' },
          { value: 'declined', label: '已拒绝' },
        ].map((item) => (
          <button
            key={item.value}
            style={{
              ...styles.filterButton,
              ...(filterStatus === item.value ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilterStatus(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredGuests.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>👥</div>
          <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>暂无嘉宾</div>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>点击"添加嘉宾"开始管理嘉宾名单</div>
        </div>
      ) : (
        <div style={styles.guestTable}>
          <div style={styles.tableHeader}>
            <div style={{ ...styles.tableCell, flex: 2 }}>姓名</div>
            <div style={{ ...styles.tableCell, flex: 2 }}>邮箱</div>
            <div style={{ ...styles.tableCell, flex: 1 }}>角色</div>
            <div style={{ ...styles.tableCell, flex: 1 }}>状态</div>
            <div style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right' }}>操作</div>
          </div>
          {filteredGuests.map((guest) => {
            const statusInfo = getStatusInfo(guest.status);
            return (
              <div key={guest._id} style={styles.tableRow}>
                <div style={{ ...styles.tableCell, flex: 2 }}>
                  <div style={styles.guestName}>
                    <div style={styles.guestAvatar}>
                      {guest.name.charAt(0)}
                    </div>
                    <div>
                      <div style={styles.guestNameText}>{guest.name}</div>
                      {guest.note && <div style={styles.guestNote}>{guest.note}</div>}
                    </div>
                  </div>
                </div>
                <div style={{ ...styles.tableCell, flex: 2, color: '#94a3b8', fontSize: 13 }}>
                  {guest.email}
                </div>
                <div style={{ ...styles.tableCell, flex: 1, fontSize: 13, color: '#94a3b8' }}>
                  {guest.role}
                </div>
                <div style={{ ...styles.tableCell, flex: 1 }}>
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
                <div style={{ ...styles.tableCell, flex: 1.5, textAlign: 'right' }}>
                  <div style={styles.actionButtons}>
                    {guest.status === 'pending' && (
                      <button
                        style={styles.confirmBtn}
                        onClick={() => handleStatusChange(guest, 'confirmed')}
                      >
                        确认
                      </button>
                    )}
                    {guest.status === 'confirmed' && (
                      <button
                        style={styles.declineBtn}
                        onClick={() => handleStatusChange(guest, 'declined')}
                      >
                        拒绝
                      </button>
                    )}
                    <button style={styles.editBtn} onClick={() => openEditModal(guest)}>
                      编辑
                    </button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(guest._id)}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAddModal || editingGuest) && (
        <div style={styles.modalOverlay} onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editingGuest ? '编辑嘉宾' : '添加嘉宾'}</h2>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>姓名 *</label>
              <input
                style={styles.formInput}
                placeholder="请输入嘉宾姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>邮箱 *</label>
              <input
                style={styles.formInput}
                type="email"
                placeholder="请输入邮箱地址"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>电话</label>
              <input
                style={styles.formInput}
                placeholder="请输入电话号码"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>角色</label>
              <select
                style={styles.formInput}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="">请选择角色</option>
                <option value="VIP客户">VIP客户</option>
                <option value="媒体记者">媒体记者</option>
                <option value="合作伙伴">合作伙伴</option>
                <option value="大客户">大客户</option>
                <option value="战略客户">战略客户</option>
                <option value="演讲嘉宾">演讲嘉宾</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>备注</label>
              <input
                style={styles.formInput}
                placeholder="如饮食禁忌、特殊需求等"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>
            {editingGuest && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>状态</label>
                <select
                  style={styles.formInput}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Guest['status'] })}
                >
                  <option value="pending">待确认</option>
                  <option value="confirmed">已确认</option>
                  <option value="declined">已拒绝</option>
                </select>
              </div>
            )}
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => { setShowAddModal(false); resetForm(); }}
              >
                取消
              </button>
              <button style={styles.confirmButton} onClick={handleSubmit}>
                {editingGuest ? '保存修改' : '添加嘉宾'}
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
  guestsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  filterRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    padding: '6px 14px',
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
  guestTable: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '14px 20px',
    borderBottom: '1px solid #334155',
    backgroundColor: '#0f172a',
  },
  tableCell: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
  },
  tableRow: {
    display: 'flex',
    padding: '14px 20px',
    borderBottom: '1px solid #334155',
    alignItems: 'center',
    transition: 'background-color 0.15s ease',
  },
  guestName: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    color: '#ffffff',
    flexShrink: 0,
  },
  guestNameText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  guestNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  actionButtons: {
    display: 'flex',
    gap: 6,
    justifyContent: 'flex-end',
  },
  confirmBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  editBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '4px 10px',
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

export default GuestsTab;
