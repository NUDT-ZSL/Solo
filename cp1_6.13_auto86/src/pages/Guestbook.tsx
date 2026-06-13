import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface Message {
  _id: string;
  eventId: string;
  nickname: string;
  content: string;
  timestamp: number;
}

const AVATAR_COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#4ade80',
  '#34d399',
  '#60a5fa',
  '#c084fc',
];

const containerStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '40px 24px',
  display: 'grid',
  gridTemplateColumns: '320px 1fr',
  gap: 32,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: 24,
  gridColumn: '1 / -1',
};

const formCardStyle: React.CSSProperties = {
  background: '#1e1b4b',
  borderRadius: 16,
  padding: 24,
  height: 'fit-content',
  position: 'sticky',
  top: 88,
};

const formTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 16,
  color: '#e2e8f0',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: '#0f0e17',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  marginBottom: 12,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 100,
  marginBottom: 12,
};

const submitBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  color: 'white',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
};

const emojiBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 12,
  flexWrap: 'wrap',
};

const emojiBtnStyle: React.CSSProperties = {
  background: '#0f0e17',
  padding: '4px 8px',
  borderRadius: 6,
  fontSize: 16,
};

const messagesListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const messageCardStyle: React.CSSProperties = {
  background: '#1e293b',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  gap: 12,
  transition: 'all 0.2s ease-in-out',
};

const avatarStyle = (color: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 700,
  fontSize: 15,
  flexShrink: 0,
});

const messageBodyStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const messageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
};

const nicknameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#e2e8f0',
};

const timeStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
};

const contentStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#cbd5e1',
  lineHeight: 1.6,
  wordBreak: 'break-word',
};

const loadMoreStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 24,
  color: '#64748b',
  fontSize: 13,
};

const loaderStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 20,
  height: 20,
  border: '2px solid #334155',
  borderTopColor: '#a78bfa',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const responsiveStyle = `
  @media (max-width: 1024px) {
    .guestbook-container { grid-template-columns: 280px 1fr !important; }
  }
  @media (max-width: 768px) {
    .guestbook-container { grid-template-columns: 1fr !important; }
    .guestbook-form { position: static !important; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

function formatTime(ts: number) {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getAvatarColor(nickname: string) {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Guestbook() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const lastTs = messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now();
      const res = await axios.get('/api/guestbook/more', { params: { before: lastTs } });
      setMessages((prev) => [...prev, ...res.data.messages]);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, messages]);

  useEffect(() => {
    axios.get('/api/guestbook').then((res) => {
      setMessages(res.data.messages);
      setHasMore(res.data.hasMore);
    });
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '100px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/guestbook', { nickname, content });
      setMessages((prev) => [res.data, ...prev]);
      setContent('');
    } catch (err) {
      alert('留言失败');
    } finally {
      setSubmitting(false);
    }
  };

  const emojis = ['🎸', '🎶', '❤️', '🔥', '👏', '🎉', '🤘', '😊', '😭', '✨'];

  return (
    <div style={containerStyle} className="guestbook-container">
      <h1 style={titleStyle}>粉丝留言板</h1>

      <div style={formCardStyle} className="guestbook-form">
        <h3 style={formTitleStyle}>✍️ 写留言</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="你的昵称"
            style={inputStyle}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
          <div style={emojiBarStyle}>
            {emojis.map((e) => (
              <button
                type="button"
                key={e}
                style={emojiBtnStyle}
                onClick={() => setContent((c) => c + e)}
              >
                {e}
              </button>
            ))}
          </div>
          <textarea
            placeholder="写下你想说的话..."
            style={textareaStyle}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
          />
          <button type="submit" style={submitBtnStyle} disabled={submitting}>
            {submitting ? '发送中...' : '发布留言'}
          </button>
        </form>
      </div>

      <div>
        <div style={messagesListStyle}>
          {messages.map((msg) => (
            <div
              key={msg._id}
              style={messageCardStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)';
                (e.currentTarget as HTMLDivElement).style.background = '#263448';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)';
                (e.currentTarget as HTMLDivElement).style.background = '#1e293b';
              }}
            >
              <div style={avatarStyle(getAvatarColor(msg.nickname))}>
                {msg.nickname.charAt(0).toUpperCase()}
              </div>
              <div style={messageBodyStyle}>
                <div style={messageHeaderStyle}>
                  <span style={nicknameStyle}>{msg.nickname}</span>
                  <span style={timeStyle}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={contentStyle}>{msg.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div ref={sentinelRef} style={loadMoreStyle}>
          {loading ? (
            <div style={loaderStyle} />
          ) : hasMore ? (
            '向下滚动加载更多'
          ) : (
            '— 没有更多留言了 —'
          )}
        </div>
      </div>

      <style>{responsiveStyle}</style>
    </div>
  );
}

export default Guestbook;
