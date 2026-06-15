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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function BalanceChart({ users }: { users: User[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevHeightsRef = useRef<number[]>([]);
  const animStartRef = useRef(0);
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const maxBalance = Math.max(...users.map((u) => u.initialBalance), 1);
    const barWidth = (w - 24) / users.length - 6;
    const barMaxH = h - 30;

    const targetHeights = users.map((u) =>
      Math.max(2, (u.balance / maxBalance) * barMaxH)
    );

    if (prevHeightsRef.current.length !== users.length) {
      prevHeightsRef.current = targetHeights.slice();
    }

    const elapsed = Date.now() - animStartRef.current;
    const progress = Math.min(1, elapsed / 400);
    const ease = 1 - Math.pow(1 - progress, 3);

    users.forEach((user, i) => {
      const x = 12 + i * (barWidth + 6) + 3;
      const targetH = targetHeights[i];
      const startH = prevHeightsRef.current[i] ?? targetH;
      const displayH = startH + (targetH - startH) * ease;
      const y = h - 20 - displayH;

      const barColor = user.balance <= 0
        ? '#ef4444'
        : user.balance < user.initialBalance * 0.2
          ? '#f59e0b'
          : user.avatarColor;

      const grd = ctx.createLinearGradient(0, y, 0, y + displayH);
      grd.addColorStop(0, barColor + 'cc');
      grd.addColorStop(1, barColor + '66');
      ctx.fillStyle = grd;
      drawRoundedRect(ctx, x, y, barWidth, displayH, 3);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(user.name.slice(0, 3), x + barWidth / 2, h - 6);
    });

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      prevHeightsRef.current = targetHeights.slice();
    }
  }, [users]);

  useEffect(() => {
    animStartRef.current = Date.now();
    rafRef.current = requestAnimationFrame(draw);
    const handleResize = () => {
      animStartRef.current = Date.now();
      prevHeightsRef.current = [];
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 100,
        borderRadius: 6,
        background: 'rgba(0,0,0,0.25)',
        display: 'block',
      }}
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
          ? 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.03))'
          : 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.03))',
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
          <span style={feedStyles.error}>✕ 出价过低</span>
        )}
      </div>
      {rankLabel && (
        <span style={{
          ...feedStyles.rank,
          background: record.rank === 1
            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
            : record.rank === 2
              ? 'linear-gradient(135deg, #94a3b8, #64748b)'
              : record.rank === 3
                ? 'linear-gradient(135deg, #d97706, #92400e)'
                : 'rgba(251,191,36,0.15)',
          color: record.rank <= 3 ? '#1a1a2e' : '#fbbf24',
        }}>{rankLabel}</span>
      )}
    </div>
  );
}

export default function AuctionRoom({ items, users, currentActiveIndex, bidFeed, onManualBid }: AuctionRoomProps) {
  const activeItem = items[currentActiveIndex];

  return (
    <div style={styles.room}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏛️ 实时拍卖竞价看板</h1>
        {activeItem && activeItem.status === 'active' && (
          <div style={styles.activeLabel}>
            当前拍品: <span style={styles.activeName}>{activeItem.name}</span>
            <span style={{
              ...styles.activeCountdown,
              background: activeItem.countdown <= 10
                ? 'rgba(239,68,68,0.2)'
                : 'rgba(251,191,36,0.15)',
              color: activeItem.countdown <= 10 ? '#ef4444' : '#fbbf24',
              border: activeItem.countdown <= 10
                ? '1px solid rgba(239,68,68,0.3)'
                : '1px solid rgba(251,191,36,0.3)',
              animation: activeItem.countdown <= 10 ? 'pulseWarn 1s ease infinite' : 'none',
            }}>
              {Math.floor(activeItem.countdown / 60)}:{(Math.floor(activeItem.countdown % 60)).toString().padStart(2, '0')}
            </span>
          </div>
        )}
        {activeItem && activeItem.status !== 'active' && currentActiveIndex < items.length && (
          <div style={styles.activeLabel}>
            下一拍品: <span style={{ color: '#cbd5e1' }}>
              {items[Math.min(currentActiveIndex + 1, items.length - 1)]?.name || '拍卖结束'}
            </span>
          </div>
        )}
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>竞拍者</h2>
          {users.map((user) => (
            <div key={user.id} style={sidebarStyles.userRow}>
              <div style={{
                ...sidebarStyles.avatar,
                backgroundColor: user.avatarColor,
                opacity: user.balance <= 0 ? 0.5 : 1,
                boxShadow: user.balance <= 0 ? 'inset 0 0 0 2px #ef4444' : 'none',
              }}>
                {user.name[0]}
              </div>
              <div style={sidebarStyles.userInfo}>
                <span style={{
                  ...sidebarStyles.userName,
                  opacity: user.balance <= 0 ? 0.5 : 1,
                  textDecoration: user.balance <= 0 ? 'line-through' : 'none',
                }}>{user.name}</span>
                <span style={{
                  ...sidebarStyles.balance,
                  color: user.balance <= 0
                    ? '#ef4444'
                    : user.balance < 200
                      ? '#f59e0b'
                      : '#4ade80',
                  fontWeight: 700,
                  fontSize: 13,
                  textShadow: user.balance <= 0 ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
                }}>
                  ${user.balance.toFixed(2)}
                  {user.balance <= 0 && <span style={{ fontSize: 10, marginLeft: 4 }}>(破产)</span>}
                </span>
              </div>
              <span style={{
                ...sidebarStyles.bidCount,
                background: user.bidCount > 0
                  ? 'rgba(251,191,36,0.15)'
                  : 'rgba(255,255,255,0.06)',
                color: user.bidCount > 0 ? '#fbbf24' : '#64748b',
                fontWeight: 700,
              }}>{user.bidCount}次</span>
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ ...styles.sidebarTitle, fontSize: 12, marginBottom: 8 }}>📊 余额对比</h3>
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
        <div style={styles.feedHeader}>
          <h2 style={styles.feedTitle}>� 实时出价动态</h2>
          <span style={styles.feedCount}>共 {bidFeed.length} 条记录</span>
        </div>
        <div style={styles.feedList} className="feed-scroll">
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
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.25)',
    backdropFilter: 'blur(12px)',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: 0.5,
  },
  activeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
  },
  activeName: {
    color: '#fbbf24',
    fontWeight: 700,
    fontSize: 15,
  },
  activeCountdown: {
    fontFamily: 'monospace',
    padding: '5px 14px',
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: 1,
    transition: 'all 0.3s ease',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: 240,
    minWidth: 240,
    padding: 18,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    padding: 20,
  },
  cardsContainer: {
    display: 'flex',
    gap: 18,
    overflowX: 'auto',
    paddingBottom: 10,
    paddingRight: 4,
    scrollBehavior: 'smooth',
  },
  feedContainer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.25)',
    backdropFilter: 'blur(12px)',
    padding: '12px 28px 16px',
    maxHeight: 240,
    display: 'flex',
    flexDirection: 'column',
  },
  feedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#94a3b8',
  },
  feedCount: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    maxHeight: 180,
    overflowY: 'auto',
    scrollBehavior: 'smooth',
    paddingRight: 4,
  },
};

const sidebarStyles: Record<string, React.CSSProperties> = {
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  userName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  balance: {
    fontSize: 13,
    fontFamily: 'monospace',
    transition: 'color 0.3s ease',
  },
  bidCount: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    transition: 'all 0.2s ease',
  },
};

const feedStyles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 14px',
    borderRadius: 8,
    animation: 'feedFadeIn 0.2s ease',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
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
    gap: 10,
    minWidth: 0,
  },
  name: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 60,
  },
  amount: {
    color: '#f1f5f9',
    fontSize: 15,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  error: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(239,68,68,0.2)',
  },
  rank: {
    fontSize: 11,
    fontWeight: 800,
    padding: '3px 9px',
    borderRadius: 6,
    flexShrink: 0,
    letterSpacing: 0.5,
    transition: 'all 0.2s ease',
  },
  empty: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    padding: '16px 0',
    fontStyle: 'italic',
  },
};
