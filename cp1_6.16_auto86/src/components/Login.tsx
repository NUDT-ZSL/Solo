import React, { useState } from 'react';
import { THEME } from '../types';

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await onLogin(username, password);
    setLoading(false);
    if (!success) {
      setError('用户名或密码错误');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🎵</div>
        <h1 className="login-title">SoundMix Studio</h1>
        <p className="login-subtitle">在线音乐混音协作平台</p>
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="login-hint">
          演示账号：demo / demo123
        </div>
      </div>
    </div>
  );
};

export default Login;
