import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { letterApi, type LetterListItem } from '../api/letterApi';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { VirtualList } from '../components/VirtualList';
import { emotionColors, emotionNames } from '../utils/emotion';
import Envelope from '../components/Envelope';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [letters, setLetters] = useState<LetterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, locked: 0 });
  const [loading, setLoading] = useState(true);
  const [previewLetter, setPreviewLetter] = useState<LetterListItem | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { from: '/dashboard' } });
      return;
    }
    loadData();
  }, [token, navigate, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listResult, statsResult] = await Promise.all([
        letterApi.getUserLetters(page, pageSize),
        letterApi.getUserStats(),
      ]);
      if (page === 1) {
        setLetters(listResult.items);
      } else {
        setLetters((prev) => [...prev, ...listResult.items]);
      }
      setTotal(listResult.total);
      setStats(statsResult);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (loading) return;
    if (letters.length < total) {
      setPage((p) => p + 1);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const statusText = (status: string) => {
    switch (status) {
      case 'sent': return '等待中';
      case 'unlocked': return '已解锁';
      case 'expired': return '已过期';
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#f59e0b';
      case 'unlocked': return '#10b981';
      case 'expired': return '#9ca3af';
      default: return '#9ca3af';
    }
  };

  const listHeight = useMemo(() => {
    const minHeight = 400;
    const maxHeight = Math.min(600, Math.max(minHeight, letters.length * 80));
    return maxHeight;
  }, [letters.length]);

  const renderLetterCard = (item: LetterListItem) => (
    <div
      key={item.id}
      className={styles.letterCard}
      onClick={() => setPreviewLetter(item)}
    >
      <div
        className={styles.emotionBar}
        style={{ backgroundColor: emotionColors[item.emotion] }}
      />
      <div className={styles.letterInfo}>
        <h3 className={styles.letterTitle}>{item.title}</h3>
        <p className={styles.letterMeta}>
          收件人：{item.recipientEmail}
        </p>
        <p className={styles.letterMeta}>
          解锁时间：{formatDate(item.unlockAt)}
        </p>
      </div>
      <div className={styles.letterStatus}>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: statusColor(item.status) + '20', color: statusColor(item.status) }}
        >
          {statusText(item.status)}
        </span>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.greeting}>
            你好，{user?.username || '时光旅人'}
          </h1>
          <p className={styles.subGreeting}>这里记录着你寄出的每一份时光</p>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✉️</div>
            <div className={styles.statContent}>
              <AnimatedNumber value={stats.total} className={styles.statNumber} />
              <span className={styles.statLabel}>已发送</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🔓</div>
            <div className={styles.statContent}>
              <AnimatedNumber value={stats.unlocked} className={styles.statNumber} />
              <span className={styles.statLabel}>已解锁</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⏳</div>
            <div className={styles.statContent}>
              <AnimatedNumber value={stats.locked} className={styles.statNumber} />
              <span className={styles.statLabel}>等待中</span>
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <h2 className={styles.sectionTitle}>我的信件</h2>
          <button
            className={styles.writeBtn}
            onClick={() => navigate('/create')}
          >
            + 写新信件
          </button>
        </div>

        {loading && letters.length === 0 ? (
          <div className={styles.loading}>加载中...</div>
        ) : letters.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💌</div>
            <p>还没有寄出任何信件</p>
            <button
              className={styles.emptyBtn}
              onClick={() => navigate('/create')}
            >
              写第一封信
            </button>
          </div>
        ) : (
          <>
            {/* Desktop: VirtualList */}
            <div className={styles.desktopList}>
              <VirtualList
                items={letters}
                itemHeight={88}
                height={listHeight}
                renderItem={renderLetterCard}
              />
              {letters.length < total && !loading && (
                <button className={styles.loadMoreBtn} onClick={loadMore}>
                  加载更多
                </button>
              )}
            </div>

            {/* Mobile: Horizontal scroll cards */}
            <div className={styles.mobileList}>
              {letters.map((item) => (
                <div
                  key={item.id}
                  className={styles.mobileCard}
                  onClick={() => setPreviewLetter(item)}
                  style={{ borderLeftColor: emotionColors[item.emotion] }}
                >
                  <h3 className={styles.mobileCardTitle}>{item.title}</h3>
                  <p className={styles.mobileCardMeta}>
                    {item.recipientEmail}
                  </p>
                  <div className={styles.mobileCardBottom}>
                    <span className={styles.mobileCardDate}>
                      {formatDate(item.unlockAt)}
                    </span>
                    <span
                      className={styles.statusBadge}
                      style={{ backgroundColor: statusColor(item.status) + '20', color: statusColor(item.status) }}
                    >
                      {statusText(item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {previewLetter && (
        <div
          className={styles.modalOverlay}
          onClick={() => setPreviewLetter(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={() => setPreviewLetter(null)}
            >
              ×
            </button>
            <h3 className={styles.modalTitle}>{previewLetter.title}</h3>
            <div className={styles.modalEnvelopeWrapper}>
              <Envelope emotion={previewLetter.emotion} isUnlocked={previewLetter.status === 'unlocked'} showHourglass />
            </div>
            <div className={styles.modalInfo}>
              <p>
                <strong>收件人：</strong>
                {previewLetter.recipientEmail}
              </p>
              <p>
                <strong>情绪：</strong>
                {emotionNames[previewLetter.emotion]}
              </p>
              <p>
                <strong>解锁时间：</strong>
                {formatDate(previewLetter.unlockAt)}
              </p>
              <p>
                <strong>状态：</strong>
                <span
                  style={{ color: statusColor(previewLetter.status), fontWeight: 600 }}
                >
                  {statusText(previewLetter.status)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
