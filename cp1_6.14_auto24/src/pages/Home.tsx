import React, { useEffect, useState } from 'react';
import { getActiveVote } from '../client/votes';
import { getLeaderboard, Leaderboard } from '../client/activity';
import { Book, searchBooks } from '../client/books';

interface HomeProps {
  username: string;
  onNavigate: (key: string) => void;
  onBookClick: (id: string) => void;
}

const countDown = (endsAt: number) => {
  const diff = Math.max(0, endsAt - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const Home: React.FC<HomeProps> = ({ username, onNavigate, onBookClick }) => {
  const [vote, setVote] = useState<any>(null);
  const [countdown, setCountdown] = useState('');
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  const load = async () => {
    const [v, l, b] = await Promise.all([
      getActiveVote().catch(() => null),
      getLeaderboard().catch(() => null),
      searchBooks(''),
    ]);
    setVote(v);
    setLeaderboard(l);
    setBooks(b.slice(0, 4));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!vote) return;
    const id = setInterval(() => setCountdown(countDown(vote.endsAt)), 1000);
    setCountdown(countDown(vote.endsAt));
    return () => clearInterval(id);
  }, [vote]);

  return (
    <div>
      <div className="home-welcome">
        <div className="home-welcome-title">👋 欢迎回来，{username}！</div>
        <div className="home-welcome-desc">今天也来和俱乐部的伙伴们一起阅读吧～ 坚持阅读是最好的习惯。</div>
      </div>

      {vote && (
        <div
          className="vote-banner"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('votes')}
        >
          <div className="vote-banner-title">🗳️ {vote.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>距离投票结束还有</div>
              <div className="vote-banner-countdown">{countdown}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '13px', marginBottom: '6px', opacity: 0.95 }}>
                当前 {vote.total} 人参与 · 领先：{vote.result?.[0]?.book?.title || '暂无'}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', overflow: 'hidden', height: '8px' }}>
                {vote.result?.map((r: any, i: number) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      height: '100%',
                      width: `${r.percent}%`,
                      background: ['#fff', '#fed7aa', '#fdba74'][i] || '#fbbf24',
                      verticalAlign: 'top',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              className="btn-outline"
              style={{ background: '#ffffff', color: '#92400e', border: 'none', fontWeight: 700 }}
              onClick={(e) => { e.stopPropagation(); onNavigate('votes'); }}
            >
              去投票 →
            </button>
          </div>
        </div>
      )}

      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-card-value">{leaderboard?.stats.members || 0}</div>
          <div className="stat-card-label">俱乐部成员</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{leaderboard?.stats.books || 0}</div>
          <div className="stat-card-label">俱乐部图书</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{(leaderboard?.stats.totalPages || 0).toLocaleString()}</div>
          <div className="stat-card-label">累计阅读页数</div>
        </div>
      </div>

      <h2 className="section-title">📖 新书上架</h2>
      <div className="book-grid" style={{ marginBottom: '20px' }}>
        {books.map((b) => (
          <div key={b._id} className="card card-hover book-card" onClick={() => onBookClick(b._id)}>
            <img src={b.cover} alt={b.title} className="book-cover" />
            <div className="book-info">
              <div className="book-title">{b.title}</div>
              <div className="book-author">{b.author}</div>
              <div className="book-meta">
                <span className="book-pages">{b.pages}页</span>
                <span className="book-rating">⭐ {b.rating}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>🏆 阅读排行 TOP5</h2>
            <button className="btn-outline" onClick={() => onNavigate('dashboard')}>查看全部</button>
          </div>
          <div className="leaderboard-list">
            {leaderboard?.board.slice(0, 5).map((item) => (
              <div key={item.userId} className={`leaderboard-item ${item.medal}`}>
                <div className={`leaderboard-rank ${item.medal}`}>
                  {item.medal ? (
                    <span className="medal-icon">
                      {item.medal === 'gold' && '🥇'}
                      {item.medal === 'silver' && '🥈'}
                      {item.medal === 'bronze' && '🥉'}
                    </span>
                  ) : item.rank}
                </div>
                <img src={item.avatar} alt={item.username} className="leaderboard-avatar" />
                <div className="leaderboard-name">{item.username}</div>
                <div>
                  <span className="leaderboard-pages">{item.pages.toLocaleString()}</span>
                  <span className="leaderboard-unit">页</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">💡 快捷入口</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button className="btn-secondary" style={{ padding: '20px 10px', fontSize: '14px', fontWeight: 600 }} onClick={() => onNavigate('library')}>
              📚 浏览书库
            </button>
            <button className="btn-secondary" style={{ padding: '20px 10px', fontSize: '14px', fontWeight: 600 }} onClick={() => onNavigate('dashboard')}>
              📊 我的看板
            </button>
            <button className="btn-secondary" style={{ padding: '20px 10px', fontSize: '14px', fontWeight: 600 }} onClick={() => onNavigate('votes')}>
              🗳️ 投票专区
            </button>
            <button className="btn-secondary" style={{ padding: '20px 10px', fontSize: '14px', fontWeight: 600 }} onClick={() => onNavigate('dashboard')}>
              🔥 今日打卡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
