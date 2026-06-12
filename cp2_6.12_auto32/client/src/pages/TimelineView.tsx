import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { timelineAPI } from '../api';
import { Timeline, Event, Comment, THEME_COLORS } from '../types';
import EventCard from '../components/EventCard';
import { PageWrapper } from '../App';

interface TimelineViewProps {
  isShared?: boolean;
}

function TimelineView({ isShared = false }: TimelineViewProps) {
  const { id, hash } = useParams<{ id?: string; hash?: string }>();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadTimeline();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id, hash]);

  const loadTimeline = async () => {
    try {
      let timelineData;
      let eventsData;

      if (isShared && hash) {
        const res = await timelineAPI.getSharedTimeline(hash);
        timelineData = res.data.timeline;
        eventsData = res.data.events;
      } else if (id) {
        const [timelineRes, eventsRes] = await Promise.all([
          timelineAPI.getTimeline(id),
          timelineAPI.getEvents(id)
        ]);
        timelineData = timelineRes.data;
        eventsData = eventsRes.data;
      }

      setTimeline(timelineData);
      const sortedEvents = eventsData.sort(
        (a: Event, b: Event) => a.sortOrder - b.sortOrder
      );
      setEvents(sortedEvents);
      setTotalLikes(sortedEvents.reduce((sum: number, e: Event) => sum + e.likes, 0));

      if (timelineData) {
        setupSocket(timelineData.id);
      }
    } catch (err) {
      console.error('加载失败', err);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = (timelineId: string) => {
    socketRef.current = io('http://localhost:3001', {
      path: '/socket.io'
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('joinTimeline', timelineId);
    });

    socketRef.current.on('likeUpdate', (data: { eventId: string; likes: number }) => {
      setEvents(prev =>
        prev.map(e => (e.id === data.eventId ? { ...e, likes: data.likes } : e))
      );
      setTotalLikes(prev => prev + 1);
    });

    socketRef.current.on('commentUpdate', (data: { eventId: string }) => {
      // 可以在这里刷新评论
    });
  };

  const handleLikeUpdate = (eventId: string, likes: number) => {
    setEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, likes } : e))
    );
  };

  const handleDownloadPDF = async () => {
    if (!timeline) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const res = await timelineAPI.downloadPDF(timeline.id);

      clearInterval(progressInterval);
      setDownloadProgress(100);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${timeline.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 500);
    } catch (err) {
      console.error('下载失败', err);
      setIsDownloading(false);
      setDownloadProgress(0);
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

  if (!timeline) {
    return (
      <PageWrapper>
        <div style={styles.notFound}>
          <h2>时间线不存在</h2>
          <p>该时间线可能已被删除或链接无效</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div
        style={{
          ...styles.page,
          background: `linear-gradient(135deg, ${theme.bg} 0%, #f8f9fa 100%)`,
          transition: 'background 0.4s ease'
        }}
      >
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <motion.h1
              key={timeline.title}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ ...styles.title, color: theme.text, transition: 'color 0.4s ease' }}
            >
              {timeline.title}
            </motion.h1>
            <p style={styles.subtitle}>
              共 {events.length} 个事件
            </p>
          </div>

          <div style={styles.headerActions}>
            {isShared && (
              <motion.button
                whileTap={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                style={styles.likeBtnPage}
              >
                <span style={styles.likeIcon}>❤️</span>
                <span style={styles.likeCountPage}>{totalLikes}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                ...styles.downloadBtn,
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.text} 100%)`,
                transition: 'background 0.4s ease'
              }}
              onClick={handleDownloadPDF}
              disabled={isDownloading}
            >
              {isDownloading ? `下载中 ${downloadProgress}%` : '📄 下载PDF'}
            </motion.button>
          </div>
        </header>

        {isDownloading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.progressBarContainer}
          >
            <div style={styles.progressBarBg}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  ...styles.progressBarFill,
                  background: theme.primary
                }}
              />
            </div>
          </motion.div>
        )}

        <main style={styles.main}>
          <div style={styles.timelineContainer}>
            <div
              style={{
                ...styles.timelineLine,
                background: theme.primary,
                transition: 'background-color 0.4s ease'
              }}
            />

            {events.map((event, index) => (
              <div key={event.id} style={styles.eventItem}>
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
                  themeColor={timeline.themeColor}
                  isLeft={index % 2 === 0}
                  onLikeUpdate={handleLikeUpdate}
                />
              </div>
            ))}
          </div>
        </main>

        <footer style={styles.footer}>
          <p>由时间线档案生成器创建</p>
        </footer>
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
  notFound: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    textAlign: 'center'
  },
  header: {
    maxWidth: '1000px',
    margin: '0 auto 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    background: 'rgba(255,255,255,0.8)',
    borderRadius: '12px',
    padding: '16px 24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#888'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  likeBtnPage: {
    padding: '10px 20px',
    background: 'white',
    borderRadius: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500
  },
  likeIcon: {
    fontSize: '18px'
  },
  likeCountPage: {
    color: '#ef4444',
    fontWeight: 600
  },
  downloadBtn: {
    padding: '10px 20px',
    color: 'white',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.3s ease'
  },
  progressBarContainer: {
    maxWidth: '1000px',
    margin: '0 auto 20px'
  },
  progressBarBg: {
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px'
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    paddingBottom: '60px'
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
  eventItem: {
    position: 'relative'
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
  footer: {
    textAlign: 'center',
    padding: '30px 0',
    color: '#999',
    fontSize: '13px'
  }
};

export default TimelineView;
