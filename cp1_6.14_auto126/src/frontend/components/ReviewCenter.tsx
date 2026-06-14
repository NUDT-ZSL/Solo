import React, { useState, useEffect, useCallback } from 'react';
import { getWorks, approveWork, Work } from '../utils/http';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info';
  exiting?: boolean;
}

interface ReviewCenterProps {
  onNotification?: (notif: Omit<Notification, 'id'>) => void;
}

const ReviewCenter: React.FC<ReviewCenterProps> = () => {
  const [pendingWorks, setPendingWorks] = useState<Work[]>([]);
  const [publishedWorks, setPublishedWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, exiting: true } : n))
      );
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 300);
    }, 2000);
  }, []);

  const fetchWorks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorks();
      setPendingWorks(data.filter((w) => w.status === 'pending'));
      setPublishedWorks(data.filter((w) => w.status === 'published'));
    } catch (error) {
      console.error('获取作品列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  const simulateWebSocketPush = useCallback((workTitle: string) => {
    console.log('[WebSocket] 推送作品发布通知给粉丝:', workTitle);
    showNotification(`🔔 已通知所有粉丝：新歌《${workTitle}》已发布！`, 'info');
  }, [showNotification]);

  const handleApprove = async (work: Work) => {
    try {
      setApprovingId(work.id);
      const result = await approveWork(work.id);
      if (result.success) {
        showNotification(`✅ 作品《${work.title}》审核通过！`, 'success');
        setTimeout(() => {
          simulateWebSocketPush(work.title);
        }, 600);
        await fetchWorks();
      }
    } catch (error) {
      console.error('审核失败:', error);
      showNotification('❌ 审核操作失败，请重试', 'info');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="fade-in" style={styles.container}>
      <div style={styles.notificationContainer}>
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={notif.exiting ? 'notification-exit' : 'notification-enter'}
            style={styles.notificationBubble}
          >
            {notif.message}
          </div>
        ))}
      </div>

      <div style={styles.header}>
        <h2 style={styles.title}>审核中心</h2>
        <div style={styles.tabs}>
          <div style={{ ...styles.tab, ...styles.tabActive }}>
            待审核 <span style={styles.tabBadgePending}>{pendingWorks.length}</span>
          </div>
          <div style={styles.tab}>
            已发布 <span style={styles.tabBadgePublished}>{publishedWorks.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingText}>加载中...</div>
        </div>
      ) : (
        <>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>待审核作品</h3>
          </div>

          {pendingWorks.length === 0 ? (
            <div style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3a3a3c" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              <div style={styles.emptyText}>暂无待审核的作品</div>
              <div style={styles.emptySubtext}>所有作品都已完成审核 🎉</div>
            </div>
          ) : (
            <div style={styles.reviewList}>
              {pendingWorks.map((work) => (
                <div key={work.id} style={styles.reviewItem}>
                  <img src={work.cover} alt={work.title} style={styles.reviewCover} />
                  <div style={styles.reviewInfo}>
                    <div style={styles.reviewTitleRow}>
                      <h4 style={styles.reviewTitle}>{work.title}</h4>
                      <span style={styles.statusTagPending}>待审核</span>
                    </div>
                    <div style={styles.reviewMeta}>
                      <span>提交时间: {work.createdAt}</span>
                      <span style={styles.metaSeparator}>·</span>
                      <span>{work.lyrics.length} 句歌词</span>
                    </div>
                    <div style={styles.previewLyrics}>
                      {work.lyrics.slice(0, 2).map((line, i) => (
                        <div key={i} style={styles.previewLine}>"{line}"</div>
                      ))}
                      {work.lyrics.length > 2 && (
                        <div style={styles.previewMore}>...还有 {work.lyrics.length - 2} 句</div>
                      )}
                    </div>
                  </div>
                  <div style={styles.reviewActions}>
                    <button
                      style={styles.approveBtn}
                      onClick={() => handleApprove(work)}
                      disabled={approvingId === work.id}
                    >
                      {approvingId === work.id ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15" />
                          </svg>
                          处理中
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20,6 9,17 4,12" />
                          </svg>
                          审核通过
                        </>
                      )}
                    </button>
                    <button style={styles.rejectBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      驳回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {publishedWorks.length > 0 && (
            <>
              <div style={{ ...styles.sectionHeader, marginTop: 40 }}>
                <h3 style={styles.sectionTitle}>已发布作品</h3>
              </div>
              <div style={styles.reviewList}>
                {publishedWorks.slice(0, 3).map((work) => (
                  <div key={work.id} style={{ ...styles.reviewItem, opacity: 0.85 }}>
                    <img src={work.cover} alt={work.title} style={styles.reviewCover} />
                    <div style={styles.reviewInfo}>
                      <div style={styles.reviewTitleRow}>
                        <h4 style={styles.reviewTitle}>{work.title}</h4>
                        <span style={styles.statusTagPublished}>已发布</span>
                      </div>
                      <div style={styles.reviewMeta}>
                        <span>播放量: {work.plays.toLocaleString()}</span>
                        <span style={styles.metaSeparator}>·</span>
                        <span>评论: {work.comments.length}</span>
                        <span style={styles.metaSeparator}>·</span>
                        <span>发布于 {work.createdAt}</span>
                      </div>
                    </div>
                    <div style={styles.reviewActions}>
                      <div style={styles.publishedStat}>
                        <div style={styles.statCircle}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#34c759">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    position: 'relative',
  },
  notificationContainer: {
    position: 'fixed',
    top: 24,
    right: 24,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 400,
  },
  notificationBubble: {
    padding: '14px 20px',
    backgroundColor: '#ff2d55',
    color: '#ffffff',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 8px 32px rgba(255,45,85,0.3)',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 20,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 4,
    width: 'fit-content',
  },
  tab: {
    padding: '10px 20px',
    fontSize: 14,
    color: '#8e8e93',
    borderRadius: 8,
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
  },
  tabBadgePending: {
    backgroundColor: '#ff9500',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  tabBadgePublished: {
    backgroundColor: '#34c759',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 600,
    color: '#ffffff',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8e8e93',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  reviewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    transition: 'background-color 0.2s ease',
  },
  reviewCover: {
    width: 80,
    height: 80,
    borderRadius: 12,
    objectFit: 'cover',
    flexShrink: 0,
  },
  reviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  reviewTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#ffffff',
  },
  statusTagPending: {
    padding: '4px 12px',
    backgroundColor: '#ff9500',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
  },
  statusTagPublished: {
    padding: '4px 12px',
    backgroundColor: '#34c759',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
  },
  reviewMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 10,
  },
  metaSeparator: {
    margin: '0 6px',
  },
  previewLyrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  previewLine: {
    fontSize: 13,
    color: '#636366',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  previewMore: {
    fontSize: 12,
    color: '#48484a',
  },
  reviewActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  approveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    backgroundColor: '#ff2d55',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rejectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    backgroundColor: '#2c2c2e',
    color: '#8e8e93',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  publishedStat: {
    display: 'flex',
    alignItems: 'center',
  },
  statCircle: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: 'rgba(52,199,89,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const keyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  [data-btn-approve]:hover { background-color: #e0264a !important; transform: translateY(-1px); }
  [data-btn-approve]:disabled { opacity: 0.7; cursor: not-allowed; }
  [data-btn-reject]:hover { background-color: #3a3a3c !important; color: #ff3b30; }
  [data-review-item]:hover { background-color: #222224 !important; }
  [data-day-chip]:hover { background-color: #3a3a3c !important; border-color: #48484a !important; }
  [data-analytics-btn]:hover { background-color: #ff2d55 !important; color: #ffffff !important; }
`;

const reviewStyle = document.createElement('style');
reviewStyle.textContent = keyframes;
document.head.appendChild(reviewStyle);

export default ReviewCenter;
