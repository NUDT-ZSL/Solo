import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export function LoginPage() {
  const [email, setEmail] = useState('xiaoming@example.com');
  const [password, setPassword] = useState('123456');
  const { login, loading, error } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  const styles = `
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, #faf5ff 0%, #fff7ed 100%);
    }
    .auth-card {
      width: 100%;
      max-width: 400px;
      background: white;
      border-radius: 16px;
      padding: 40px 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .auth-logo {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: #8b5cf6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      margin: 0 auto 20px;
    }
    .auth-title {
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .auth-subtitle {
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 28px;
    }
    .auth-form-group {
      margin-bottom: 16px;
    }
    .auth-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    .auth-input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .auth-input:focus {
      border-color: #8b5cf6;
    }
    .auth-error {
      background: #fef2f2;
      color: #dc2626;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .auth-btn {
      width: 100%;
      padding: 12px;
      background: #8b5cf6;
      color: white;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      transition: background 0.2s ease;
    }
    .auth-btn:hover:not(:disabled) {
      background: #7c3aed;
    }
    .auth-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    .auth-footer {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: #6b7280;
    }
    .auth-footer a {
      color: #8b5cf6;
      font-weight: 500;
    }
    .auth-footer a:hover {
      color: #7c3aed;
    }
    .auth-hint {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      color: #6b21a8;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 20px;
      line-height: 1.6;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page page-fade-in">
        <div className="auth-card">
          <div className="auth-logo">墨</div>
          <h1 className="auth-title">欢迎回来</h1>
          <p className="auth-subtitle">登录墨香书苑，开启阅读之旅</p>
          <div className="auth-hint">
            测试账号：xiaoming@example.com / 123456
            <br />
            管理员：admin@bookstore.com / admin123
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label">邮箱</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
            </div>
            <div className="auth-form-group">
              <label className="auth-label">密码</label>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <div className="auth-footer">
            还没有账号？<Link to="/register">立即注册</Link>
          </div>
        </div>
      </div>
    </>
  );
}
