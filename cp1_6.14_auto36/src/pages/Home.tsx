import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, LogIn, UserPlus, Sparkles, MessageCircleHeart, UsersRound, LogOut } from 'lucide-react';
import { getSkills, type Skill } from '../api';
import { useAppStore } from '../store';
import { categoryIcon, debounce } from '../utils';

function truncate(str: string, n: number) {
  return str.replace(/[#*`>\n]/g, '').length > n ? str.replace(/[#*`>\n]/g, '').slice(0, n) + '…' : str.replace(/[#*`>\n]/g, '');
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppStore();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSkills(searchQuery || undefined)
      .then(setSkills)
      .finally(() => setLoading(false));
  }, [searchQuery]);

  const debouncedSearch = useMemo(
    () => debounce((v: string) => setSearchQuery(v), 300),
    []
  );

  const onSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setSearch(v);
      debouncedSearch(v);
    },
    [debouncedSearch]
  );

  const navItem = (to: string, label: string, icon?: React.ReactNode) => {
    const active = location.pathname === to;
    return (
      <Link to={to} className={`nav-link${active ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
        {icon} {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="logo">
            <div className="logo-circle">S</div>
            <span className="logo-text">SkillSwap</span>
          </Link>

          <div className="nav-links">
            {navItem('/', '探索', <Sparkles size={14} />)}
            {navItem('/match', '找伙伴', <UsersRound size={14} />)}
            {user && navItem('/messages', '消息', <MessageCircleHeart size={14} />)}
          </div>

          <div className="nav-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="搜索技能、老师或话题…"
              value={search}
              onChange={onSearch}
            />
          </div>

          <div className="nav-actions">
            {!user ? (
              <>
                <Link to="/login" className="btn btn-ghost"><LogIn size={16} /> 登录</Link>
                <Link to="/register" className="btn btn-primary"><UserPlus size={16} /> 注册</Link>
              </>
            ) : (
              <>
                <div className="nav-user" onClick={logout} title="退出登录">
                  <img className="nav-user-avatar" src={user.avatar} alt={user.nickname} />
                  <span className="nav-user-name">{user.nickname}</span>
                  <LogOut size={14} />
                </div>
              </>
            )}
            <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-menu open">
            <div className="nav-search" style={{ marginBottom: 12 }}>
              <Search size={18} />
              <input type="text" placeholder="搜索技能…" value={search} onChange={onSearch} />
            </div>
            {navItem('/', '探索')}
            {navItem('/match', '寻找伙伴')}
            {user && navItem('/messages', '我的消息')}
            {!user ? (
              <>
                <Link to="/login" className="nav-link">登录</Link>
                <Link to="/register" className="nav-link">注册</Link>
              </>
            ) : (
              <div className="nav-link" onClick={() => { logout(); setMobileOpen(false); }}>退出登录</div>
            )}
          </div>
        )}
      </nav>

      <div className="container page">
        <div className="hero">
          <h1>✨ 发现身边的技能交换</h1>
          <p>用你会的，换你想学的 —— 让每一次交换都成为美好相遇。</p>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div>正在加载技能…</div>
        ) : skills.length === 0 ? (
          <div className="empty-state" style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow)', minHeight: 260 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div>没有找到与「{searchQuery || ''}」相关的技能</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>试试其他关键词吧</div>
          </div>
        ) : (
          <div className="skills-grid">
            {skills.map((s) => (
              <div
                key={s._id}
                className="skill-card"
                onClick={() => navigate(`/skill/${s._id}`)}
              >
                <div className="skill-cover" style={{ background: s.coverColor }}>
                  <div className="skill-cover-icon">{categoryIcon(s.category)}</div>
                  <span className="skill-category-tag">#{s.category}</span>
                </div>
                <div className="skill-info">
                  <h3 className="skill-title" title={s.title}>{s.title}</h3>
                  <div className="skill-teacher">
                    <img src={s.teacherAvatar} alt={s.teacherName} />
                    <span>by {s.teacherName}</span>
                  </div>
                  <p className="skill-desc">{truncate(s.description, 60)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
