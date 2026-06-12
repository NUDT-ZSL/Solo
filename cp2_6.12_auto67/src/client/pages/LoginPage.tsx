import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败，请重试');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, var(--bg-cream) 0%, #FFEFD5 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px 32px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-orange))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}
          >
            书影音收藏
          </h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '14px' }}>
            记录你读过的书、看过的电影、听过的音乐
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            backgroundColor: '#f5f5f5',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '28px',
          }}
        >
          {[{ key: 'login', label: '登录' }, { key: 'register', label: '注册' }].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setIsLogin(tab.key === 'login');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                backgroundColor: isLogin === (tab.key === 'login') ? 'white' : 'transparent',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                color: isLogin === (tab.key === 'login') ? 'var(--primary-purple)' : 'var(--text-gray)',
                borderRadius: '8px',
                boxShadow: isLogin === (tab.key === 'login') ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-gray)' }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              placeholder="请输入用户名"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid ' + (focusedField === 'username' ? 'var(--primary-purple)' : 'var(--border-light)'),
                borderRadius: '10px',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                color: 'var(--text-dark)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-gray)' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="请输入密码"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid ' + (focusedField === 'password' ? 'var(--primary-purple)' : 'var(--border-light)'),
                borderRadius: '10px',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                color: 'var(--text-dark)',
              }}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                color: '#E74C3C',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-orange))',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'transform 0.2s ease',
            }}
          >
            {isLogin ? '登录' : '注册'}
          </motion.button>
        </form>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '8px' }}>
            演示账号：
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-dark)' }}>
            用户名：<strong>demo</strong>
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-dark)' }}>
            密码：<strong>123456</strong>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
