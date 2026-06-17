import { useState } from 'react';
import { useApi } from '@/hooks/useApi';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSuccess?: () => void;
  onSwitchMode: () => void;
}

export default function AuthForm({ mode, onSuccess, onSwitchMode }: AuthFormProps) {
  const { login, register } = useApi();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        style={{
          width: 360,
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--secondary)',
            marginBottom: 8,
          }}
        >
          RecipeGit
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: '#666',
            marginBottom: 24,
          }}
        >
          食谱版本管理
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 6,
                color: '#333',
              }}
            >
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 6,
                color: '#333',
              }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{ width: '100%' }}
              required
            />
          </div>

          {error && (
            <div
              style={{
                color: 'red',
                fontSize: 13,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            textAlign: 'center',
            fontSize: 14,
            color: '#666',
          }}
        >
          {mode === 'login' ? (
            <>
              没有账号？
              <button
                type="button"
                onClick={onSwitchMode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  marginLeft: 4,
                }}
              >
                去注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button
                type="button"
                onClick={onSwitchMode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  marginLeft: 4,
                }}
              >
                去登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
