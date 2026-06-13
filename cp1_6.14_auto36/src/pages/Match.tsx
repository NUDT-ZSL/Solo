import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, Sparkles, UsersRound, MessageCircleHeart, LogIn, UserPlus, LogOut, Search as SearchIcon, Zap, Eye, MessageSquare, Handshake } from 'lucide-react';
import { getMatches, type MatchResult } from '../api';
import { useAppStore } from '../store';
import { SKILL_TAGS } from '../utils';

export default function Match() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppStore();
  const [canTeach, setCanTeach] = useState<string[]>([]);
  const [wantLearn, setWantLearn] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toggleCan = (tag: string) => {
    setCanTeach((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 3 ? prev : [...prev, tag]
    );
  };
  const toggleWant = (tag: string) => {
    setWantLearn((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 3 ? prev : [...prev, tag]
    );
  };

  const doMatch = async () => {
    if (canTeach.length === 0 && wantLearn.length === 0) {
      setToast('请至少选择一项能教或想学的技能');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await getMatches(canTeach, wantLearn);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.canTeach?.length || user?.wantLearn?.length) {
      setCanTeach(user.canTeach.slice(0, 3));
      setWantLearn(user.wantLearn.slice(0, 3));
    }
  }, [user?._id]);

  const navItem = (to: string, label: string, icon?: React.ReactNode) => {
    const active = location.pathname === to;
    return (
      <Link to={to} className={`nav-link${active ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
        {icon} {label}
      </Link>
    );
  };

  const allTags = useMemo(() => SKILL_TAGS, []);

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
            <SearchIcon size={18} />
            <input type="text" placeholder="搜索技能…" onClick={() => navigate('/')} readOnly />
          </div>
          <div className="nav-actions">
            {!user ? (
              <>
                <Link to="/login" className="btn btn-ghost"><LogIn size={16} /> 登录</Link>
                <Link to="/register" className="btn btn-primary"><UserPlus size={16} /> 注册</Link>
              </>
            ) : (
              <div className="nav-user" onClick={logout} title="退出登录">
                <img className="nav-user-avatar" src={user.avatar} alt={user.nickname} />
                <span className="nav-user-name">{user.nickname}</span>
                <LogOut size={14} />
              </div>
            )}
            <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-menu open">
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

      <div className="container match-page">
        <div className="hero">
          <h1>🤝 寻找技能交换伙伴</h1>
          <p>选择你能教的 和 想学的技能，系统用 Jaccard 相似系数为你匹配最合适的伙伴。</p>
        </div>

        <div className="tag-selector">
          <div className="tag-row">
            <div className="tag-row-label">
              <span>🎓 我能教（最多选 3 项）</span>
              <span className="tag-count">{canTeach.length}/3</span>
            </div>
            <div className="tag-cloud">
              {allTags.map((t) => (
                <div
                  key={t}
                  className={`tag-chip ${canTeach.includes(t) ? 'selected-can' : ''}`}
                  onClick={() => toggleCan(t)}
                >
                  {canTeach.includes(t) && '✓ '}{t}
                </div>
              ))}
            </div>
          </div>

          <div className="tag-row">
            <div className="tag-row-label">
              <span>📚 我想学（最多选 3 项）</span>
              <span className="tag-count">{wantLearn.length}/3</span>
            </div>
            <div className="tag-cloud">
              {allTags.map((t) => (
                <div
                  key={t}
                  className={`tag-chip ${wantLearn.includes(t) ? 'selected' : ''}`}
                  onClick={() => toggleWant(t)}
                >
                  {wantLearn.includes(t) && '✓ '}{t}
                </div>
              ))}
            </div>
          </div>

          <div className="match-btn">
            <button className="btn btn-primary btn-large" onClick={doMatch} disabled={loading}>
              <Zap size={18} /> {loading ? '匹配中…' : '开始智能匹配'}
            </button>
          </div>
        </div>

        {!searched ? (
          <div className="empty-state" style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow)', minHeight: 220 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✨</div>
            <div>请选择「能教」和「想学」的技能，然后点击开始匹配</div>
            <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
              匹配算法：Jaccard 相似系数 = 交集 / 并集，≥ 0.3 视为潜在伙伴
            </div>
          </div>
        ) : loading ? (
          <div className="