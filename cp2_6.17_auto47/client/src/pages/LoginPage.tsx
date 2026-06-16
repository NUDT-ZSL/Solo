import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.isAdmin ? '/admin' : '/home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 40,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <BookOpen size={28} style={{ color: '#d97706' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#292524' }}>
            欢迎回来
          </h1>
          <p style={{ color: '#78716c', marginTop: 6, fontSize: 14 }}>
            登录你的账号继续漂流
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: 12,
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#57534e',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#57534e',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 15,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 14,
            color: '#78716c',
          }}
        >
          还没有账号？
          <Link to="/register" style={{ fontWeight: 500 }}>
            立即注册
          </Link>
        </p>
        <p
          style={{
            textAlign: 'center',
            marginTop: 12,
            fontSize: 12,
            color: '#a8a29e',
          }}
        >
          管理员测试账号：admin@example.com / admin123
        </p>
        <p
          style={{
            textAlign: 'center',
            marginTop: 4,
            fontSize: 12,
            color: '#a8a29e',
          }}
        >
          普通用户测试：xiaoming@example.com / 123456
        </p>
      </div>
    </div>
  );
}
