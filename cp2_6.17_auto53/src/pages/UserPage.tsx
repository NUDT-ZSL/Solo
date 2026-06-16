import { useState, useEffect } from 'react';
import { User, Course } from '../types';

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [courseId, setCourseId] = useState('');

  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(setUsers).catch(console.error);
    fetch('/api/courses').then(res => res.json()).then((data: Course[]) => {
      setCourses(data);
      if (data.length > 0) setCourseId(data[0].id);
    }).catch(console.error);
  }, []);

  const loadUsers = () => {
    fetch('/api/users').then(res => res.json()).then(setUsers).catch(console.error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !courseId) return;
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, courseId })
    });
    setName('');
    setRole('student');
    loadUsers();
  };

  const getCourseName = (cid: string) => {
    const c = courses.find(course => course.id === cid);
    return c ? c.title : cid;
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 14,
    marginBottom: 16
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#424242',
    marginBottom: 6
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1a237e', marginBottom: 24 }}>用户管理</h1>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a237e', marginBottom: 20 }}>添加用户</h2>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>姓名</label>
              <input
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="请输入姓名"
              />
              <label style={labelStyle}>角色</label>
              <select
                style={inputStyle}
                value={role}
                onChange={e => setRole(e.target.value as 'teacher' | 'student')}
              >
                <option value="teacher">教师</option>
                <option value="student">学生</option>
              </select>
              <label style={labelStyle}>课程</label>
              <select
                style={inputStyle}
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                type="submit"
                style={{
                  background: '#1a237e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 24px',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                添加
              </button>
            </form>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a237e', marginBottom: 20 }}>用户列表</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {users.map(u => (
                <div
                  key={u.id}
                  style={{
                    background: '#f5f5f5',
                    borderRadius: 6,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{u.name}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: u.role === 'teacher' ? '#e3f2fd' : '#e8f5e9',
                        color: u.role === 'teacher' ? '#1565c0' : '#2e7d32'
                      }}
                    >
                      {u.role === 'teacher' ? '教师' : '学生'}
                    </span>
                    <span style={{ fontSize: 13, color: '#757575' }}>{getCourseName(u.courseId)}</span>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9e9e9e', padding: 24 }}>暂无用户</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
