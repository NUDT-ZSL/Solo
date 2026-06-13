import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Menu, X, Search, Sparkles, UsersRound, MessageCircleHeart, LogIn, UserPlus, LogOut, Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { getConversationList, getMessages, sendMessage, type Conversation, type Message as MsgType } from '../api';
import { useAppStore } from '../store';
import { formatTime } from '../utils';

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { peerId } = useParams<{ peerId?: string }>();
  const { user, logout } = useAppStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MsgType[]>([]);
  const [input, setInput] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showList, setShowList] = useState(true);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const activePeerId = peerId || conversations[0]?.peerId;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoadingConv(true);
    getConversationList()
      .then(setConversations)
      .finally(() => setLoadingConv(false));
  }, [user, navigate]);

  useEffect(() => {
    if (!activePeerId || !user) return;
    setLoadingMsg(true);
    getMessages(activePeerId)
      .then(setMessages)
      .finally(() => setLoadingMsg(false));
  }, [activePeerId, user]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !activePeerId) return;
    const content = input.trim();
    setInput('');
    const temp: MsgType = {
      _id: 'temp-' + Date.now(),
      from: user!._id,
      to: activePeerId,
      content,
      read: false,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, temp]);
    try {
      const actual = await sendMessage(activePeerId, content);
      setMessages((prev) => prev.map((m) => (m._id === temp._id ? actual : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
    }
  };

  const activePeer = conversations.find((c) => c.peerId === activePeerId)?.peer;

  const navItem = (to: string, label: string, icon?: React.ReactNode) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link to={to} className={`nav-link${active ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
        {icon} {label}
      </Link>
    );
  };

  if (!user) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title">请先登录 🔐</h1>
          <p className="auth-subtitle">登录后即可查看消息</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/login" className="btn btn-primary btn-full">去登录</Link>
            <Link to="/" className="btn btn-outline btn-full">返回首页</Link>
          </div>
        </div>
      </div>
    );
  }

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
            {navItem('/messages', '消息', <MessageCircleHeart size={14} />)}
          </div>
          <div className="nav-actions">
            <div className="nav-user" onClick={logout} title="退出登录">
              <img className="nav-user-avatar" src={user.avatar} alt={user.nickname} />
              <span className="nav-user-name">{user.nickname}</span>
              <LogOut size={14} />
            </div>
            <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-menu open">
            {navItem('/', '探索')}
            {navItem('/match', '寻找伙伴')}
            {navItem('/messages', '我的消息')}
            <div className="nav-link" onClick={() => { logout(); setMobileOpen(false); }}>退出登录</div>
          </div>
        )}
      </nav>

      <div className="container page">
        <div className="hero">
          <h1>💌 消息中心</h1>
          <p>和你的技能交换伙伴畅聊吧</p>
        </div>

        <div className={`messages-wrap${showList ? ' show-list' : ''}`}>
          <div className="convo-list">
            {loadingConv ? (
              <div className="loading"><div className="spinner"></div>加载中…</div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                <div>还没有消息</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>去首页看看吧</div>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.peerId}
                  className={`convo-item${c.peerId === activePeerId ? ' active' : ''}`}
                  onClick={() => {
                    navigate(`/messages/${c.peerId}`);
                    setShowList(false);
                  }}
                >
                  <img className="convo-avatar" src={c.peer.avatar} alt={c.peer.nickname} />
                  <div className="convo-info">
                    <div className="convo-name">{c.peer.nickname}</div>
                    <div className="convo-last">{c.lastMessage.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="chat-area">
            {!activePeer ? (
              <div className="empty-state">
                <MessageSquare size={48} color="#e5e7eb" style={{ marginBottom: 10 }} />
                <div>选择左侧会话开始聊天</div>
              </div>
            ) : (
              <>
                <div className="chat-head">
                  <button
                    className="btn btn-ghost"
                    style={{ height: 36, padding: '0 10px', background: 'rgba(0,0,0,0.05)', color: '#333' }}
                    onClick={() => setShowList(true)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <img src={activePeer?.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                  <span>{activePeer?.nickname}</span>
                </div>

                <div className="chat-msgs">
                  {loadingMsg ? (
                    <div className="loading"><div className="spinner"></div>加载消息…</div>
                  ) : messages.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
                      <div>和 {activePeer?.nickname} 打个招呼吧</div>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m._id}
                        className={`msg-bubble${m.from === user._id ? ' me' : ' them'}`}
                      >
                        {m.content}
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={msgsEndRef} />
                </div>

                <div className="chat-input">
                  <input
                    type="text"
                    placeholder={`发送消息给 ${activePeer?.nickname}…`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
