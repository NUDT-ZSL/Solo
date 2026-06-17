import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!password || password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setLoading(true);
    try {
      const data = await (activeTab === 'login'
        ? api.auth.login(username, password)
        : api.auth.register(username, password));

      api.setToken(data.token);
      api.setUser({ userId: data.userId, username: data.username });
      navigate('/');
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            登录
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '处理中...' : activeTab === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
