import React, { useState, useEffect } from 'react';
import type { User, Course } from '../types';

interface UserPageProps {
  currentUser: User | null;
  onSwitchUser: (userId: string) => void;
  courses: Course[];
}

const UserPage: React.FC<UserPageProps> = ({ currentUser, onSwitchUser, courses }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: 'student' as 'student' | 'teacher',
    email: '',
    avatar: '',
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      showToast('请填写名称');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          email: form.email,
          avatar:
            form.avatar ||
            `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
              form.role === 'teacher' ? 'professional teacher avatar friendly' : 'cute student avatar cartoon'
            )}&image_size=square`,
        }),
      });
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setForm({ name: '', role: 'student', email: '', avatar: '' });
      setShowForm(false);
      showToast('用户创建成功');
    } catch (err) {
      console.error(err);
      showToast('创建失败');
    }
  };

  const userStat = (u: User) => {
    if (u.role !== 'student') return null;
    const assess = u.assessments || {};
    const reviewed = u.reviewedNodes || {};
    let totalKp = 0;
    let weakCount = 0;
    let reviewedCount = 0;
    Object.keys(assess).forEach((cid) => {
      const sc = assess[cid];
      Object.keys(sc).forEach((kid) => {
        totalKp++;
        if (sc[kid] < 60) weakCount++;
      });
    });
    Object.keys(reviewed).forEach((cid) => {
      reviewedCount += (reviewed[cid] || []).length;
    });
    return { totalKp, weakCount, reviewedCount };
  };

  return (
    <div className="user-page">
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(26,35,126,0.92)',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 20,
            fontSize: 14,
            zIndex: 500,
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#1a237e', marginBottom: 6 }}>用户管理</h2>
          <p style={{ fontSize: 13, color: '#757575' }}>
            当前登录：<strong style={{ color: currentUser?.role === 'teacher' ? '#512da8' : '#00695c' }}>
              {currentUser?.name}
            </strong>（{currentUser?.role === 'teacher' ? '教师' : '学生'}）
          </p>
        </div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '收起' : '+ 新建用户'}
        </button>
      </div>

      {showForm && (
        <div
          className="panel-section"
          style={{ maxWidth: 500, marginTop: 20, background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        >
          <h3 style={{ fontSize: 16, color: '#1a237e', marginBottom: 16 }}>添加新用户</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>姓名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="用户姓名"
              />
            </div>
            <div className="form-field">
              <label>角色</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              >
                <option value="student">学生</option>
                <option value="teacher">教师</option>
              </select>
            </div>
            <div className="form-field">
              <label>邮箱（可选）</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="btn-group">
              <button type="submit" className="btn">
                创建用户
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div className="panel-section" style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: '#1a237e', marginBottom: 12 }}>快速切换身份</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {users.slice(0, 4).map((u) => (
              <button
                key={u.id}
                onClick={() => onSwitchUser(u.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 20,
                  border: currentUser?.id === u.id ? '2px solid #1a237e' : '1px solid #e0e0e0',
                  background: currentUser?.id === u.id ? '#1a237e' : '#fff',
                  color: currentUser?.id === u.id ? '#fff' : '#424242',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {u.name}（{u.role === 'teacher' ? '教师' : '学生'}）
              </button>
            ))}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, color: '#1a237e', marginTop: 20, marginBottom: 12 }}>
        全部用户 ({users.length})
      </h3>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : (
        <div className="user-cards">
          {users.map((u) => {
            const stat = userStat(u);
            return (
              <div
                key={u.id}
                className="user-card"
                style={{
                  cursor: 'pointer',
                  border: currentUser?.id === u.id ? '2px solid #1a237e' : '1px solid transparent',
                }}
                onClick={() => onSwitchUser(u.id)}
              >
                <img
                  src={
                    u.avatar ||
                    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=user%20avatar%20placeholder&image_size=square'
                  }
                  alt={u.name}
                  className="user-avatar"
                />
                <div className="user-info" style={{ flex: 1 }}>
                  <h3>{u.name}</h3>
                  <span className={`role-badge ${u.role}`}>
                    {u.role === 'teacher' ? '教师' : '学生'}
                  </span>
                  <p style={{ fontSize: 12, color: '#9e9e9e' }}>{u.email || '未设置邮箱'}</p>
                  {stat && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        background: stat.weakCount > 0 ? '#fff8e1' : '#e8f5e9',
                        borderRadius: 6,
                        fontSize: 11,
                        color: stat.weakCount > 0 ? '#ef6c00' : '#2e7d32',
                      }}
                    >
                      {stat.totalKp > 0
                        ? `测评 ${stat.totalKp} 项 · 薄弱点 ${stat.weakCount} 个 · 已复习 ${stat.reviewedCount} 个`
                        : '暂无测评记录'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 16, color: '#1a237e', marginBottom: 12 }}>可用课程 ({courses.length})</h3>
        <div className="user-cards">
          {courses.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={c.coverUrl}
                alt={c.title}
                style={{
                  width: '100%',
                  height: 140,
                  objectFit: 'cover',
                  background: '#eee',
                }}
              />
              <div style={{ padding: 14 }}>
                <h4 style={{ fontSize: 14, color: '#1a237e', marginBottom: 6 }}>{c.title}</h4>
                <p style={{ fontSize: 12, color: '#757575', lineHeight: 1.5 }}>{c.description}</p>
                <div style={{ marginTop: 10, fontSize: 11, color: '#9e9e9e' }}>
                  创建于：{new Date(c.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserPage;
