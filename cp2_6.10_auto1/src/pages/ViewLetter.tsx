import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { letterApi, type LetterDetail } from '../api/letterApi';
import { authApi } from '../api/authApi';
import Envelope from '../components/Envelope';
import { Countdown } from '../components/Countdown';
import GoldParticles from '../components/GoldParticles';
import { emotionNames, emotionColors } from '../utils/emotion';
import { renderMarkdown } from '../utils/markdown';
import { playUnlockSound } from '../utils/audio';
import styles from './ViewLetter.module.css';

export default function ViewLetter() {
  const { id } = useParams<{ id: string }>();
  const [letter, setLetter] = useState<LetterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const fetchLetter = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await letterApi.getPublicLetter(id);
      setLetter(data);
      if (data.isUnlocked) {
        setShowContent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchLetter();
  }, [fetchLetter]);

  const syncServerTime = async (): Promise<number> => {
    const data = await authApi.getServerTime();
    return data.serverTime;
  };

  const handleUnlock = () => {
    if (isUnlocking || showContent) return;
    setIsUnlocking(true);
    if (!hasPlayed) {
      try {
        playUnlockSound();
      } catch {
        // ignore audio errors
      }
      setHasPlayed(true);
    }
    setTimeout(() => {
      setShowContent(true);
      setIsUnlocking(false);
    }, 2000);
  };

  const handleCountdownComplete = () => {
    if (letter && !letter.isUnlocked) {
      handleUnlock();
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>💌</div>
          <h2 className={styles.errorTitle}>找不到这封信</h2>
          <p className={styles.errorText}>{error || '信件不存在'}</p>
          <Link to="/" className={styles.homeBtn}>返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <GoldParticles active={isUnlocking} />

      {!showContent ? (
        <div className={styles.envelopeSection}>
          <div className={styles.envelopeWrapper}>
            <Envelope
              emotion={letter.emotion}
              isUnlocked={isUnlocking}
              showHourglass
              className={styles.envelope}
            />
          </div>

          <div className={styles.infoSection}>
            <div
              className={styles.emotionBadge}
              style={{ backgroundColor: emotionColors[letter.emotion] + '20', color: emotionColors[letter.emotion] }}
            >
              {emotionNames[letter.emotion]}
            </div>
            <h1 className={styles.letterTitle}>{letter.title}</h1>
            <p className={styles.recipient}>致 {letter.recipientEmail}</p>
          </div>

          <div className={styles.countdownSection}>
            <p className={styles.countdownLabel}>距离解锁还有</p>
            <Countdown
              targetTime={letter.unlockAt}
              syncServerTime={syncServerTime}
              syncInterval={5000}
              onComplete={handleCountdownComplete}
              className={styles.countdown}
            />
          </div>

          <p className={styles.hint}>
            时光正在缓缓流淌，请耐心等待...
          </p>
        </div>
      ) : (
        <div className={styles.contentSection}>
          <div className={styles.contentCard}>
            <div className={styles.contentHeader}>
              <div
                className={styles.emotionBadge}
                style={{ backgroundColor: emotionColors[letter.emotion] + '20', color: emotionColors[letter.emotion] }}
              >
                {emotionNames[letter.emotion]}
              </div>
              <h1 className={styles.contentTitle}>{letter.title}</h1>
              <p className={styles.contentMeta}>
                <span>收件人：{letter.recipientEmail}</span>
                <span>封存于 {new Date(letter.createdAt).toLocaleDateString('zh-CN')}</span>
              </p>
            </div>

            <div
              className={styles.contentBody}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(letter.content || '') }}
            />

            <div className={styles.contentFooter}>
              <Link to="/" className={styles.backBtn}>← 回到首页</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
