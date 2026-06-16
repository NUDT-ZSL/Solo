import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, password: string) => Promise<boolean>;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('两次密码不一致');
        return;
      }
      if (password.length < 4) {
        setError('密码至少4位');
        return;
      }
    }

    setLoading(true);
    try {
      const success = mode === 'login'
        ? await onLogin(username.trim(), password)
        : await onRegister(username.trim(), password);

      if (success) {
        resetForm();
        onClose();
      } else {
        setError(mode === 'login' ? '用户名或密码错误' : '注册失败，用户名可能已存在');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '360px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '28px',
          animation: 'scaleIn 0.3s ease-out',
          transformOrigin: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '22px',
              fontFamily: '"Ma Shan Zheng", serif',
              color: '#2c2a26'
            }}
          >
            {mode === 'login' ? '登录古琴谱' : '注册账号'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f5f0e8',
              color: '#8b5a2b',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e8ddcb';
              e.currentTarget.style.filter = 'hue-rotate(-10deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f0e8';
              e.currentTarget.style.filter = 'hue-rotate(0)';
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            borderRadius: '10px',
            backgroundColor: '#f5f0e8',
            padding: '4px',
            marginBottom: '20px'
          }}
        >
          <button
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: mode === 'login' ? '#8b5a2b' : 'transparent',
              color: mode === 'login' ? '#fff' : '#8b5a2b',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: '"ZCOOL XiaoWei", serif',
              fontWeight: mode === 'login' ? 600 : 400,
              transition: 'all 0.2s ease'
            }}
          >
            登录
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: mode === 'register' ? '#8b5a2b' : 'transparent',
              color: mode === 'register' ? '#fff' : '#8b5a2b',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: '"ZCOOL XiaoWei", serif',
              fontWeight: mode === 'register' ? 600 : 400,
              transition: 'all 0.2s ease'
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: '#5c4033',
                marginBottom: '6px',
                fontFamily: '"ZCOOL XiaoWei", serif'
              }}
            >
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #e6dcd0',
                backgroundColor: '#faf5ef',
                fontSize: '14px',
                color: '#2c2a26',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                fontFamily: '"ZCOOL XiaoWei", serif',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d4a373'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e6dcd0'; }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: '#5c4033',
                marginBottom: '6px',
                fontFamily: '"ZCOOL XiaoWei", serif'
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
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #e6dcd0',
                backgroundColor: '#faf5ef',
                fontSize: '14px',
                color: '#2c2a26',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                fontFamily: '"ZCOOL XiaoWei", serif',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d4a373'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e6dcd0'; }}
            />
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#5c4033',
                  marginBottom: '6px',
                  fontFamily: '"ZCOOL XiaoWei", serif'
                }}
              >
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e6dcd0',
                  backgroundColor: '#faf5ef',
                  fontSize: '14px',
                  color: '#2c2a26',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#d4a373'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e6dcd0'; }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#fdecea',
                color: '#c0392b',
                fontSize: '13px',
                marginBottom: '14px',
                fontFamily: '"ZCOOL XiaoWei", serif'
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
              padding: '12px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#8b5a2b',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: '"ZCOOL XiaoWei", serif',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#6d4520';
                e.currentTarget.style.filter = 'hue-rotate(-10deg)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8b5a2b';
              e.currentTarget.style.filter = 'hue-rotate(0)';
            }}
          >
            {loading ? '处理中...' : mode === 'login' ? '登 录' : '注 册'}
          </button>
        </form>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.85); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AuthModal;
