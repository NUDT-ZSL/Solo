import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '操作失败');
      }

      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('avatar', data.user.avatar);

      window.dispatchEvent(new Event('authChange'));

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <span className="logo-icon">♪</span>
            <h1 className="logo-title">琴韵</h1>
          </div>
          
          <div className="tabs">
            <button
              className={`tab ${!isRegister ? 'active' : ''}`}
              onClick={() => setIsRegister(false)}
            >
              登录
            </button>
            <button
              className={`tab ${isRegister ? 'active' : ''}`}
              onClick={() => setIsRegister(true)}
            >
              注册
            </button>
          </div>

          {error && <div className="error-tip">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input
                type="text"
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名"
                required
              />
            </div>

            {isRegister && (
              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">密码</label>
              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入密码"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
              {loading ? '处理中...' : isRegister ? '注册' : '登录'}
            </button>
          </form>

          <div className="demo-tip">
            <p>演示账号：musiclover / 123456</p>
          </div>

          <div className="back-home">
            <Link to="/">← 返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
