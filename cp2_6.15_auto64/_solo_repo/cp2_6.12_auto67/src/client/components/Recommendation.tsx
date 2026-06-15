import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface RecommendationProps {
  onNavigateToUser: (userId: string) => void;
}

const popularContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const popularItemVariants = {
  hidden: (index: number) => ({
    x: index % 2 === 0 ? -200 : 200,
    opacity: 0,
  }),
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const similarUserVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: index * 0.15,
      ease: 'easeOut',
    },
  }),
};

const typeLabels: Record<string, { label: string; color: string }> = {
  book: { label: '书籍', color: 'var(--book-green)' },
  movie: { label: '电影', color: 'var(--movie-blue)' },
  music: { label: '音乐', color: 'var(--music-purple)' },
};

const Recommendation = ({ onNavigateToUser }: RecommendationProps) => {
  const { token } = useAuth();
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [similarUsers, setSimilarUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [popularRes, similarRes] = await Promise.all([
          axios.get('/api/recommendations/popular'),
          axios.get('/api/recommendations/similar-users'),
        ]);
        setPopularItems(popularRes.data);
        setSimilarUsers(similarRes.data);
      } catch (error) {
        console.error('获取推荐数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
        加载推荐中...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          🔥 本周热门
        </h2>
        <motion.div
          variants={popularContainerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {popularItems.map((item: any, index: number) => {
            const typeInfo = typeLabels[item.type] || { label: '未知', color: '#999' };
            return (
              <motion.div
                key={item.id}
                custom={index}
                variants={popularItemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backgroundColor: 'var(--card-white)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease',
                }}
                whileHover={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: index < 3
                      ? 'linear-gradient(135deg, var(--primary-purple), var(--primary-orange))'
                      : 'var(--border-light)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: 'white',
                        backgroundColor: typeInfo.color,
                        flexShrink: 0,
                      }}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                    {item.creator} · {item.review_count || 0}条评价
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        {popularItems.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '20px' }}>
            暂无热门数据
          </p>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          👥 同好推荐
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {similarUsers.map((user: any, index: number) => (
            <motion.div
              key={user.id}
              custom={index}
              variants={similarUserVariants}
              initial="hidden"
              animate="visible"
              onClick={() => onNavigateToUser(user.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                backgroundColor: 'var(--card-white)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease',
              }}
              whileHover={{
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              }}
            >
              <img
                src={user.avatar}
                alt={user.username}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '15px' }}>{user.username}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                  {user.collection_count}个收藏 · 重合度 {user.similarity}%
                </p>
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-orange))',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {user.matchCount}个相同
              </div>
            </motion.div>
          ))}
        </div>
        {similarUsers.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '20px' }}>
            暂无同好推荐，添加更多收藏吧
          </p>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';

export default Recommendation;
