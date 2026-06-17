import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import type { User, UserRole, Course, AssessmentScore, KnowledgePoint } from '../types';

export const UserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', role: 'student' as UserRole });
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(setUsers);
    fetch('/api/courses').then(res => res.json()).then(setCourses);
    fetch('/api/knowledge-points').then(res => res.json()).then(setKnowledgePoints);
    fetch('/api/assessment-scores').then(res => res.json()).then(setScores);
  }, []);

  const handleAddUser = () => {
    if (!newUser.name.trim()) return;
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
      .then(res => res.json())
      .then((user: User) => {
        setUsers(prev => [...prev, user]);
        setShowAddModal(false);
        setNewUser({ name: '', role: 'student' });
      });
  };

  const getUserScores = (userId: string) => {
    return scores.filter(s => s.userId === userId).map(s => {
      const kp = knowledgePoints.find(k => k.id === s.knowledgePointId);
      return { ...s, knowledgePointTitle: kp?.title ?? '未知' };
    });
  };

  return (
    <div className="app-container">
      <Header
        courseTitle="用户管理"
        filterTag=""
        availableTags={[]}
        onFilterChange={() => {}}
      />
      <main className="main-content">
        <div className="tabs">
          <button
            className={`tab-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            用户列表
          </button>
          <button
            className={`tab-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            课程列表
          </button>
        </div>

        {activeTab === 'users' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + 添加用户
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {users.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-avatar">{user.name.charAt(0)}</div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-role">
                      {user.role === 'teacher' ? '👨‍🏫 教师' : '👨‍🎓 学生'}
                    </div>
                  </div>
                  {user.role === 'student' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedUser(user)}
                    >
                      查看成绩
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'courses' && (
          <div className="courses-grid">
            {courses.map(course => (
              <div key={course.id} className="course-card">
                <div
                  className="course-cover"
                  style={{ backgroundImage: `url(${course.coverUrl})` }}
                />
                <div className="course-info">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-desc">{course.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <h2 className="detail-title">{selectedUser.name} 的测评成绩</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {getUserScores(selectedUser.id).map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{s.knowledgePointTitle}</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: s.score < 60 ? '#e57373' : '#81c784',
                      }}
                    >
                      {s.score} 分
                    </span>
                  </div>
                ))}
                {getUserScores(selectedUser.id).length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <p>暂无测评成绩</p>
                  </div>
                )}
              </div>
              <div className="detail-actions" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <h2 className="detail-title">添加用户</h2>
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  className="form-input"
                  value={newUser.name}
                  onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入用户姓名"
                />
              </div>
              <div className="form-group">
                <label className="form-label">角色</label>
                <select
                  className="form-select"
                  value={newUser.role}
                  onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                >
                  <option value="student">学生</option>
                  <option value="teacher">教师</option>
                </select>
              </div>
              <div className="detail-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleAddUser}>
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
