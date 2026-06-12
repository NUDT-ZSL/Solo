import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getTopPhotos } from '../api';
import type { Photo } from '../types';

export default function RankPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const hasConfetti = useRef(false);
  const navigate = useNavigate();

  const loadRankings = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getTopPhotos(10);
      setPhotos(data);
      if (data.length > 0 && !hasConfetti.current) {
        hasConfetti.current = true;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f5c518', '#ffd700', '#ffffff'],
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCountdown(30);
    }
  }, []);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadRankings();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadRankings]);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#f5c518';
    if (score >= 60) return '#52c41a';
    return '#ff4d4f';
  };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: '#16213e',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            ← 返回
          </Link>
          <h1
            style={{
              color: '#f5c518',
              fontSize: 36,
              fontWeight: 'bold',
            }}
          >
            🏆 微笑排行榜 Top 10
          </h1>
          <p style={{ color: '#8888aa', marginTop: 8 }}>
            找出活动中最灿烂的笑容！
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadRankings}
          disabled={refreshing}
          style={{
            padding: '12px 24px',
            background: refreshing ? '#444466' : '#16213e',
            color: refreshing ? '#666688' : '#f5c518',
            border: '2px solid #f5c518',
            borderRadius: 30,
            fontSize: 14,
            fontWeight: 'bold',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
          >
            🔄
          </motion.span>
          {refreshing ? '刷新中...' : `${countdown}s 后刷新`}
        </motion.button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: 64 }}
          >
            ⏳
          </motion.div>
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8888aa' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎖️</div>
          <p>还没有照片，快去上传吧！</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence mode="popLayout">
            {photos.map((photo, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const scoreColor = getScoreColor(photo.score);

              return (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: isTop3 ? [-5, 0, -5, 0] : 0,
                    backgroundColor: [
                      'rgba(245, 197, 24, 0)',
                      'rgba(245, 197, 24, 0.1)',
                      'rgba(245, 197, 24, 0)',
                    ],
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: isTop3 ? 0.3 : 0.3,
                    y: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                    backgroundColor: { duration: 0.6 },
                    scale: { duration: 0.3 },
                    opacity: { duration: 0.3 },
                  }}
                  onClick={() => navigate(`/photo/${photo.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    background: rank === 1 ? 'linear-gradient(135deg, rgba(245,197,24,0.15), #16213e)' : '#16213e',
                    borderRadius: 16,
                    padding: 16,
                    cursor: 'pointer',
                    border: rank === 1 ? '2px solid #f5c518' : '2px solid transparent',
                    boxShadow: rank === 1 ? '0 0 30px rgba(245, 197, 24, 0.2)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      position: 'relative',
                    }}
                  >
                    {rank === 1 ? (
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        🏆
                      </motion.div>
                    ) : (
                      getMedalEmoji(rank)
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        fontSize: 12,
                        color: '#666688',
                        fontWeight: 'bold',
                      }}
                    >
                      #{rank}
                    </span>
                  </div>

                  <img
                    src={photo.url}
                    alt={photo.filename}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        color: '#e0e0e0',
                        fontSize: 16,
                        marginBottom: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {photo.filename}
                    </h4>
                    <div
                      style={{
                        height: 6,
                        background: '#0f3460',
                        borderRadius: 3,
                        overflow: 'hidden',
                        maxWidth: 200,
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${photo.score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                        style={{
                          height: '100%',
                          background: scoreColor,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 'bold',
                        color: scoreColor,
                      }}
                    >
                      {photo.score}
                    </span>
                    <span style={{ fontSize: 12, color: '#8888aa' }}>分</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
