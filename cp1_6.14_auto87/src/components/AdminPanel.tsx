import { useState, useEffect, useCallback } from 'react';
import http from '../services/http';
import { FitnessClass, User } from '../types';

interface AdminPanelProps {
  userId: string;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  refreshKey: number;
}

interface ClassFormData {
  id?: string;
  name: string;
  type: string;
  date: string;
  time: string;
  duration: string;
  capacity: string;
  calories: string;
}

interface Participant {
  id: string;
  name: string;
}

const emptyForm: ClassFormData = {
  name: '',
  type: '瑜伽',
  date: new Date().toISOString().split('T')[0],
  time: '09:00',
  duration: '60',
  capacity: '15',
  calories: '300',
};

function AdminPanel({ userId, onToast, refreshKey }: AdminPanelProps) {
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ClassFormData>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isCoach = userId.startsWith('coach');

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const [classesData, typesData] = await Promise.all([
        http.get<any, FitnessClass[]>('/classes'),
        http.get<any, string[]>('/class-types'),
      ]);
      
      const coachClasses = classesData.filter(c => c.coachId === userId);
      coachClasses.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
      
      setClasses(coachClasses);
      setClassTypes(typesData);
    } catch (error: any) {
      onToast(error.response?.data?.message || '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, onToast]);

  useEffect(() => {
    if (isCoach) {
      fetchClasses();
    }
  }, [isCoach, fetchClasses, refreshKey]);

  const fetchParticipants = async (classId: string) => {
    if (participants[classId]) {
      setExpandedClass(expandedClass === classId ? null : classId);
      return;
    }

    setLoadingParticipants(classId);
    try {
      const data = await http.get<any, { participants: User[] }>(`/classes/${classId}/participants`);
      setParticipants(prev => ({
        ...prev,
        [classId]: data.participants.map(p => ({ id: p.id, name: p.name })),
      }));
      setExpandedClass(classId);
    } catch (error: any) {
      onToast(error.response?.data?.message || '加载参与者失败', 'error');
    } finally {
      setLoadingParticipants(null);
    }
  };

  const handleAdd = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (fitnessClass: FitnessClass) => {
    setFormData({
      id: fitnessClass.id,
      name: fitnessClass.name,
      type: fitnessClass.type,
      date: fitnessClass.date,
      time: fitnessClass.time,
      duration: String(fitnessClass.duration),
      capacity: String(fitnessClass.capacity),
      calories: String(fitnessClass.calories),
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (classId: string) => {
    if (!window.confirm('确定要删除这门课程吗？')) return;
    
    setDeletingId(classId);
    try {
      await http.delete(`/classes/${classId}`);
      onToast('删除成功', 'success');
      fetchClasses();
    } catch (error: any) {
      onToast(error.response?.data?.message || '删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (isEditing && formData.id) {
        await http.put(`/classes/${formData.id}`, {
          name: formData.name,
          type: formData.type,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          capacity: formData.capacity,
          calories: formData.calories,
        });
        onToast('更新成功', 'success');
      } else {
        await http.post('/classes', {
          name: formData.name,
          type: formData.type,
          coachId: userId,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          capacity: formData.capacity,
          calories: formData.calories,
        });
        onToast('创建成功', 'success');
      }
      
      setShowModal(false);
      fetchClasses();
    } catch (error: any) {
      onToast(error.response?.data?.message || '操作失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const getRemaining = (fitnessClass: FitnessClass) => {
    return fitnessClass.capacity - fitnessClass.participants.length;
  };

  if (!isCoach) {
    return (
      <div className="unauthorized">
        <span className="unauth-icon">🔒</span>
        <h2>仅限教练访问</h2>
        <p>此功能仅对教练开放</p>
        <style>{`
          .unauthorized {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            gap: 16px;
            color: rgba(255, 255, 255, 0.6);
          }
          .unauth-icon {
            font-size: 64px;
          }
          .unauthorized h2 {
            font-size: 24px;
            color: #fff;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <h1 className="page-title">管理面板</h1>
          <p className="page-subtitle">管理课程，查看学员预约情况</p>
        </div>
        <button className="add-btn" onClick={handleAdd}>
          <span className="add-icon">+</span>
          新增课程
        </button>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-value">{classes.length}</span>
          <span className="stat-label">课程总数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {classes.reduce((sum, c) => sum + c.participants.length, 0)}
          </span>
          <span className="stat-label">总预约人次</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {classes.length > 0 
              ? Math.round(classes.reduce((sum, c) => sum + c.participants.length, 0) / classes.length)
              : 0}
          </span>
          <span className="stat-label">平均预约</span>
        </div>
      </div>

      <div className="classes-list">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>暂无课程</p>
            <p className="empty-hint">点击上方按钮创建第一门课程</p>
          </div>
        ) : (
          classes.map(fitnessClass => {
            const remaining = getRemaining(fitnessClass);
            const isExpanded = expandedClass === fitnessClass.id;
            const classParticipants = participants[fitnessClass.id] || [];

            return (
              <div key={fitnessClass.id} className="admin-class-card">
                <div className="admin-class-header">
                  <div className="admin-class-info">
                    <div className="class-type-badge">{fitnessClass.type}</div>
                    <h3 className="class-name">{fitnessClass.name}</h3>
                    <div className="class-meta">
                      <span>📅 {formatDate(fitnessClass.date)}</span>
                      <span>⏰ {fitnessClass.time}</span>
                      <span>⏱️ {fitnessClass.duration}分钟</span>
                      <span>🔥 {fitnessClass.calories} 卡路里</span>
                    </div>
                  </div>
                  <div className="admin-class-stats">
                    <div className="stat-item">
                      <span className="stat-num">{fitnessClass.participants.length}</span>
                      <span className="stat-text">已预约</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-num">{remaining}</span>
                      <span className="stat-text">剩余名额</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-num">{fitnessClass.capacity}</span>
                      <span className="stat-text">总名额</span>
                    </div>
                  </div>
                </div>

                <div className="admin-class-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={() => fetchParticipants(fitnessClass.id)}
                    disabled={loadingParticipants === fitnessClass.id}
                  >
                    {loadingParticipants === fitnessClass.id ? '加载中...' :
                     isExpanded ? '收起名单' : '查看学员'}
                  </button>
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEdit(fitnessClass)}
                  >
                    编辑
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(fitnessClass.id)}
                    disabled={deletingId === fitnessClass.id}
                  >
                    {deletingId === fitnessClass.id ? '删除中...' : '删除'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="participants-section">
                    <h4 className="section-title">学员名单</h4>
                    {classParticipants.length === 0 ? (
                      <p className="no-participants">暂无学员预约</p>
                    ) : (
                      <div className="participants-table-container">
                        <table className="participants-table">
                          <thead>
                            <tr>
                              <th>序号</th>
                              <th>学员ID</th>
                              <th>姓名</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classParticipants.map((p, index) => (
                              <tr key={p.id}>
                                <td>{index + 1}</td>
                                <td className="mono">{p.id}</td>
                                <td>{p.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? '编辑课程' : '新增课程'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>课程名称</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="如：流瑜伽"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>课程类型</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    {classTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>时间</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>时长（分钟）</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="15"
                    max="180"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>人数上限</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    min="1"
                    max="50"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>预计卡路里</label>
                  <input
                    type="number"
                    name="calories"
                    value={formData.calories}
                    onChange={handleInputChange}
                    min="50"
                    max="1000"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '保存中...' : (isEditing ? '保存修改' : '创建课程')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin: 0;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #4caf50, #66bb6a);
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.25s ease-out;
          box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
        }

        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .add-icon {
          font-size: 18px;
          font-weight: bold;
        }

        .admin-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 24px;
          background: rgba(30, 30, 46, 0.6);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #4caf50, #81c784);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .classes-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .admin-class-card {
          background: #1e1e2e;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.25s ease-out;
        }

        .admin-class-card:hover {
          border-color: rgba(76, 175, 80, 0.3);
        }

        .admin-class-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .admin-class-info {
          flex: 1;
          min-width: 250px;
        }

        .class-type-badge {
          display: inline-block;
          padding: 4px 12px;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
          color: #4caf50;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(76, 175, 80, 0.3);
          margin-bottom: 10px;
        }

        .class-name {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 10px 0;
        }

        .class-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .admin-class-stats {
          display: flex;
          gap: 24px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-num {
          font-size: 24px;
          font-weight: 700;
          color: #4caf50;
        }

        .stat-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .admin-class-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.25s ease-out;
        }

        .view-btn {
          background: rgba(33, 150, 243, 0.15);
          color: #2196f3;
          border: 1px solid rgba(33, 150, 243, 0.3);
        }

        .view-btn:hover:not(:disabled) {
          background: rgba(33, 150, 243, 0.25);
        }

        .edit-btn {
          background: rgba(255, 152, 0, 0.15);
          color: #ff9800;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .edit-btn:hover {
          background: rgba(255, 152, 0, 0.25);
        }

        .delete-btn {
          background: rgba(244, 67, 54, 0.15);
          color: #f44336;
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .delete-btn:hover:not(:disabled) {
          background: rgba(244, 67, 54, 0.25);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .participants-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 16px 0;
        }

        .no-participants {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin: 0;
        }

        .participants-table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .participants-table {
          width: 100%;
          border-collapse: collapse;
        }

        .participants-table th,
        .participants-table td {
          padding: 12px 16px;
          text-align: left;
          font-size: 14px;
        }

        .participants-table th {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          font-size: 13px;
        }

        .participants-table td {
          color: rgba(255, 255, 255, 0.85);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .participants-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .mono {
          font-family: monospace;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .modal {
          background: #1e1e2e;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .modal-form {
          padding: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-row:last-of-type {
          grid-template-columns: repeat(3, 1fr);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 500;
        }

        .form-group input,
        .form-group select {
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #e0e0e0;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.25s ease-out;
        }

        .form-group input:hover,
        .form-group select:hover {
          border-color: rgba(76, 175, 80, 0.4);
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4caf50;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
        }

        .form-group option {
          background: #1e1e2e;
          color: #e0e0e0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cancel-btn {
          padding: 12px 24px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease-out;
        }

        .cancel-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .submit-btn {
          padding: 12px 28px;
          background: linear-gradient(135deg, #4caf50, #66bb6a);
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.25s ease-out;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
        }

        .submit-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          gap: 16px;
          color: rgba(255, 255, 255, 0.6);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #4caf50;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          gap: 12px;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
        }

        .empty-icon {
          font-size: 48px;
        }

        .empty-hint {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            align-items: stretch;
          }

          .admin-stats {
            grid-template-columns: 1fr;
          }

          .admin-class-header {
            flex-direction: column;
          }

          .admin-class-stats {
            width: 100%;
            justify-content: space-around;
          }

          .form-row,
          .form-row:last-of-type {
            grid-template-columns: 1fr;
          }

          .modal-actions {
            flex-direction: column-reverse;
          }

          .cancel-btn,
          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminPanel;
