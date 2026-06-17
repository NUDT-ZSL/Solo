import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../types';
import { userApi, courseApi, assessmentApi, pointApi } from '../services/api';

interface UserPageProps {
  currentUser: User | null;
  onUserSelect: (user: User) => void;
  currentCourse: Course | null;
  onCourseSelect: (course: Course) => void;
}

const UserPage: React.FC<UserPageProps> = ({ currentUser, onUserSelect, currentCourse, onCourseSelect }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', role: 'student' as UserRole, email: '' });
  const [newCourse, setNewCourse] = useState({ title: '', description: '', coverUrl: '' });
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('courses');
  const [assessmentMode, setAssessmentMode] = useState(false);
  const [assessmentScores, setAssessmentScores] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [usersData, coursesData] = await Promise.all([
      userApi.getAll(),
      courseApi.getAll()
    ]);
    setUsers(usersData);
    setCourses(coursesData);
  };

  const handleAddUser = async () => {
    if (!newUser.name) return;
    const created = await userApi.create(newUser);
    setUsers(prev => [...prev, created]);
    setNewUser({ name: '', role: 'student', email: '' });
    setShowAddUser(false);
  };

  const handleAddCourse = async () => {
    if (!newCourse.title) return;
    const created = await courseApi.create(newCourse);
    setCourses(prev => [...prev, created]);
    setNewCourse({ title: '', description: '', coverUrl: '' });
    setShowAddCourse(false);
  };

  const handleDeleteUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await userApi.delete(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await courseApi.delete(courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
  };

  const startAssessment = async () => {
    if (!currentUser || !currentCourse) return;
    const points = await pointApi.getByCourse(currentCourse.id);
    const scores = new Map<string, number>();
    points.forEach(p => {
      scores.set(p.id, Math.floor(Math.random() * 100));
    });
    setAssessmentScores(scores);
    setAssessmentMode(true);
  };

  const saveAssessment = async () => {
    if (!currentUser || !currentCourse) return;
    const scoresArray = Array.from(assessmentScores.entries()).map(([pointId, score]) => ({
      pointId,
      score
    }));
    await assessmentApi.save(currentUser.id, currentCourse.id, scoresArray);
    setAssessmentMode(false);
    alert('测评成绩已保存！');
  };

  const updateScore = (pointId: string, score: number) => {
    setAssessmentScores(prev => {
      const next = new Map(prev);
      next.set(pointId, Math.max(0, Math.min(100, score)));
      return next;
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #e0e0e0' }}>
        <button
          onClick={() => setActiveTab('courses')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'courses' ? '3px solid #1a237e' : '3px solid transparent',
            fontSize: 15,
            color: activeTab === 'courses' ? '#1a237e' : '#757575',
            cursor: 'pointer',
            fontWeight: activeTab === 'courses' ? 600 : 400,
            marginBottom: -2
          }}
        >
          课程管理
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #1a237e' : '3px solid transparent',
            fontSize: 15,
            color: activeTab === 'users' ? '#1a237e' : '#757575',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? 600 : 400,
            marginBottom: -2
          }}
        >
          用户管理
        </button>
      </div>

      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, color: '#212121', margin: 0 }}>课程列表</h2>
            {currentUser?.role === 'teacher' && (
              <button
                onClick={() => setShowAddCourse(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1a237e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                + 新建课程
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {courses.map(course => (
              <div
                key={course.id}
                onClick={() => onCourseSelect(course)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  border: currentCourse?.id === course.id ? '2px solid #00bcd4' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div
                  style={{
                    height: 120,
                    background: course.coverUrl
                      ? `url(${course.coverUrl}) center/cover`
                      : 'linear-gradient(135deg, #1a237e, #00bcd4)',
                    position: 'relative'
                  }}
                >
                  {currentUser?.role === 'teacher' && (
                    <button
                      onClick={e => handleDeleteCourse(course.id, e)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 15, color: '#212121', marginBottom: 6 }}>{course.title}</h3>
                  <p style={{ fontSize: 13, color: '#757575', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {courses.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#9e9e9e' }}>
              <p style={{ fontSize: 14 }}>暂无课程</p>
            </div>
          )}

          {currentUser && currentCourse && currentUser.role === 'student' && (
            <div style={{ marginTop: 32, backgroundColor: '#fff', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 16, color: '#1a237e', marginBottom: 16 }}>课后测评</h3>
              {!assessmentMode ? (
                <button
                  onClick={startAssessment}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#00bcd4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  开始测评
                </button>
              ) : (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    {Array.from(assessmentScores.entries()).slice(0, 10).map(([pointId, score]) => (
                      <div key={pointId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#616161', width: 100, flexShrink: 0 }}>
                          知识点 {pointId.substring(0, 6)}...
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={score}
                          onChange={e => updateScore(pointId, parseInt(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{
                          fontSize: 13,
                          fontWeight: 600,
                          width: 50,
                          textAlign: 'right',
                          color: score < 60 ? '#f44336' : (score < 80 ? '#ffb74d' : '#4caf50')
                        }}>
                          {score}分
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={saveAssessment}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    保存成绩
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, color: '#212121', margin: 0 }}>用户列表</h2>
            <button
              onClick={() => setShowAddUser(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1a237e',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              + 新建用户
            </button>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#616161', fontWeight: 500 }}>用户名</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#616161', fontWeight: 500 }}>邮箱</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#616161', fontWeight: 500 }}>角色</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#616161', fontWeight: 500 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr
                    key={user.id}
                    onClick={() => onUserSelect(user)}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: currentUser?.id === user.id ? '#e3f2fd' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#212121' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: user.role === 'teacher' ? '#00bcd4' : '#81c784',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        {user.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#757575' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          backgroundColor: user.role === 'teacher' ? '#e0f7fa' : '#e8f5e9',
                          color: user.role === 'teacher' ? '#0097a7' : '#388e3c'
                        }}
                      >
                        {user.role === 'teacher' ? '教师' : '学生'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={e => handleDeleteUser(user.id, e)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#ffebee',
                          color: '#c62828',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e' }}>
                <p style={{ fontSize: 14 }}>暂无用户</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowAddUser(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 380, backgroundColor: '#fff', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, color: '#1a237e', marginBottom: 20 }}>新建用户</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>用户名</label>
              <input
                type="text"
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                style={{ width: '100%', padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>邮箱</label>
              <input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                style={{ width: '100%', padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>角色</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                style={{ width: '100%', padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14 }}
              >
                <option value="student">学生</option>
                <option value="teacher">教师</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAddUser(false)}
                style={{ flex: 1, padding: 10, backgroundColor: '#f5f5f5', color: '#616161', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                style={{ flex: 1, padding: 10, backgroundColor: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCourse && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowAddCourse(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 400, backgroundColor: '#fff', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, color: '#1a237e', marginBottom: 20 }}>新建课程</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>课程标题</label>
              <input
                type="text"
                value={newCourse.title}
                onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                style={{ width: '100%', padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>课程简介</label>
              <textarea
                value={newCourse.description}
                onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>封面URL（可选）</label>
              <input
                type="text"
                value={newCourse.coverUrl}
                onChange={e => setNewCourse({ ...newCourse, coverUrl: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAddCourse(false)}
                style={{ flex: 1, padding: 10, backgroundColor: '#f5f5f5', color: '#616161', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleAddCourse}
                style={{ flex: 1, padding: 10, backgroundColor: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
