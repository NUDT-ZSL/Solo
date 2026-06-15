import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError('请输入有效的经纬度');
      return;
    }

    setLoading(true);

    try {
      const result = await authAPI.register({
        username,
        password,
        email,
        latitude: lat,
        longitude: lng,
      });
      login(result.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <i className="fas fa-book-open"></i>
          </div>
          <h1>创建账号</h1>
          <p>加入书缘，开启你的图书交换之旅</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>用户名</label>
            <div className="input-wrapper">
              <i className="fas fa-user"></i>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>邮箱</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>密码</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位字符"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>确认密码</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>纬度</label>
              <div className="input-wrapper">
                <i className="fas fa-map-marker-alt"></i>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="如 39.9042"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>经度</label>
              <div className="input-wrapper">
                <i className="fas fa-map-marker-alt"></i>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="如 116.4074"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                注册中...
              </>
            ) : (
              '注册'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>已有账号？</span>
          <Link to="/login" className="auth-link">
            立即登录
          </Link>
        </div>
      </div>
    </div>
  );
}
