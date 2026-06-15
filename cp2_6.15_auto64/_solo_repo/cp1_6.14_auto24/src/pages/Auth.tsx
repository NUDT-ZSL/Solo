import React, { useState } from 'react';
import axios from 'axios';

export interface AuthUser {
  id: string;
  username: string;
  avatar: string;
  isAdmin: boolean;
}

interface AuthProps {
  onLogin: (u: AuthUser) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('请填写完整的账号密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/login' : '/api/register';
      const res = await axios.post(url, { username: username.trim(), password });
      onLogin(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername('admin');
    setPassword('123456');
    setMode('login');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📖</div>
          <div className="auth-logo-title">ReadCircle</div>
        </div>
        <div className="auth-subtitle">{mode === 'login' ? '登录你的读书俱乐部账号' : '创建一个新的读书俱乐部账号'}</div>

        <div className="hint-box">
          💡 演示账号：<strong>admin / 123456</strong>（管理员） 或 <strong>alice / 123456</strong>（成员）
          <button
            onClick={fillDemo}
            style={{
              marginLeft: '8px', color: '#d97706', textDecoration: 'underline',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            一键填充
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              className="form-input"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              className="form-input"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: '10px', padding: '12px', fontSize: '15px' }}
            onClick={submit}
            disabled={loading}
          >
            {loading ? '处理中...' : mode === 'login' ? '登 录' : '注 册'}
          </button>
        </div>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>还没有账号？<a onClick={() => { setMode('register'); setError(''); }}>立即注册</a></>
          ) : (
            <>已有账号？<a onClick={() => { setMode('login'); setError(''); }}>去登录</a></>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
