import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ProposalList from '../components/ProposalList';
import { Proposal } from '../components/SongCard';

function VotePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    songName: '',
    artist: '',
    submitter: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadProposals = async () => {
    try {
      const response = await axios.get('/api/proposals');
      setProposals(response.data);
    } catch (error) {
      console.error('加载提案失败:', error);
    }
  };

  useEffect(() => {
    loadProposals();
    const interval = setInterval(loadProposals, 3000);
    return () => clearInterval(interval);
  }, []);

  const topThree = () => {
    const sorted = [...proposals].sort((a, b) => b.upvotes - a.upvotes);
    const totalVotes = sorted.reduce((sum, p) => sum + Math.max(p.upvotes, 0), 0);
    return sorted.slice(0, 3).map(p => ({
      ...p,
      percentage: totalVotes > 0 ? Math.max(p.upvotes / totalVotes * 100 : 0,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.songName.trim()) {
      newErrors.songName = '歌曲名不能为空';
    } else if (formData.songName.length > 30) {
      newErrors.songName = '歌曲名不能超过30字';
    }
    if (!formData.artist.trim()) {
      newErrors.artist = '艺术家名不能为空';
    }
    if (!formData.submitter.trim()) {
      newErrors.submitter = '提交者昵称不能为空';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await axios.post('/api/proposals', {
        songName: formData.songName.trim(),
        artist: formData.artist.trim(),
        submitter: formData.submitter.trim(),
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ songName: '', artist: '', submitter: '' });
        setSubmitSuccess(false);
        loadProposals();
      }, 1000);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleVoteChange = () => {
    loadProposals();
  };

  const topThreeData = topThree();
  const colors = ['#2ecc71', '#3498db', '#e67e22'];

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
    }}
    >
      <div style={{ flex: '0 0 70% }}>
        <motion.h2 style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '20px',
          color: '#e0e0e0',
        }}>
          🎶 歌曲提案列表
        </motion.h2>
        <ProposalList proposals={proposals} onVoteChange={handleVoteChange} />
      </div>

      <div style={{ flex: '0 0 calc(30% - 24px)' }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: '#16213e',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            border: '1px solid #0f3460',
          }}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '16px',
            color: '#e0e0e0',
          }}>
            🏆 实时排名
          </h3>

          <div style={{
            height: '30px',
            borderRadius: '15px',
            overflow: 'hidden',
            display: 'flex',
            background: '#0f3460',
            marginBottom: '16px',
          }}>
            {topThreeData.length > 0 ? (
              topThreeData.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    background: colors[index],
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    borderRight: index < topThreeData.length - 1 ? '2px solid white' : 'none',
                    minWidth: item.percentage > 0 ? '40px' : '0',
                  }}
                >
                  {item.percentage > 10 ? `${Math.round(item.percentage)}%` : ''}
                </motion.div>
              ))
            ) : (
              <div style={{ flex: 1, background: '#0f3460' }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topThreeData.map((item, index) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: colors[index],
                }} />
                <span style={{
                  color: '#e0e0e0',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.songName}
                </span>
                <span style={{ color: '#8899aa', fontWeight: 600 }}>
                  {item.upvotes} 票
                </span>
              </div>
            ))}
            {topThreeData.length === 0 && (
              <p style={{ color: '#667788', fontSize: '13px', textAlign: 'center' }}>
                暂无数据
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: '#16213e',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            border: '1px solid #0f3460',
          }}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '12px',
            color: '#e0e0e0',
          }}>
            📊 统计信息
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#8899aa' }}>
            <p>🎵 总提案数：<span style={{ color: '#e0e0e0', fontWeight: 600 }}>{proposals.length}</span></p>
            <p>👍 总点赞数：<span style={{ color: '#4a9eff', fontWeight: 600 }}>
              {proposals.reduce((sum, p) => sum + p.upvotes, 0)}
            </span></p>
          </div>
        </motion.div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          right: '30px',
          bottom: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e94560 0%, #c0392b 100%)',
          color: 'white',
          fontSize: '28px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(233, 69, 96, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        +
      </motion.button>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%', scale: submitSuccess ? 0.8 : 1, opacity: submitSuccess ? 0 : 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#16213e',
                borderRadius: '24px 24px 0 0',
                padding: '32px',
                zIndex: 300,
                boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.5)',
                borderTop: '2px solid #0f3460',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              {submitSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '40px',
                  }}
                >
                  <div style={{
                    fontSize: '80px',
                    marginBottom: '16px',
                  }}>
                    ✅
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: '#2ecc71' }}>
                    提交成功！
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    marginBottom: '24px',
                    color: '#e0e0e0',
                    textAlign: 'center',
                  }}>
                    🎵 提交新提案
                  </h2>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 500,
                      color: '#e0e0e0',
                    }}>
                      歌曲名
                    </label>
                    <input
                      type="text"
                      value={formData.songName}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 30);
                        setFormData({ ...formData, songName: value });
                        if (errors.songName) setErrors({ ...errors, songName: '' });
                      }}
                      placeholder="请输入歌曲名（最多30字）"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${errors.songName ? '#e94560' : '#0f3460'}`,
                        background: '#1a1a2e',
                        color: '#e0e0e0',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#e94560';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.songName ? '#e94560' : '#0f3460';
                      }}
                    />
                    {errors.songName && (
                      <p style={{ color: '#e94560', fontSize: '13px', marginTop: '6px' }}>
                        {errors.songName}
                      </p>
                    )}
                    <p style={{ color: '#667788', fontSize: '12px', marginTop: '6px', textAlign: 'right' }}>
                      {formData.songName.length}/30
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 500,
                      color: '#e0e0e0',
                    }}>
                      艺术家
                    </label>
                    <input
                      type="text"
                      value={formData.artist}
                      onChange={(e) => {
                        setFormData({ ...formData, artist: e.target.value });
                        if (errors.artist) setErrors({ ...errors, artist: '' });
                      }}
                      placeholder="请输入艺术家名"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${errors.artist ? '#e94560' : '#0f3460'}`,
                        background: '#1a1a2e',
                        color: '#e0e0e0',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#e94560';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.artist ? '#e94560' : '#0f3460';
                      }}
                    />
                    {errors.artist && (
                      <p style={{ color: '#e94560', fontSize: '13px', marginTop: '6px' }}>
                        {errors.artist}
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 500,
                      color: '#e0e0e0',
                    }}>
                      提交者昵称
                    </label>
                    <input
                      type="text"
                      value={formData.submitter}
                      onChange={(e) => {
                        setFormData({ ...formData, submitter: e.target.value });
                        if (errors.submitter) setErrors({ ...errors, submitter: '' });
                      }}
                      placeholder="请输入你的昵称"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${errors.submitter ? '#e94560' : '#0f3460'}`,
                        background: '#1a1a2e',
                        color: '#e0e0e0',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#e94560';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.submitter ? '#e94560' : '#0f3460';
                      }}
                    />
                    {errors.submitter && (
                      <p style={{ color: '#e94560', fontSize: '13px', marginTop: '6px' }}>
                        {errors.submitter}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '10px',
                        border: '2px solid #0f3460',
                        background: 'transparent',
                        color: '#e0e0e0',
                        fontSize: '16px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      取消
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #e94560 0%, #c0392b 100%)',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(233, 69, 96, 0.3)',
                      }}
                    >
                      提交提案
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          div[style*="display: flex"] {
            flex-direction: column-reverse !important;
          }
        }
      `}</style>
    </div>
  );
}

export default VotePage;
