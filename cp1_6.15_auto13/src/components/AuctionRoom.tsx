import React, { useRef, useEffect, useCallback } from 'react';
import { AuctionItem, BidRecord, User } from '../types';
import BidCard from './BidCard';

interface AuctionRoomProps {
  items: AuctionItem[];
  users: User[];
  currentActiveIndex: number;
  bidFeed: BidRecord[];
  onManualBid: (itemId: string, amount: number) => void;
}

function BalanceChart({ users }: { users: User[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const maxBalance = Math.max(...users.map((u) => u.initialBalance), 1);
    const barWidth = (w - 20) / users.length - 8;
    const barMaxH = h - 30;

    users.forEach((user, i) => {
      const x = 10 + i * (barWidth + 8) + 4;
      const barH = Math.max(2, (user.balance / maxBalance) * barMaxH);
      const y = h - 20 - barH;

      ctx.fillStyle = user.balance > 0 ? user.avatarColor + '99' : '#ef444499';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(user.name.slice(0, 3), x + barWidth / 2, h - 6);
    });
  }, [users]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 90, borderRadius: 6, background: 'rgba(0,0,0,0.25)' }}
    />
  );
}

function BidFeedItem({ record, users }: { record: BidRecord; users: User[] }) {
  const user = record.userId === 'manual'
    ? { name: 'You', avatarColor: '#f59e0b' }
    : users.find((u) => u.id === record.userId) || { name: '?', avatarColor: '#666' };

  const rankLabel = record.valid && record.rank > 0
    ? `${record.rank}${record.rank === 1 ? 'st' : record.rank === 2 ? 'nd' : record.rank === 3 ? 'rd' : 'th'}`
    : '';

  return (
    <div
      style={{
        ...feedStyles.item,
        background: record.valid
          ? 'rgba(34,197,94,0.12)'
          : 'rgba(239,68,68,0.12)',
        borderLeft: record.valid ? '3px solid #22c55e' : '3px solid #ef4444',
      }}
      className="feed-item-enter"
    >
      <div style={{ ...feedStyles.avatar, backgroundColor: user.avatarColor }}>
        {user.name[0]}
      </div>
      <div style={feedStyles.center}>
        <span style={feedStyles.name}>{user.name}</span>
        <span style={feedStyles.amount}>
          ${record.amount.toFixed(2)}
        </span>
        {!record.valid && (
          <span style={feedStyles.error}>出价过低</span>
        )}
      </div>
      {rankLabel && (
        <span style={feedStyles.rank}>{rankLabel}</span>
      )}
    </div>
  );
}

export default function AuctionRoom({ items, users, currentActiveIndex, bidFeed, onManualBid }: AuctionRoomProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const activeItem = items[currentActiveIndex];

  return (
    <div style={styles.room}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏛️ 实时拍卖竞价看板</h1>
        {activeItem && activeItem.status === 'active' && (
          <div style={styles.activeLabel}>
            当前拍品: <span style={styles.activeName}>{activeItem.name}</span>
            <span style={styles.activeCountdown}>
              {Math.floor(activeItem.countdown / 60)}:{(Math.floor(activeItem.countdown % 60)).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>竞拍者</h2>
          {users.map((user) => (
            <div key={user.id} style={sidebarStyles.userRow}>
              <div style={{ ...sidebarStyles.avatar, backgroundColor: user.avatarColor }}>
                {user.name[0]}
              </div>
              <div style={sidebarStyles.userInfo}>
                <span style={sidebarStyles.userName}>{user.name}</span>
                <span style={{
                  ...sidebarStyles.balance,
                  color: user.balance <= 0 ? '#ef4444' : user.balance < 200 ? '#f59e0b' : '#22c55e',
                }}>
                  ${user.balance.toFixed(2)}
                </span>
              </div>
              <span style={sidebarStyles.bidCount}>{user.bidCount}次</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ ...styles.sidebarTitle, fontSize: 12 }}>余额对比</h3>
            <BalanceChart users={users} />
          </div>
        </aside>

        <main style={styles.main}>
          <div style={styles.cardsContainer} className="cards-scroll">
            {items.map((item, idx) => (
              <BidCard
                key={item.id}
                item={item}
                isActive={idx === currentActiveIndex && item.status === 'active'}
                users={users}
                onManualBid={onManualBid}
              />
            ))}
          </div>
        </main>
      </div>

      <footer style={styles.feedContainer}>
        <h2 style={styles.feedTitle}>📊 实时出价动态</h2>
        <div ref={feedRef} style={styles.feedList} className="feed-scroll">
          {bidFeed.length === 0 && (
            <div style={feedStyles.empty}>等待竞拍开始...</div>
          )}
          {bidFeed.map((record) => (
            <BidFeedItem key={record.id} record={record} users={users} />
          ))}
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  room: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(12px)',
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  activeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
  },
  activeName: {
    color: '#fbbf24',
    fontWeight: 700,
  },
  activeCountdown: {
    fontFamily: 'monospace',
    background: 'rgba(251,191,36,0.15)',
    padding: '3px 10px',
    borderRadius: 6,
    color: '#fbbf24',
    fontWeight: 700,
    fontSize: 15,
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: 220,
    minWidth: 220,
    padding: 16,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.15)',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    padding: 16,
  },
  cardsContainer: {
    display: 'flex',
    gap: 16,
    overflowX: 'auto',
    paddingBottom: 8,
    scrollBehavior: 'smooth',
  },
  feedContainer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(12px)',
    padding: '10px 24px',
    maxHeight: 200,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 8,
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 150,
    overflowY: 'auto',
    scrollBehavior: 'smooth',
  },
};

const sidebarStyles: Record<string, React.CSSProperties> = {
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
  },
  balance: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  bidCount: {
    fontSize: 11,
    color: '#64748b',
    background: 'rgba(255,255,255,0.06)',
    padding: '2px 6px',
    borderRadius: 4,
  },
};

const feedStyles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    animation: 'feedFadeIn 0.2s ease',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  name: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 600,
  },
  amount: {
    color: '#f1f5f9',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 700,
  },
  error: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 600,
  },
  rank: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fbbf24',
    background: 'rgba(251,191,36,0.15)',
    padding: '2px 8px',
    borderRadius: 4,
    flexShrink: 0,
  },
  empty: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    padding: '12px 0',
  },
};
