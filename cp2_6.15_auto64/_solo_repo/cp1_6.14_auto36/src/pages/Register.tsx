import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { register } from '../api';
import { useAppStore } from '../store';

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await register(nickname, email, password);
      setUser(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 32, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(233,69,96,0.3)' }}>S</div>
        </div>
        <h1 className="auth-title">加入 SkillSwap 🎉</h1>
        <p className="auth-subtitle">创建账号，开启你的技能交换之旅</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">昵称</label>
            <input className="form-input" value={nickname} onChange={(e) => setNickname(e.target.value)} required placeholder="你的昵称" minLength={2} />
          </div>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="至少6位" minLength={6} />
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-primary btn-large btn-full" disabled={loading} style={{ marginTop: 8 }}>
            <UserPlus size={18} /> {loading ? '创建中…' : '创建账号'}
          </button>
        </form>
        <div className="form-foot">
          已有账号？<Link to="/login">去登录 →</Link>
        </div>
      </div>
    </div>
  );
}
