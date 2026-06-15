import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Capsule3D from '../Capsule3D';
import { formatCountdown, copyToClipboard } from '../utils';
import { CapsuleDetail } from '../types';
import { initAudioContext } from '../AudioManager';

const CountdownTimer: React.FC<{ unlockTime: number; onExpire: () => void }> = ({ unlockTime, onExpire }) => {
  const [{ text, isExpired }, setState] = useState(() => formatCountdown(unlockTime));
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const r = formatCountdown(unlockTime);
      setState(r);
      if (r.isExpired && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlockTime, onExpire]);

  return (
    <div className="detail-countdown-value">
      {text}
    </div>
  );
};

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [capsule, setCapsule] = useState<CapsuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUnlockedAvailable, setIsUnlockedAvailable] = useState(false);
  const [contentRevealed, setContentRevealed] = useState(false);
  const [unlockedData, setUnlockedData] = useState<CapsuleDetail | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/capsules/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '胶囊不存在');
      }
      const data: CapsuleDetail = await res.json();
      setCapsule(data);
      setIsUnlockedAvailable(data.isUnlocked);
      if (data.isUnlocked && data.content) {
        setUnlockedData(data);
        setContentRevealed(true);
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleUnlock = async () => {
    if (!id || !isUnlockedAvailable || contentRevealed) return;
    initAudioContext();
    try {
      const res = await fetch(`/api/capsules/${id}/unlock`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '解锁失败');
      }
      const data: any = await res.json();
      setUnlockedData(data);
    } catch (err: any) {
      setError(err.message || '解锁失败，请重试');
    }
  };

  const handleCapsuleClick = () => {
    if (!capsule) return;
    initAudioContext();
    if (isUnlockedAvailable && !contentRevealed) {
      handleUnlock();
    }
  };

  const handleCopyShare = async () => {
    if (!capsule) return;
    try {
      await copyToClipboard(capsule.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动复制');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <div>加载中...</div>
      </div>
    );
  }

  if (error && !capsule) {
    return (
      <div className="detail-wrapper">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
        <div className="detail-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>😢</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '12px' }}>{error}</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            这个胶囊可能已经丢失或链接无效
          </div>
        </div>
      </div>
    );
  }

  if (!capsule) return null;

  const dataToShow = contentRevealed && unlockedData ? unlockedData : null;

  return (
    <div className="detail-wrapper">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="detail-card">
        {error && <div className="error-message">⚠️ {error}</div>}

        <h1 className="detail-title">「{capsule.title}」</h1>

        <div className="detail-capsule-wrapper">
          <Capsule3D
            isUnlocked={isUnlockedAvailable}
            unlockTime={capsule.unlockTime}
            onUnlock={() => setContentRevealed(true)}
            onClick={handleCapsuleClick}
            interactive={true}
            size="large"
          />
        </div>

        <div className="detail-countdown">
          <div className="detail-countdown-label">
            {isUnlockedAvailable ? (contentRevealed ? '🎉 胶囊已开启' : '✨ 已到达解锁时间，点击胶囊开启！') : '距离解锁还有'}
          </div>
          <CountdownTimer
            unlockTime={capsule.unlockTime}
            onExpire={() => setIsUnlockedAvailable(true)}
          />
        </div>

        {!contentRevealed && (
          <button
            className={`detail-unlock-btn ${isUnlockedAvailable ? 'available' : ''}`}
            disabled={!isUnlockedAvailable}
            onClick={() => {
              initAudioContext();
              if (isUnlockedAvailable) handleCapsuleClick();
            }}
          >
            {isUnlockedAvailable ? '✨ 开启胶囊 ✨' : '🔒 尚未到达解锁时间'}
          </button>
        )}

        {dataToShow && (
          <div className="content-reveal">
            {dataToShow.image && (
              <img src={dataToShow.image} alt="胶囊图片" className="content-image" />
            )}
            {dataToShow.content && (
              <div className="content-text">{dataToShow.content}</div>
            )}
            {dataToShow.audio && (
              <div className="content-audio">
                <audio controls src={dataToShow.audio}>
                  您的浏览器不支持音频播放
                </audio>
              </div>
            )}
          </div>
        )}

        <div className="share-section">
          <div className="share-label">🔗 分享链接（发送给朋友，让他们一起见证开启时刻）</div>
          <div className="share-url-wrapper">
            <div className="share-url">{capsule.shareUrl}</div>
            <button className="btn-copy" onClick={handleCopyShare}>
              {copied ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
