import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from 'react-router-dom';
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import {
  Menu,
  X,
  Plus,
  ArrowLeft,
  LogOut,
  User,
  Search,
  Leaf,
  Sparkles,
  BarChart3,
  Heart,
  Home as HomeIcon,
} from 'lucide-react';
import TeaCard from '@/client/components/TeaCard';
import RecommendPanel from '@/client/components/RecommendPanel';

interface AppUser { id: string; username: string; }
interface TeaScores { aroma: number; taste: number; color: number; leaf: number; aftertaste: number; }
interface Tea { id: string; userId: string; name: string; origin: string; year: number; imageUrl: string; isFavorite: boolean; createdAt: string; latestTasting?: any; }
interface TastingRecord { id: string; userId: string; teaId: string; scores: TeaScores; totalScore: number; notes: string; createdAt: string; }

interface Ctx {
  currentUser: AppUser | null;
  setCurrentUser: (u: AppUser | null) => void;
  showAuth: () => void;
}
const AppContext = createContext<Ctx>({ currentUser: null, setCurrentUser: () => {}, showAuth: () => {} });
const useApp = () => useContext(AppContext);

const TEA_PLACEHOLDER = (seed: number, name: string) => {
  const EMOJIS = ['🍵', '🍃', '🌿', '🫖', '🍂'];
  const COLORS = [['#e8f5e9', '#a5d6a7'], ['#fce4ec', '#f48fb1'], ['#fff3e0', '#ffcc80'], ['#f3e5f5', '#ce93d8'], ['#e0f7fa', '#80deea']];
  const e = EMOJIS[seed % EMOJIS.length];
  const [c1, c2] = COLORS[seed % COLORS.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/></linearGradient></defs><rect width='200' height='200' fill='url(#g)'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='72'>${e}</text><text x='50%' y='88%' dominant-baseline='middle' text-anchor='middle' font-size='16' font-weight='bold' fill='#5d4037' font-family='sans-serif'>${(name || '茶').slice(0, 3)}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg.replace(/\s+/g, ' ')}`;
};
const DEFAULT_TEAS = [
  { name: '西湖龙井', origin: '浙江杭州', year: 2024, imageUrl: TEA_PLACEHOLDER(0, '龙') },
  { name: '云南普洱', origin: '云南西双版纳', year: 2020, imageUrl: TEA_PLACEHOLDER(1, '普') },
  { name: '正山小种', origin: '福建武夷山', year: 2023, imageUrl: TEA_PLACEHOLDER(2, '小') },
  { name: '福鼎白茶', origin: '福建福鼎', year: 2022, imageUrl: TEA_PLACEHOLDER(3, '白') },
  { name: '大红袍', origin: '福建武夷山', year: 2021, imageUrl: TEA_PLACEHOLDER(4, '袍') },
];

function AuthModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (u: AppUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setMsg(''); setUsername(''); setPassword(''); } }, [open]);
  if (!open) return null;

  const submit = async () => {
    if (!username || !password) { setMsg('请填写用户名和密码'); return; }
    setLoading(true); setMsg('');
    try {
      const res = await fetch(`/api/users/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) { onSuccess(data.user); onClose(); }
      else setMsg(data.message || '操作失败');
    } catch { setMsg('网络错误'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ width: 360, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#4a148c', margin: 0 }}>{mode === 'login' ? '登录' : '注册'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#999" /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: mode === m ? '#7b1fa2' : '#f3e5f5', color: mode === m ? '#fff' : '#7b1fa2', transition: 'all 0.2s' }}>
              {m === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>用户名</div>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="请输入用户名"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e1bee7', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor = '#7b1fa2'} onBlur={e => e.currentTarget.style.borderColor = '#e1bee7'} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>密码</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e1bee7', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor = '#7b1fa2'} onBlur={e => e.currentTarget.style.borderColor = '#e1bee7'} />
        </div>
        {msg && <div style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{msg}</div>}
        <button onClick={submit} disabled={loading}
          style={{ width: '100%', padding: '12px 0', borderRadius: 24, border: 'none', background: '#7b1fa2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,31,162,0.4)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
          {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
        </button>
      </div>
    </div>
  );
}

function Navbar({ onAuthClick }: { onAuthClick: () => void }) {
  const { currentUser, setCurrentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { path: '/', label: '茶叶库', icon: HomeIcon },
    { path: '/recommend', label: '智能推荐', icon: Sparkles },
    { path: '/statistics', label: '统计看板', icon: BarChart3 },
    { path: '/favorites', label: '我的收藏', icon: Heart },
  ];

  const logout = () => { setCurrentUser(null); localStorage.removeItem('tea_user'); navigate('/'); };

  return (
    <>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#7b1fa2', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', zIndex: 100, boxShadow: '0 2px 8px rgba(123,31,162,0.3)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', textDecoration: 'none' }}>
          <Leaf size={24} />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>茶馆品鉴</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 8 }} className="hide-mobile">
          {navLinks.map(l => {
            const Icon = l.icon;
            const active = location.pathname === l.path || (l.path === '/' && location.pathname === '/');
            const isActive = l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path);
            return (
              <Link key={l.path} to={l.path}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500, background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <Icon size={16} />{l.label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {currentUser ? (
            <>
              <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }} className="hide-mobile">
                <User size={16} />{currentUser.username}
              </span>
              <button onClick={logout}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <LogOut size={14} /><span className="hide-mobile">退出</span>
              </button>
            </>
          ) : (
            <button onClick={onAuthClick}
              style={{ padding: '6px 18px', borderRadius: 20, background: '#fff', color: '#7b1fa2', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
              登录/注册
            </button>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }} className="show-mobile">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, background: '#8e24aa', zIndex: 99, padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }} className="show-mobile">
          {navLinks.map(l => {
            const Icon = l.icon;
            const isActive = l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path);
            return (
              <Link key={l.path} to={l.path} onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500, background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                <Icon size={18} />{l.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState<'enter' | 'leave'>('enter');

  useEffect(() => {
    if (location !== displayLocation) { setPhase('leave'); setTimeout(() => { setDisplayLocation(location); setPhase('enter'); }, 300); }
  }, [location, displayLocation]);

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#fafafa' }}>
      <div key={displayLocation.pathname} style={{ transition: 'all 0.3s ease', opacity: phase === 'enter' ? 1 : 0, transform: phase === 'enter' ? 'translateX(0)' : 'translateX(-20px)' }}>
        {children}
      </div>
    </div>
  );
}

function useDefaultUser() {
  const { currentUser, setCurrentUser } = useApp();
  useEffect(() => {
    if (currentUser) return;
    const saved = localStorage.getItem('tea_user');
    if (saved) { try { setCurrentUser(JSON.parse(saved)); return; } catch {} }
    (async () => {
      try {
        const username = '茶友' + Math.floor(Math.random() * 10000);
        const res = await fetch('/api/users/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: '123456' }) });
        const data = await res.json();
        if (data.success) { setCurrentUser(data.user); localStorage.setItem('tea_user', JSON.stringify(data.user)); }
      } catch {}
    })();
  }, [currentUser, setCurrentUser]);
}

function HomePage() {
  const { currentUser } = useApp();
  useDefaultUser();
  const navigate = useNavigate();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', origin: '', year: new Date().getFullYear(), imageUrl: '' });
  const [init, setInit] = useState(false);

  const loadTeas = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/teas?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        let list = data.teas;
        if (!init && list.length === 0) {
          setInit(true);
          for (const t of DEFAULT_TEAS) {
            await fetch('/api/teas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id, ...t }) });
          }
          const r2 = await fetch(`/api/teas?userId=${currentUser.id}`);
          const d2 = await r2.json();
          if (d2.success) list = d2.teas;
        } else { setInit(true); }
        const enriched = await Promise.all(list.map(async (tea: any) => {
          try {
            const tr = await fetch(`/api/tastings?teaId=${tea.id}`);
            const td = await tr.json();
            if (td.success && td.tastings.length > 0) {
              const t3 = td.tastings.slice(0, 3);
              const notesArr = t3.flatMap((t: any) => {
                if (!t.notes || !String(t.notes).trim()) return [];
                const s = String(t.notes).trim();
                return [s.length > 40 ? s.slice(0, 40) + '…' : s];
              });
              return { ...tea, latestTasting: { totalScore: td.tastings[0].totalScore, notes: notesArr.length > 0 ? td.tastings[0].notes : '', latestNotes: notesArr.slice(0, 3) } };
            }
          } catch {}
          return tea;
        }));
        setTeas(enriched);
      }
    } catch {}
  };

  useEffect(() => { loadTeas(); }, [currentUser]);

  const toggleFavorite = async (id: string) => {
    try {
      await fetch(`/api/favorites/${id}`, { method: 'POST' });
      setTeas(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
    } catch {}
  };

  const submitAdd = async () => {
    if (!currentUser || !form.name) return;
    try {
      const res = await fetch('/api/teas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id, ...form }) });
      const data = await res.json();
      if (data.success) { setShowAdd(false); setForm({ name: '', origin: '', year: new Date().getFullYear(), imageUrl: '' }); loadTeas(); }
    } catch {}
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#4a148c', margin: 0 }}>茶叶库</h1>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 24, background: '#7b1fa2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,31,162,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
          <Plus size={18} />添加茶品
        </button>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }} onClick={() => setShowAdd(false)}>
          <div style={{ width: 400, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#4a148c', margin: 0 }}>添加茶品</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#999" /></button>
            </div>
            {[
              { k: 'name', label: '茶名 *', type: 'text' },
              { k: 'origin', label: '产地', type: 'text' },
              { k: 'year', label: '年份', type: 'number' },
              { k: 'imageUrl', label: '图片URL', type: 'text' },
            ].map(({ k, label, type }) => (
              <div key={k} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{label}</div>
                <input type={type} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e1bee7', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#7b1fa2'} onBlur={e => e.currentTarget.style.borderColor = '#e1bee7'} />
              </div>
            ))}
            <button onClick={submitAdd}
              style={{ width: '100%', padding: '12px 0', borderRadius: 24, border: 'none', background: '#7b1fa2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,31,162,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>确认添加</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
        {teas.map(t => (
          <TeaCard key={t.id} id={t.id} name={t.name} origin={t.origin} year={t.year} imageUrl={t.imageUrl} isFavorite={t.isFavorite} latestTasting={t.latestTasting}
            onTasting={id => navigate(`/tasting/${id}`)} onToggleFavorite={toggleFavorite} />
        ))}
        {teas.length === 0 && <div style={{ padding: '80px 0', color: '#999', fontSize: 14 }}>加载中...</div>}
      </div>
    </div>
  );
}

function TastingPage() {
  const { teaId } = useParams<{ teaId: string }>();
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [tea, setTea] = useState<Tea | null>(null);
  const [tastings, setTastings] = useState<TastingRecord[]>([]);
  const [scores, setScores] = useState<TeaScores>({ aroma: 5, taste: 5, color: 5, leaf: 5, aftertaste: 5 });
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!teaId) return;
    (async () => {
      try {
        if (currentUser) {
          const tr = await fetch(`/api/teas?userId=${currentUser.id}`);
          const td = await tr.json();
          if (td.success) setTea(td.teas.find((t: Tea) => t.id === teaId) || null);
        }
        const tr2 = await fetch(`/api/tastings?teaId=${teaId}`);
        const td2 = await tr2.json();
        if (td2.success) setTastings(td2.tastings);
      } catch {}
    })();
  }, [teaId, currentUser]);

  const dims: { k: keyof TeaScores; label: string }[] = [
    { k: 'aroma', label: '香气' }, { k: 'taste', label: '滋味' }, { k: 'color', label: '汤色' }, { k: 'leaf', label: '叶底' }, { k: 'aftertaste', label: '回甘' },
  ];

  const submit = async () => {
    if (!currentUser || !teaId) return;
    try {
      const res = await fetch('/api/tastings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id, teaId, scores, notes }) });
      const data = await res.json();
      if (data.success) {
        setToast('品鉴记录保存成功！');
        setTimeout(() => { setToast(''); navigate('/'); }, 2000);
        const tr2 = await fetch(`/api/tastings?teaId=${teaId}`);
        const td2 = await tr2.json();
        if (td2.success) setTastings(td2.tastings);
      }
    } catch {}
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 40px' }}>
      <div onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#7b1fa2', fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={16} /> 返回茶叶库
      </div>

      {tea && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(123,31,162,0.08)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={tea.imageUrl && !tea.imageUrl.includes('unsplash') ? tea.imageUrl : TEA_PLACEHOLDER(tea.id.charCodeAt(tea.id.length-1), tea.name)} alt={tea.name}
            style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #ce93d8', objectFit: 'cover' }}
            onError={e => (e.currentTarget as HTMLImageElement).src = TEA_PLACEHOLDER(0, tea.name)} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#4a148c', margin: '0 0 4px' }}>{tea.name}</h1>
            <div style={{ fontSize: 14, color: '#757575' }}>{tea.origin} · {tea.year}年</div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(123,31,162,0.08)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#4a148c', margin: '0 0 20px' }}>品鉴评分</h2>
        {dims.map(({ k, label }) => {
          const val = scores[k];
          return (
            <div key={k} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 48, fontSize: 14, color: '#4a148c', fontWeight: 500 }}>{label}</span>
                <div style={{ flex: 1, maxWidth: 220, position: 'relative' }}>
                  <div style={{ position: 'relative', height: 6 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: 'linear-gradient(to right, #e0e0e0, #e0e0e0)' }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(val / 10) * 100}%`, borderRadius: 3, background: 'linear-gradient(to right, #ce93d8, #7b1fa2)' }} />
                  </div>
                  <input type="range" min={1} max={10} step={1} value={val} onChange={e => setScores({ ...scores, [k]: parseInt(e.target.value) })}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: 6, opacity: 0, cursor: 'pointer', margin: 0 }} />
                  <div style={{ position: 'relative', width: 18, height: 18, borderRadius: '50%', background: '#fff', border: '3px solid #7b1fa2', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', pointerEvents: 'none', marginTop: -12, left: `calc(${(val / 10) * 100}% - 9px)` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', pointerEvents: 'none' }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const pct = n <= val ? (val / 10) : 0;
                      const r = Math.round(206 + (123 - 206) * pct);
                      const g = Math.round(158 + (31 - 158) * pct);
                      const b = Math.round(231 + (162 - 231) * pct);
                      return <div key={n} style={{ width: 8, height: 8, borderRadius: '50%', background: n <= val ? `rgb(${r},${g},${b})` : '#e0e0e0' }} />;
                    })}
                  </div>
                </div>
                <span style={{ width: 32, fontSize: 18, fontWeight: 700, color: '#7b1fa2', textAlign: 'right' }}>{val}</span>
              </div>
            </div>
          );
        })}
        <div style={{ marginBottom: 20 }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="记录您的品鉴感受..." rows={5}
            style={{ width: '100%', height: 120, padding: 14, border: `1px solid ${focused ? '#7b1fa2' : '#ce93d8'}`, borderRadius: 8, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', background: focused ? 'rgba(123,31,162,0.03)' : '#fff', transition: 'all 0.2s', fontFamily: 'inherit', lineHeight: 1.6 }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={submit}
            style={{ padding: '12px 36px', borderRadius: 24, background: '#7b1fa2', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,31,162,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
            提交品鉴
          </button>
        </div>
      </div>

      {tastings.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(123,31,162,0.08)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#4a148c', margin: '0 0 16px' }}>历史记录</h2>
          {tastings.map((t, i) => (
            <div key={t.id} style={{ padding: '16px 0', borderBottom: i === tastings.length - 1 ? 'none' : '1px solid #f3e5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#7b1fa2' }}>总分 {t.totalScore}</span>
                <span style={{ fontSize: 12, color: '#999' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                {dims.map(d => <span key={d.k} style={{ fontSize: 12, color: '#666' }}>{d.label} {t.scores[d.k]}</span>)}
              </div>
              {t.notes && <div style={{ fontSize: 13, color: '#757575', lineHeight: 1.6 }}>{t.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'rgba(76,175,80,0.95)', color: '#fff', padding: '12px 28px', borderRadius: 24, fontSize: 14, fontWeight: 500, zIndex: 300, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>{toast}</div>
      )}
    </div>
  );
}

function RecommendPage() {
  const { currentUser } = useApp();
  useDefaultUser();
  const navigate = useNavigate();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [tastings, setTastings] = useState<TastingRecord[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([fetch(`/api/teas?userId=${currentUser.id}`), fetch(`/api/statistics?userId=${currentUser.id}`)]);
        const d1 = await r1.json(); const d2 = await r2.json();
        if (d1.success) setTeas(d1.teas);
      } catch {}
    })();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all(teas.map(t => fetch(`/api/tastings?teaId=${t.id}`).then(r => r.json())))
      .then(arr => setTastings(arr.flatMap((a: any) => a.success ? a.tastings : [])));
  }, [teas, currentUser]);

  return <RecommendPanel teas={teas as any} tastings={tastings as any} onSelectTea={id => navigate(`/tasting/${id}`)} />;
}

function RadarChart({ data, dimLabels }: { data: number[]; dimLabels: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const t0 = performance.now();
    const W = 300, H = 300, cx = W / 2, cy = H / 2, R = 110, N = dimLabels.length;
    ctx.clearRect(0, 0, W, H);
    for (let ring = 5; ring >= 1; ring--) {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
        const r = (R * ring) / 5;
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.strokeStyle = '#e1bee7'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      ctx.strokeStyle = '#e1bee7'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath();
    const max = 10;
    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
      const r = (R * (data[i] || 0)) / max;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(206,147,216,0.5)'; ctx.fill();
    ctx.strokeStyle = '#ce93d8'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
      const r = (R * (data[i] || 0)) / max;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#7b1fa2'; ctx.fill();
      const lx = cx + Math.cos(ang) * (R + 22), ly = cy + Math.sin(ang) * (R + 22);
      ctx.fillStyle = '#4a148c'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(dimLabels[i], lx, ly);
    }
    console.log('Radar render:', Math.round(performance.now() - t0), 'ms');
  }, [data, dimLabels]);
  return <canvas ref={ref} width={300} height={300} style={{ animation: 'fadeIn 0.5s ease-out' }} />;
}

function Heatmap({ data }: { data: number[][] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const t0 = performance.now();
    const cell = 50, cols = 7, rows = data.length;
    canvas.width = cols * cell; canvas.height = rows * cell;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let max = 1;
    data.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    const c1 = [243, 229, 245], c2 = [74, 20, 140];
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#999'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = data[r][c], t = Math.min(v / max, 1);
        const rr = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const gg = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const bb = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
        ctx.fillStyle = t > 0.5 ? '#fff' : '#4a148c';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(String(v), c * cell + cell / 2, r * cell + cell / 2);
      }
    }
    console.log('Heatmap render:', Math.round(performance.now() - t0), 'ms');
  }, [data]);
  return <canvas ref={ref} style={{ animation: 'fadeIn 0.5s ease-out', borderRadius: 8 }} />;
}

function StatisticsPage() {
  const { currentUser } = useApp();
  useDefaultUser();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await fetch(`/api/statistics?userId=${currentUser.id}`);
        const d = await res.json();
        if (d.success) setStats(d.statistics);
      } catch {}
    })();
  }, [currentUser]);

  const dims = ['香气', '滋味', '汤色', '叶底', '回甘'];
  const avgArr = stats?.dimensionAverages ? (['aroma','taste','color','leaf','aftertaste'] as const).map(k => (stats.dimensionAverages as any)[k] || 0) : [0, 0, 0, 0, 0];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#4a148c', margin: '0 0 24px' }}>统计看板</h1>
      <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(123,31,162,0.08)' }}>
          <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>总品鉴次数</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#7b1fa2', lineHeight: 1 }}>{stats?.totalTastings || 0}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(123,31,162,0.08)' }}>
          <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>平均分</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#ce93d8', lineHeight: 1 }}>{stats?.averageScore || 0}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(123,31,162,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#4a148c', margin: '0 0 16px' }}>五维雷达图</h3>
          <RadarChart data={avgArr} dimLabels={dims} />
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(123,31,162,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#4a148c', margin: '0 0 16px' }}>本月品鉴热力图</h3>
          <Heatmap data={stats?.monthlyHeatmap || [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]} />
        </div>
      </div>
    </div>
  );
}

function FavoritesPage() {
  const { currentUser } = useApp();
  useDefaultUser();
  const navigate = useNavigate();
  const [favs, setFavs] = useState<Tea[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await fetch(`/api/favorites?userId=${currentUser.id}`);
        const d = await res.json();
        if (d.success) setFavs(d.favorites);
      } catch {}
    })();
  }, [currentUser]);

  const toggleFavorite = async (id: string) => {
    try {
      await fetch(`/api/favorites/${id}`, { method: 'POST' });
      setFavs(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const filtered = favs.filter(t => t.name.includes(q) || String(t.year).includes(q));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#4a148c', margin: '0 0 20px' }}>我的收藏</h1>
      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 400 }}>
        <Search size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索茶名或年份..."
          style={{ width: '100%', padding: '12px 14px 12px 42px', border: '1px solid #e1bee7', borderRadius: 24, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
          onFocus={e => e.currentTarget.style.borderColor = '#7b1fa2'} onBlur={e => e.currentTarget.style.borderColor = '#e1bee7'} />
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#999', fontSize: 14 }}>
          {favs.length === 0 ? '还没有收藏的茶品~' : '没有匹配的结果'}
        </div>
      ) : (
        <div style={{ columns: 'auto 220px', columnGap: 20 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ breakInside: 'avoid', marginBottom: 20 }}>
              <TeaCard id={t.id} name={t.name} origin={t.origin} year={t.year} imageUrl={t.imageUrl} isFavorite={t.isFavorite} latestTasting={t.latestTasting}
                onTasting={id => navigate(`/tasting/${id}`)} onToggleFavorite={toggleFavorite} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(() => {
    try { const s = localStorage.getItem('tea_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [authOpen, setAuthOpen] = useState(false);

  const setCurrentUser = (u: AppUser | null) => {
    setCurrentUserState(u);
    if (u) localStorage.setItem('tea_user', JSON.stringify(u));
    else localStorage.removeItem('tea_user');
  };

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, showAuth: () => setAuthOpen(true) }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hide-mobile { display: flex; }
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        @media (max-width: 1024px) and (min-width: 769px) {
        }
      `}</style>
      <Router>
        <Navbar onAuthClick={() => setAuthOpen(true)} />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasting/:teaId" element={<TastingPage />} />
            <Route path="/recommend" element={<RecommendPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageWrapper>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={setCurrentUser} />
      </Router>
    </AppContext.Provider>
  );
}
