import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { timelineAPI } from '../api';
import { Timeline, Event, THEME_COLORS } from '../types';
import EventCard from '../components/EventCard';
import { PageWrapper } from '../App';

function TimelineEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    description: '',
    coverImage: ''
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadTimeline();
    }
  }, [id]);

  const loadTimeline = async () => {
    try {
      const [timelineRes, eventsRes] = await Promise.all([
        timelineAPI.getTimeline(id!),
        timelineAPI.getEvents(id!)
      ]);
      setTimeline(timelineRes.data);
      setEvents(eventsRes.data.sort((a: Event, b: Event) => a.sortOrder - b.sortOrder));
      setEditTitle(timelineRes.data.title);
      setEditTheme(timelineRes.data.themeColor);
    } catch (err) {
      console.error('加载失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await timelineAPI.updateTimeline(id!, {
        title: editTitle,
        themeColor: editTheme
      });
      setTimeline(res.data);
      setShowSettings(false);
    } catch (err) {
      console.error('保存失败', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setFormData({ date: '', title: '', description: '', coverImage: '' });
    setShowEventModal(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      date: event.date,
      title: event.title,
      description: event.description,
      coverImage: event.coverImage || ''
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.date || !formData.title.trim()) return;
    setSaving(true);
    try {
      if (editingEvent) {
        await timelineAPI.updateEvent(editingEvent.id, formData);
      } else {
        await timelineAPI.createEvent(id!, {
          ...formData,
          sortOrder: events.length
        });
      }
      await loadTimeline();
      setShowEventModal(false);
    } catch (err) {
      console.error('保存失败', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('确定要删除这个事件吗？')) return;
    try {
      await timelineAPI.deleteEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const handleDragStart = (eventId: string) => {
    setDraggedId(eventId);
  };

  const handleReorder = async (newEvents: Event[]) => {
    setEvents(newEvents);
    const updates = newEvents.map((event, index) => ({
      id: event.id,
      sortOrder: index
    }));
    try {
      await Promise.all(
        updates.map(u => timelineAPI.updateEvent(u.id, { sortOrder: u.sortOrder }))
      );
    } catch (err) {
      console.error('排序更新失败', err);
      loadTimeline();
    }
  };

  const theme = timeline
    ? THEME_COLORS.find(t => t.primary === timeline.themeColor) || THEME_COLORS[0]
    : THEME_COLORS[0];

  if (loading) {
    return (
      <PageWrapper>
        <div style={styles.loading}>加载中...</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div
        style={{
          ...styles.page,
          transition: 'background-color 0.4s ease',
          background: `linear-gradient(135deg, ${theme.bg} 0%, #f8f9fa 100%)`
        }}
      >
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
            ← 返回
          </button>
          <motion.h1
            key={timeline?.title}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ ...styles.title, color: theme.text, transition: 'color 0.4s ease' }}
          >
            {timeline?.title}
          </motion.h1>
          <div style={styles.headerActions}>
            <button style={styles.settingsBtn} onClick={() => setShowSettings(true)}>
              ⚙️ 设置
            </button>
            <button
              style={styles.shareBtn}
              onClick={() => {
                const shareUrl = `${window.location.origin}/share/${timeline?.shareHash}`;
                navigator.clipboard.writeText(shareUrl);
                alert('分享链接已复制');
              }}
            >
              🔗 分享
            </button>
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.timelineContainer}>
            <div style={{ ...styles.timelineLine, background: theme.primary, transition: 'background-color 0.4s ease' }} />

            {events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.emptyState}
              >
                <p style={styles.emptyText}>还没有事件</p>
                <p style={styles.emptyDesc}>点击下方按钮添加第一个事件</p>
              </motion.div>
            ) : (
              <Reorder.Group
                axis="y"
                values={events}
                onReorder={handleReorder}
                style={styles.eventList}
              >
                <AnimatePresence>
                  {events.map((event, index) => (
                    <Reorder.Item
                      key={event.id}
                      value={event}
                      style={styles.eventItem}
                    >
                      <div
                        style={{
                          ...styles.dot,
                          background: theme.primary,
                          boxShadow: `0 0 0 4px ${theme.bg}`,
                          transition: 'all 0.4s ease'
                        }}
                      />
                      <EventCard
                        event={event}
                        index={index}
                        themeColor={timeline?.themeColor || THEME_COLORS[0].primary}
                        isLeft={index % 2 === 0}
                        isEditor
                        onDragStart={handleDragStart}
                        onDelete={handleDeleteEvent}
                        onEdit={handleEditEvent}
                      />
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...styles.addBtn,
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.text} 100%)`,
              transition: 'background 0.4s ease'
            }}
            onClick={handleAddEvent}
          >
            + 添加事件
          </motion.button>
        </main>

        <AnimatePresence>
          {showEventModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.modalOverlay}
              onClick={() => setShowEventModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={styles.modalTitle}>
                  {editingEvent ? '编辑事件' : '添加事件'}
                </h2>

                <div style={styles.field}>
                  <label style={styles.label}>日期</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    style={styles.input}
                    placeholder="输入事件标题"
                    maxLength={100}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>描述（最多500字）</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value.slice(0, 500) })
                    }
                    style={styles.textarea}
                    placeholder="输入事件描述..."
                    rows={5}
                    maxLength={500}
                  />
                  <div style={styles.charCount}>
                    {formData.description.length}/500
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>封面图URL（可选）</label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) =>
                      setFormData({ ...formData, coverImage: e.target.value })
                    }
                    style={styles.input}
                    placeholder="https://..."
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setShowEventModal(false)}
                  >
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      ...styles.confirmBtn,
                      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.text} 100%)`
                    }}
                    onClick={handleSaveEvent}
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.modalOverlay}
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={styles.modalTitle}>时间线设置</h2>

                <div style={styles.field}>
                  <label style={styles.label}>标题</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={styles.input}
                    placeholder="输入时间线标题"
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
                          outline: editTheme === color.primary ? `3px solid ${color.primary}` : 'none',
                          outlineOffset: '2px'
                        }}
                        onClick={() => setEditTheme(color.primary)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setShowSettings(false)}
                  >
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={styles.confirmBtn}
                    onClick={handleSaveSettings}
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存'}
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
    padding: '20px',
    transition: 'background-color 0.4s ease'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '16px',
    color: '#888'
  },
  header: {
    maxWidth: '1000px',
    margin: '0 auto 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0'
  },
  backBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.8)',
    color: '#555',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  title: {
    fontSize: '26px',
    fontWeight: 700
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  settingsBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.9)',
    color: '#555',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  shareBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.9)',
    color: '#555',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    paddingBottom: '100px'
  },
  timelineContainer: {
    position: 'relative',
    padding: '20px 0'
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '2px',
    transform: 'translateX(-50%)',
    zIndex: 0
  },
  eventList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  eventItem: {
    position: 'relative',
    marginBottom: '8px'
  },
  dot: {
    position: 'absolute',
    left: '50%',
    top: '30px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1
  },
  emptyState: {
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
  addBtn: {
    display: 'block',
    width: '200px',
    margin: '40px auto 0',
    padding: '14px 24px',
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
    maxWidth: '500px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '24px'
  },
  field: {
    marginBottom: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
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
  textarea: {
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    transition: 'all 0.3s ease'
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'right',
    marginTop: '-4px'
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
    marginTop: '24px'
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

export default TimelineEditor;
