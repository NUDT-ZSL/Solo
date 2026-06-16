import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login, setAuth } from '../api';
import { User } from '../types';
import './AuthPage.css';

interface AuthPageProps {
  onLogin: (user: User) => void;
  showToast: (msg: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, showToast }) => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) {
      showToast('请填写昵称和密码');
      return;
    }
    if (password.length < 3) {
      showToast('密码至少3位');
      return;
    }
    setLoading(true);
    try {
      const res = isRegister
        ? await register(nickname.trim(), avatar.trim(), password)
        : await login(nickname.trim(), password);
      setAuth(res.token, res.user);
      onLogin(res.user);
      showToast(isRegister ? '注册成功！' : '登录成功！');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || '操作失败，请重试';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">☕</div>
          <h1 className="auth-title">拼单咖啡角</h1>
          <p className="auth-subtitle">连接每一杯好咖啡</p>
        </div>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
          >
            登录
          </button>
          <button
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
          >
            注册
          </button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">昵称</label>
            <input
              className="auth-input"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              maxLength={20}
            />
          </div>
          {isRegister && (
            <div className="auth-field">
              <label className="auth-label">头像URL（可选）</label>
              <input
                className="auth-input"
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="粘贴头像图片链接"
              />
            </div>
          )}
          <div className="auth-field">
            <label className="auth-label">密码</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              minLength={3}
            />
          </div>
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? '处理中...' : (isRegister ? '注册并登录' : '登录')}
          </button>
        </form>
        <p className="auth-footer">
          {isRegister ? '已有账号？' : '还没有账号？'}
          <button className="auth-switch" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
