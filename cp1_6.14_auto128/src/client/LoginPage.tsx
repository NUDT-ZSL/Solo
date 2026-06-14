import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!nickname.trim()) {
          setError('请输入昵称');
          setLoading(false);
          return;
        }
        await register(email, password, nickname);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="login-card">
        <div className="login-header">
          <h1>PeerGrad</h1>
          <p>作业互评系统</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          {isRegister && (
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入昵称"
                required
              />
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit"
            className={`btn-primary ${loading ? 'btn-disabled' : ''}`}
            disabled={loading}
          >
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>
        <div className="login-switch">
          <span>
            {isRegister ? '已有账号？' : '没有账号？'}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
            >
              {isRegister ? '去登录' : '去注册'}
            </button>
          </span>
        </div>
        <div className="login-demo">
          <p>演示账号：</p>
          <p>导师：teacher@peergrad.com / teacher123</p>
          <p>学员：student1@peergrad.com / student123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
