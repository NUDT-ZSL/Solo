import { useState } from 'react';
import type { User } from '../types';
import { useApi } from '../hooks/useApi';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register, loading } = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请填写用户名和密码');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      if (isLogin) {
        const user = await login(username, password);
        onLogin(user as User);
      } else {
        const user = await register(username, password);
        onLogin(user as User);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🍳 食谱版本管理</h1>
          <p>像管理代码一样管理你的食谱</p>
        </div>

        <div className="auth-tabs">
          <button
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button
            className={!isLogin ? 'active' : ''}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '登 录' : '注 册'}
          </button>
        </form>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fdf5e6 0%, #f5deb3 100%);
        }

        .auth-card {
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .auth-header h1 {
          color: #8b4513;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .auth-header p {
          color: #8d6e63;
          font-size: 14px;
        }

        .auth-tabs {
          display: flex;
          margin-bottom: 24px;
          background: #f5f0e1;
          border-radius: 8px;
          padding: 4px;
        }

        .auth-tabs button {
          flex: 1;
          padding: 10px;
          background: transparent;
          border-radius: 6px;
          color: #8d6e63;
          font-size: 14px;
          font-weight: 500;
        }

        .auth-tabs button.active {
          background: #fff;
          color: #8b4513;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .auth-form .form-group {
          margin-bottom: 16px;
        }

        .auth-form label {
          display: block;
          font-size: 13px;
          color: #5d4037;
          margin-bottom: 6px;
        }

        .auth-form input {
          width: 100%;
          padding: 12px 14px;
          font-size: 14px;
        }

        .auth-error {
          background: #ffebee;
          color: #c62828;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .btn-submit {
          width: 100%;
          background: #8b4513;
          color: #fff;
          padding: 14px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-top: 8px;
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default AuthPage;
