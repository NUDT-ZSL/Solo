import React, { useState, useEffect, useRef } from 'react';

interface LeaderboardEntry {
  userId: number;
  email: string;
  totalAsset: number;
  returnRate: number;
  tradeCount: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: number;
}

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];
const RANK_BORDERS = ['2px solid #ffd700', '2px solid #c0c0c0', '2px solid #cd7f32'];

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, currentUserId }) => {
  const [displayEntries, setDisplayEntries] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayEntries(entries.slice(0, 10));
  }, [entries]);

  useEffect(() => {
    if (entries.length <= 5) return;
    timerRef.current = setInterval(() => {
      setCurrentPage((prev) => {
        const maxPage = Math.ceil(entries.length / 5) - 1;
        return prev >= maxPage ? 0 : prev + 1;
      });
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [entries.length]);

  useEffect(() => {
    const start = currentPage * 5;
    const visible = entries.slice(start, start + 5);
    if (visible.length > 0) {
      setDisplayEntries(visible);
    }
  }, [currentPage, entries]);

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getAvatarColor = (id: number) => {
    const colors = ['#e94560', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#00bcd4'];
    return colors[id % colors.length];
  };

  return (
    <div style={styles.container} className="fade-in">
      <h3 style={styles.title}>🏆 排行榜</h3>
      {displayEntries.length === 0 ? (
        <div style={styles.empty}>暂无排名数据</div>
      ) : (
        <div style={styles.list}>
          {displayEntries.map((entry, index) => {
            const globalRank = entries.findIndex((e) => e.userId === entry.userId) + 1;
            const isTop3 = globalRank <= 3;
            const isCurrentUser = entry.userId === currentUserId;

            return (
              <div
                key={entry.userId}
                style={{
                  ...styles.item,
                  border: isTop3 ? RANK_BORDERS[globalRank - 1] : '1px solid transparent',
                  background: isCurrentUser ? 'rgba(233,69,96,0.1)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={styles.rankSection}>
                  <span
                    style={{
                      ...styles.rankBadge,
                      color: isTop3 ? RANK_COLORS[globalRank - 1] : '#8892b0',
                    }}
                  >
                    {globalRank <= 3 ? ['🥇', '🥈', '🥉'][globalRank - 1] : `#${globalRank}`}
                  </span>
                  <div
                    style={{
                      ...styles.avatar,
                      background: getAvatarColor(entry.userId),
                    }}
                  >
                    {getInitials(entry.email)}
                  </div>
                </div>
                <div style={styles.info}>
                  <span style={styles.email}>{entry.email}</span>
                  <div style={styles.stats}>
                    <span
                      style={{
                        color: entry.returnRate >= 0 ? '#4caf50' : '#f44336',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {entry.returnRate >= 0 ? '+' : ''}{entry.returnRate.toFixed(2)}%
                    </span>
                    <span style={styles.tradeCount}>{entry.tradeCount}笔交易</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  empty: {
    color: '#8892b0',
    textAlign: 'center' as const,
    padding: '20px 0',
    fontSize: 13,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    transition: 'background 0.2s ease',
  },
  rankSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 60,
  },
  rankBadge: {
    fontSize: 16,
    fontWeight: 700,
    minWidth: 24,
    textAlign: 'center' as const,
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
    fontWeight: 600,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  email: {
    color: '#e0e0e0',
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeCount: {
    color: '#8892b0',
    fontSize: 11,
  },
};

export default Leaderboard;
