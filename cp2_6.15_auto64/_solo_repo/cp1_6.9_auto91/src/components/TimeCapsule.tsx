import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CapsuleData, CapsuleDetail } from '../App';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
};

interface CapsuleCardProps {
  capsule: CapsuleData;
  onClick: () => void;
}

export const CapsuleCard: React.FC<CapsuleCardProps> = ({ capsule, onClick }) => {
  const hasImage = capsule.images && capsule.images.length > 0;
  const hasAudio = !!capsule.audio;
  const previewText = capsule.content.replace(/[#*`_~\[\]()]/g, '').slice(0, 80);

  return (
    <div className="capsule-card" onClick={onClick}>
      <div className="capsule-card-date">{formatDate(capsule.createdAt)}</div>
      <div
        className={`capsule-card-thumbnail ${!hasImage ? 'gradient' : ''}`}
        style={hasImage ? { backgroundImage: `url(${capsule.images[0]})` } : undefined}
      >
        {hasAudio && (
          <div className="capsule-card-play" title="包含录音">
            ▶
          </div>
        )}
      </div>
      <div className="capsule-card-body">
        <div className="capsule-card-title">
          {capsule.title || '无题胶囊'}
        </div>
        <div className="capsule-card-preview">
          {previewText || '（无文字内容）'}
        </div>
        <div className="capsule-card-meta">
          <span>📷 {capsule.images?.length || 0} 张</span>
          {hasAudio && <span>🎙️ 含录音</span>}
          {capsule.archived && <span style={{ color: '#f85149' }}>🗄️ 已归档</span>}
        </div>
      </div>
    </div>
  );
};

interface TypewriterContentProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypewriterContent: React.FC<TypewriterContentProps> = ({
  text,
  speed = 80,
  onComplete,
}) => {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (indexRef.current >= text.length) {
        onComplete?.();
        return;
      }
      if (now - lastTimeRef.current >= speed) {
        const charsToAdd = Math.min(
          Math.floor((now - lastTimeRef.current) / speed),
          text.length - indexRef.current
        );
        indexRef.current += charsToAdd;
        setDisplayed(text.slice(0, indexRef.current));
        lastTimeRef.current = now;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed, onComplete]);

  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      let rendered = line;
      rendered = rendered.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      rendered = rendered.replace(/\*(.+?)\*/g, '<em>$1</em>');
      rendered = rendered.replace(/`(.+?)`/g, '<code>$1</code>');
      rendered = rendered.replace(/^### (.+)$/, '<h3 style="font-size:18px;font-weight:600;margin:16px 0 8px;">$1</h3>');
      rendered = rendered.replace(/^## (.+)$/, '<h2 style="font-size:22px;font-weight:600;margin:20px 0 10px;">$1</h2>');
      rendered = rendered.replace(/^# (.+)$/, '<h1 style="font-size:26px;font-weight:700;margin:24px 0 12px;">$1</h1>');
      rendered = rendered.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:underline;">$1</a>');
      return (
        <React.Fragment key={i}>
          <span dangerouslySetInnerHTML={{ __html: rendered || '&nbsp;' }} />
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const isComplete = displayed.length >= text.length;

  return (
    <div className="detail-content">
      {renderMarkdown(displayed)}
      {!isComplete && <span className="typewriter-cursor" />}
    </div>
  );
};

interface ImageCarouselProps {
  images: string[];
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const startTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (images.length <= 1) return;
    startTimeRef.current = performance.now();
    const SLIDE_DURATION = 4000;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      if (elapsed >= SLIDE_DURATION) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        startTimeRef.current = now;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="detail-carousel">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '64px',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          ✨
        </div>
      </div>
    );
  }

  const goTo = (index: number) => {
    setCurrentIndex(index);
    startTimeRef.current = performance.now();
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    startTimeRef.current = performance.now();
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    startTimeRef.current = performance.now();
  };

  return (
    <div className="detail-carousel">
      {images.map((img, i) => (
        <div
          key={i}
          className={`carousel-slide ${i === currentIndex ? 'active' : ''}`}
        >
          <img src={img} alt={`slide-${i}`} />
        </div>
      ))}
      {images.length > 1 && (
        <>
          <button className="carousel-arrow prev" onClick={goPrev}>
            ‹
          </button>
          <button className="carousel-arrow next" onClick={goNext}>
            ›
          </button>
          <div className="carousel-dots">
            {images.map((_, i) => (
              <div
                key={i}
                className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface AudioSpectrumProps {
  audioSrc: string | null;
  autoPlay?: boolean;
}

export const AudioSpectrum: React.FC<AudioSpectrumProps> = ({
  audioSrc,
  autoPlay = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const barsRef = useRef<HTMLDivElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const BAR_COUNT = 48;

  useEffect(() => {
    if (!audioSrc) return;
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.src = audioSrc;

    const initAudioContext = () => {
      if (audioCtxRef.current || !containerRef.current) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;
        const source = ctx.createMediaElementSource(audio);
        sourceRef.current = source;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        containerRef.current.innerHTML = '';
        barsRef.current = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const bar = document.createElement('div');
          bar.className = 'spectrum-bar';
          bar.style.height = '4px';
          containerRef.current.appendChild(bar);
          barsRef.current.push(bar);
        }
      } catch (err) {
        console.warn('频谱初始化失败', err);
      }
    };

    const animate = () => {
      const analyser = analyserRef.current;
      const bars = barsRef.current;
      if (analyser && bars.length > 0 && !audio.paused) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(bufferLength / BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          const value = dataArray[i * step] || 0;
          const height = Math.max(4, Math.floor((value / 255) * 80));
          bars[i].style.height = `${height}px`;
        }
      } else if (bars.length > 0) {
        for (let i = 0; i < BAR_COUNT; i++) {
          const currentH = parseInt(bars[i].style.height) || 4;
          const newH = Math.max(4, currentH * 0.85);
          bars[i].style.height = `${newH}px`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const handlePlay = () => {
      initAudioContext();
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          console.info('自动播放被浏览器阻止，用户需手动播放');
        });
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioSrc, autoPlay]);

  if (!audioSrc) return null;

  return (
    <div className="detail-audio-section">
      <div className="audio-section-title">
        🎙️ 语音记录 <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '12px' }}>（{isPlaying ? '播放中' : '已暂停'}）</span>
      </div>
      <div ref={containerRef} className="spectrum-visualizer">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div key={i} className="spectrum-bar" style={{ height: '4px' }} />
        ))}
      </div>
      <audio ref={audioRef} controls style={{ width: '100%' }} />
    </div>
  );
};

interface CapsuleDetailModalProps {
  capsule: CapsuleDetail;
  onClose: () => void;
  onEdit: (id: string, password: string) => Promise<boolean>;
  onDelete: (id: string, password: string) => Promise<boolean>;
  showToast: (msg: string) => void;
}

export const CapsuleDetailModal: React.FC<CapsuleDetailModalProps> = ({
  capsule,
  onClose,
  onEdit,
  onDelete,
  showToast,
}) => {
  const [showPasswordModal, setShowPasswordModal] = useState<'edit' | 'delete' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = !!capsule.isOwner;

  const shareLink = `${window.location.origin}${window.location.pathname}#capsule/${capsule.shareId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      showToast('分享链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  const handleEditClick = () => {
    setPasswordError('');
    setPasswordInput('');
    setShowPasswordModal('edit');
  };

  const handleDeleteClick = () => {
    setPasswordError('');
    setPasswordInput('');
    setShowPasswordModal('delete');
  };

  const handlePasswordSubmit = async () => {
    if (!/^\d{6}$/.test(passwordInput)) {
      setPasswordError('请输入6位数字密码');
      return;
    }
    if (showPasswordModal === 'edit') {
      const success = await onEdit(capsule.id, passwordInput);
      if (success) {
        setShowPasswordModal(null);
      } else {
        setPasswordError('密码错误');
      }
    } else if (showPasswordModal === 'delete') {
      setShowPasswordModal(null);
      setShowConfirmDelete(true);
    }
  };

  const handleConfirmDelete = async () => {
    const success = await onDelete(capsule.id, passwordInput);
    if (success) {
      setShowConfirmDelete(false);
    } else {
      setShowConfirmDelete(false);
      setPasswordError('删除失败，密码错误');
    }
  };

  const images: string[] = Array.isArray(capsule.images) ? capsule.images : [];
  const audioSrc: string | null = typeof capsule.audio === 'string' ? capsule.audio : null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && !showPasswordModal && !showConfirmDelete) {
        onClose();
      }
    }}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="detail-header">
          <div className="detail-date">{formatDate(capsule.createdAt)}</div>
          <h1 className="detail-title">{capsule.title || '无题胶囊'}</h1>
          {capsule.accessCountLeft !== undefined && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              今日剩余访问次数：{capsule.accessCountLeft} 次
            </div>
          )}
        </div>

        <div className="detail-body">
          <ImageCarousel images={images} />
          <TypewriterContent text={capsule.content || ''} />
          <AudioSpectrum audioSrc={audioSrc} autoPlay={true} />
        </div>

        <div className="detail-footer">
          <div className="share-info">
            <div className="share-link" title={shareLink}>
              🔗 {shareLink}
            </div>
            <button className="copy-btn" onClick={handleCopyLink}>
              {copied ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
          {isOwner && (
            <div className="detail-actions">
              <button className="btn-secondary" onClick={handleEditClick}>
                ✏️ 修改
              </button>
              <button className="btn-danger" onClick={handleDeleteClick}>
                🗑️ 删除
              </button>
            </div>
          )}
          {!isOwner && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              💡 非创建者视图 · 仅可查看
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content password-modal">
            <div className="password-modal-body">
              <div className="password-modal-title">
                {showPasswordModal === 'edit' ? '验证身份以修改' : '验证身份以删除'}
              </div>
              <div className="password-modal-desc">
                请输入创建该胶囊时设置的6位数字密码
              </div>
              {passwordError && (
                <div className="error-message">{passwordError}</div>
              )}
              <input
                type="password"
                className="password-input-large"
                placeholder="••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePasswordSubmit();
                }}
                autoFocus
              />
              <div className="password-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowPasswordModal(null)}
                >
                  取消
                </button>
                <button className="btn-primary" onClick={handlePasswordSubmit}>
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="confirm-modal-body">
              <div className="confirm-modal-title">⚠️ 确认删除此胶囊？</div>
              <div className="confirm-modal-desc">
                删除后数据将永久丢失，此操作不可撤销。
              </div>
              <div className="password-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  取消
                </button>
                <button className="btn-danger" onClick={handleConfirmDelete}>
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
