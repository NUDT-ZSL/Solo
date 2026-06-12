import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import BoardList from './BoardList';
import BoardDetail from './BoardDetail';

interface User {
  id: string;
  username: string;
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
        navigate('/boards');
      } else {
        setError(data.message);
      }
    } catch {
      setError('登录失败，请稍后重试');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <h1 style={styles.title}>🏠 灵感墙</h1>
        <p style={styles.subtitle}>收集你的房间装饰灵感</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="请输入用户名"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="请输入密码"
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>
            登录
          </button>
          <p style={styles.hint}>演示账号: demo / 123456</p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4F8',
  },
  loginCard: {
    width: '400px',
    padding: '48px 40px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    textAlign: 'center',
    color: '#1e293b',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '12px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    textAlign: 'center',
  },
  hint: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '8px',
  },
};

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('inspiration-user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('inspiration-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('inspiration-user');
    }
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/boards" /> : <LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="/boards"
        element={user ? <BoardList user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
      <Route
        path="/boards/:boardId"
        element={user ? <BoardDetail user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<Navigate to={user ? "/boards" : "/login"} />} />
    </Routes>
  );
}

export default App;
