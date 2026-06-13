import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { login } from '../api';
import { useAppStore } from '../store';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [email, setEmail] = useState('lin@example.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setUser(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold)', color: 'var(--nav-start)', fontSize: 32, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(240,165,0,0.3)' }}>S</div>
        </div>
        <h1 className="auth-title">欢迎回来 👋</h1>
        <p className="auth-subtitle">登录 SkillSwap，继续你的技能之旅</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="请输入密码" />
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-primary btn-large btn-full" disabled={loading} style={{ marginTop: 8 }}>
            <LogIn size={18} /> {loading ? '登录中…' : '登录'}
          </button>
        </form>
        <div className="form-foot">
          还没有账号？<Link to="/register">立即注册 →</Link>
        </div>
        <div style={{ marginTop: 20, padding: 12, background: '#f8f9fc', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          💡 测试账号：lin@example.com / wang@example.com / chen@example.com<br />
          密码均为：123456
        </div>
      </div>
    </div>
  );
}
