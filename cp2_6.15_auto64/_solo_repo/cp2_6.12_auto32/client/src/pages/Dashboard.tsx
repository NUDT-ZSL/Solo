import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { timelineAPI } from '../api';
import { Timeline, THEME_COLORS } from '../types';
import { PageWrapper } from '../App';

function Dashboard() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState(THEME_COLORS[0].primary);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTimelines();
  }, []);

  const loadTimelines = async () => {
    try {
      const res = await timelineAPI.getTimelines();
      setTimelines(res.data);
    } catch (err) {
      console.error('加载时间线失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await timelineAPI.createTimeline({
        title: newTitle,
        themeColor: newTheme
      });
      setTimelines([res.data, ...timelines]);
      setShowModal(false);
      setNewTitle('');
      navigate(`/timeline/${res.data.id}`);
    } catch (err) {
      console.error('创建失败', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个时间线吗？')) return;
    try {
      await timelineAPI.deleteTimeline(id);
      setTimelines(timelines.filter(t => t.id !== id));
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getThemeColor = (primary: string) => {
    return THEME_COLORS.find(t => t.primary === primary) || THEME_COLORS[0];
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <PageWrapper>
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>我的时间线</h1>
          <div style={styles.headerRight}>
            <span style={styles.username}>{user.username}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>退出</button>
          </div>
        </header>

        <main style={styles.main}>
          {loading ? (
            <div style={styles.loading}>加载中...</div>
          ) : timelines.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.empty}
            >
              <p style={styles.emptyText}>还没有时间线</p>
              <p style={styles.emptyDesc}>创建您的第一个时间线档案吧</p>
            </motion.div>
          ) : (
            <div style={styles.grid}>
              <AnimatePresence>
                {timelines.map((timeline, index) => {
                  const theme = getThemeColor(timeline.themeColor);
                  return (
                    <motion.div
                      key={timeline.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                      style={{
                        ...styles.card,
                        background: theme.bg,
                        borderLeft: `4px solid ${theme.primary}`
                      }}
                      onClick={() => navigate(`/timeline/${timeline.id}`)}
                    >
                      <h3 style={{ ...styles.cardTitle, color: theme.text }}>{timeline.title}</h3>
                      <p style={styles.cardDate}>
                        创建于 {new Date(timeline.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                      <div style={styles.cardActions}>
                        <button
                          style={styles.shareBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            const shareUrl = `${window.location.origin}/share/${timeline.shareHash}`;
                            navigator.clipboard.writeText(shareUrl);
                            alert('分享链接已复制');
                          }}
                        >
                          分享
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={(e) => handleDelete(timeline.id, e)}
                        >
                          删除
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={styles.createBtn}
            onClick={() => setShowModal(true)}
          >
            + 创建时间线
          </motion.button>
        </main>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.modalOverlay}
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={styles.modalTitle}>创建新时间线</h2>

                <div style={styles.field}>
                  <label style={styles.label}>标题</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={styles.input}
                    placeholder="输入时间线标题"
                    autoFocus
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>主题色</label>
                  <div style={styles.colorGrid}>
                    {THEME_COLORS.map((color) => (
                      <motion.button
                        key={color.primary}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          ...styles.colorBtn,
                          background: color.primary,
                          outline: newTheme === color.primary ? `3px solid ${color.primary}` : 'none',
                          outlineOffset: '2px'
                        }}
                        onClick={() => setNewTheme(color.primary)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={styles.confirmBtn}
                    onClick={handleCreate}
                  >
                    创建
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '20px'
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 0'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#333'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  username: {
    fontSize: '14px',
    color: '#666'
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    color: '#666',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#888'
  },
  empty: {
    textAlign: 'center',
    padding: '80px 20px'
  },
  emptyText: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '8px'
  },
  emptyDesc: {
    fontSize: '14px',
    color: '#999'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  card: {
    padding: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  cardDate: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '16px'
  },
  cardActions: {
    display: 'flex',
    gap: '8px'
  },
  shareBtn: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.8)',
    color: '#555',
    borderRadius: '6px',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  },
  deleteBtn: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.8)',
    color: '#ef4444',
    borderRadius: '6px',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  },
  createBtn: {
    display: 'block',
    width: '200px',
    margin: '0 auto',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '24px'
  },
  field: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#555'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  colorBtn: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '28px'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#f3f4f6',
    color: '#666',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600
  }
};

export default Dashboard;
