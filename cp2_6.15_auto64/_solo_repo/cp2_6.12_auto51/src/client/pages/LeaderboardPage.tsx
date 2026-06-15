import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface User {
  id: string;
  name: string;
  avatar: string;
  totalHours: number;
}

const LeaderboardPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockUsers: User[] = Array.from({ length: 20 }, (_, i) => ({
          id: `user-${i + 1}`,
          name: ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'][i % 8] + (i + 1),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i + 1}`,
          totalHours: Math.floor(Math.random() * 500) + 10,
        })).sort((a, b) => b.totalHours - a.totalHours);
        setUsers(mockUsers);
      } catch (error) {
        console.error('加载排行榜失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, []);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          background: 'linear-gradient(135deg, #FFD700 0%, #F5A623 100%)',
          color: '#FFFFFF',
          shadow: '0 4px 20px rgba(255, 215, 0, 0.4)',
        };
      case 2:
        return {
          background: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
          color: '#FFFFFF',
          shadow: '0 4px 20px rgba(192, 192, 192, 0.4)',
        };
      case 3:
        return {
          background: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
          color: '#FFFFFF',
          shadow: '0 4px 20px rgba(205, 127, 50, 0.4)',
        };
      default:
        return {
          background: '#F7E9D7',
          color: '#8B7355',
          shadow: 'none',
        };
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF0E0 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 48,
            height: 48,
            border: '4px solid #F5A623',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF0E0 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            marginBottom: 24,
            borderBottom: '1px solid rgba(232, 168, 124, 0.3)',
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#D2691E',
              margin: 0,
            }}
          >
            🏆 工时排行榜
          </h1>
          <Link
            to="/"
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '2px solid #E8A87C',
              borderRadius: 20,
              color: '#D2691E',
              textDecoration: 'none',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            ← 返回首页
          </Link>
        </nav>

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: 20,
              padding: '32px 16px',
            }}
          >
            {[1, 0, 2].map((idx) => {
              const user = users[idx];
              if (!user) return null;
              const rank = idx + 1;
              const style = getRankStyle(rank);
              const heights = [200, 160, 120];
              const height = heights[idx];

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={user.avatar}
                      alt={user.name}
                      style={{
                        width: rank === 1 ? 80 : 64,
                        height: rank === 1 ? 80 : 64,
                        borderRadius: '50%',
                        border: `4px solid ${rank <= 3 ? '#FFFFFF' : '#F7E9D7'}`,
                        boxShadow: style.shadow,
                        objectFit: 'cover',
                      }}
                    />
                    {getRankEmoji(rank) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -12,
                          right: -12,
                          fontSize: 28,
                        }}
                      >
                        {getRankEmoji(rank)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: rank === 1 ? 18 : 16,
                      fontWeight: 700,
                      color: '#3D2914',
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: rank === 1 ? 22 : 18,
                      fontWeight: 800,
                      color: '#F5A623',
                    }}
                  >
                    {user.totalHours}h
                  </div>
                  <div
                    style={{
                      width: rank === 1 ? 100 : 80,
                      height,
                      background: style.background,
                      borderRadius: '16px 16px 8px 8px',
                      boxShadow: style.shadow,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      paddingTop: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: style.color,
                      }}
                    >
                      {rank}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(245, 166, 35, 0.1)',
          }}
        >
          {users.slice(3).map((user, index) => {
            const rank = index + 4;
            const style = getRankStyle(rank);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: index < users.length - 4 ? '1px solid #F7E9D7' : 'none',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: style.background,
                    color: style.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {rank}
                </div>
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #F7E9D7',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#3D2914',
                      marginBottom: 2,
                    }}
                  >
                    {user.name}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#F5A623',
                  }}
                >
                  {user.totalHours}
                  <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 2 }}>h</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
