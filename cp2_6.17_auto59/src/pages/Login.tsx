import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('李娜');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(name, password);
    setLoading(false);

    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('用户名或密码错误，请重试');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3949ab 0%, #5c6bc0 50%, #7986cb 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 48,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(57,73,171,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#3949ab',
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            TeamReport
          </div>
          <div style={{ fontSize: 14, color: '#757575' }}>
            团队工作汇报管理系统
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#424242',
                marginBottom: 8,
              }}
            >
              用户名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入用户名"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                transition: 'all 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#3949ab';
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  '0 0 0 3px rgba(57,73,171,0.1)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#e0e0e0';
                (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#424242',
                marginBottom: 8,
              }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                transition: 'all 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#3949ab';
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  '0 0 0 3px rgba(57,73,171,0.1)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#e0e0e0';
                (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: 12,
                background: '#ffebee',
                color: '#c62828',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              background: '#3949ab',
              color: '#ffffff',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              transition: 'all 0.15s',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background = '#303f9f';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#3949ab';
            }}
            onMouseDown={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div
          style={{
            marginTop: 32,
            padding: 16,
            background: '#f5f5f5',
            borderRadius: 8,
            fontSize: 12,
            color: '#757575',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#424242' }}>演示账号：</div>
          <div>管理员：张伟 / 123456</div>
          <div>成员：李娜 / 123456</div>
          <div>成员：王强 / 123456</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
