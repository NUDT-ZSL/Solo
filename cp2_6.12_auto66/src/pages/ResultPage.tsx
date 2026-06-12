import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Proposal } from '../components/SongCard';

interface ResultItem extends Proposal {
  duration: number;
  rank: number;
}

function ResultPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  const loadResults = async () => {
    try {
      const response = await axios.get('/api/results');
      const data = response.data.map((item: any, index: number) => ({
        ...item,
        duration: item.duration || 4,
        rank: index + 1,
      }));
      setResults(data);
      const total = data.reduce((sum: number, item: ResultItem) => sum + item.duration, 0);
      setTotalDuration(total);
    } catch (error) {
      console.error('加载结果失败:', error);
    }
  };

  useEffect(() => {
    loadResults();
    const interval = setInterval(() => {
      if (!isLocked) {
        loadResults();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const handleGenerateSchedule = () => {
    setIsLocked(true);
  };

  const handleDurationChange = (id: string, newDuration: number) => {
    setResults(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, duration: newDuration } : item
      );
      const total = updated.reduce((sum, item) => sum + item.duration, 0);
      setTotalDuration(total);
      return updated;
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '32px' }}
      >
        <h2 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#e0e0e0',
          marginBottom: '12px',
        }}>
          🎸 演出排程表
        </h2>
        <p style={{ color: '#8899aa', fontSize: '16px' }}>
          {isLocked ? '排程已锁定，投票已关闭' : '按实时票数排序，点击生成排程锁定结果'}
        </p>
        {totalDuration > 0 && (
          <p style={{ color: '#4a9eff', fontSize: '14px', marginTop: '8px' }}>
            ⏱️ 预计总时长：{formatTime(totalDuration)}
          </p>
        )}
      </motion.div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <motion.button
          whileHover={!isLocked ? { scale: 1.05 } : {}}
          whileTap={!isLocked ? { scale: 0.95 } : {}}
          animate={!isLocked ? {
            boxShadow: [
              '0 0 20px rgba(233, 69, 96, 0.3)',
              '0 0 40px rgba(233, 69, 96, 0.6)',
              '0 0 20px rgba(233, 69, 96, 0.3)',
            ],
          } : {}}
          transition={!isLocked ? {
            boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          } : {}}
          onClick={handleGenerateSchedule}
          disabled={isLocked}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 600,
            borderRadius: '50px',
            border: 'none',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            background: isLocked
              ? '#666'
              : 'linear-gradient(135deg, #e94560 0%, #c0392b 100%)',
            color: 'white',
            boxShadow: isLocked
              ? 'none'
              : '0 6px 20px rgba(233, 69, 96, 0.4)',
            opacity: isLocked ? 0.7 : 1,
          }}
        >
          {isLocked ? '🔒 排程已锁定' : '✨ 生成排程'}
        </motion.button>
      </div>

      {results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 20px',
            color: '#667788',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>暂无排程数据</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>先去投票页提交一些歌曲提案吧！</p>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{
            background: '#16213e',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            border: '1px solid #0f3460',
          }}
        >
          {results.map((song, index) => (
            <motion.div key={song.id} variants={item}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                position: 'relative',
              }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.1 }}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4a9eff 0%, #9b59b6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '22px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  {song.rank}
                </motion.div>

                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#e0e0e0',
                    marginBottom: '4px',
                  }}>
                    {song.songName}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#8899aa' }}>
                    🎤 {song.artist} · ✍️ {song.submitter}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#8899aa',
                  fontSize: '14px',
                }}>
                  <span>⏱️</span>
                  <input
                    type="number"
                    value={song.duration}
                    onChange={(e) => handleDurationChange(song.id, Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    disabled={!isLocked}
                    style={{
                      width: '60px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: `2px solid ${isLocked ? '#0f3460' : '#e94560'}`,
                      background: '#1a1a2e',
                      color: '#e0e0e0',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      cursor: isLocked ? 'not-allowed' : 'text',
                    }}
                  />
                  <span>分钟</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: 'rgba(74, 158, 255, 0.15)',
                  color: '#4a9eff',
                  fontWeight: 600,
                  fontSize: '14px',
                }}>
                  👍 {song.upvotes}
                </div>
              </div>

              {index < results.length - 1 && (
                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, #0f3460 50%, transparent 100%)',
                  margin: '0 20px',
                }} />
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default ResultPage;
