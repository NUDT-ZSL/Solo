import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

type Emotion = 'joy' | 'sorrow' | 'calm' | 'surprise';

interface Memory {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  emotion: Emotion;
  imageUrl?: string;
  createdAt: number;
}

const EMOTION_COLORS: Record<Emotion, string> = {
  joy: '#FFD700',
  sorrow: '#6A5ACD',
  calm: '#48C9B0',
  surprise: '#FF6B9D',
};

const EMOTION_LABELS: Record<Emotion, string> = {
  joy: '喜悦',
  sorrow: '忧伤',
  calm: '平静',
  surprise: '惊喜',
};

function useRipple<T extends HTMLElement>() {
  const createRipple = useCallback((e: React.MouseEvent<T>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = 120;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out forwards;
      pointer-events: none;
    `;
    button.style.position = button.style.position || 'relative';
    button.style.overflow = button.style.overflow || 'hidden';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);
  return createRipple;
}

const StarBackground: React.FC = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.2 + 0.1,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    }));
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.05)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: var(--base-opacity); }
          50% { opacity: calc(var(--base-opacity) * 3); }
        }
      `}</style>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: '#ffffff',
            opacity: s.opacity,
            animation: `star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            ['--base-opacity' as any]: s.opacity,
          }}
        />
      ))}
    </div>
  );
};

interface EmotionFilterProps {
  activeFilter: Emotion | null;
  onToggle: (emotion: Emotion) => void;
}

const EmotionFilter: React.FC<EmotionFilterProps> = ({ activeFilter, onToggle }) => {
  const createRipple = useRipple<HTMLButtonElement>();
  const emotions: Emotion[] = ['joy', 'sorrow', 'calm', 'surprise'];

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        padding: '24px 16px',
        background: 'linear-gradient(to bottom, rgba(27,31,42,0.95) 0%, rgba(27,31,42,0) 100%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {emotions.map((emotion) => {
        const isActive = activeFilter === emotion;
        return (
          <button
            key={emotion}
            onClick={(e) => {
              createRipple(e);
              onToggle(emotion);
            }}
            style={{
              width: 80,
              padding: '8px 12px',
              borderRadius: 20,
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              background: EMOTION_COLORS[emotion],
              opacity: isActive ? 1 : 0.6,
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? `0 4px 20px ${EMOTION_COLORS[emotion]}80` : 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
              (e.currentTarget as HTMLButtonElement).style.transform = isActive ? 'scale(1.08)' : 'scale(1)';
            }}
          >
            {EMOTION_LABELS[emotion]}
          </button>
        );
      })}
    </div>
  );
};

interface MemoryNodeProps {
  memory: Memory;
  index: number;
  isExpanded: boolean;
  isFilteredOut: boolean;
  isNew: boolean;
  onToggle: (id: string) => void;
  onPlay: (memory: Memory) => void;
}

const MemoryNode: React.FC<MemoryNodeProps> = ({ memory, index, isExpanded, isFilteredOut, isNew, onToggle, onPlay }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const createRipple = useRipple<HTMLDivElement>();
  const playRipple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, []);

  const isLeft = index % 2 === 0;

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '12px 0',
        opacity: isFilteredOut ? 0.3 : 1,
        transition: 'opacity 0.4s ease',
        animation: isNew ? 'slide-up 0.5s ease-out forwards' : undefined,
      }}
    >
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ripple-animation {
          to { transform: scale(1); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {isVisible && (
        <>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 2,
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.2) 80%, transparent)',
              transform: 'translateX(-50%)',
              zIndex: 0,
            }}
          />

          <div
            onClick={(e) => {
              createRipple(e);
              onToggle(memory.id);
            }}
            style={{
              position: 'relative',
              zIndex: 2,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: EMOTION_COLORS[memory.emotion],
              opacity: 0.75,
              cursor: 'pointer',
              boxShadow: `0 0 30px ${EMOTION_COLORS[memory.emotion]}60`,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.15)';
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1)';
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
          >
            <span style={{ opacity: 0.9 }}>
              {memory.emotion === 'joy' && '☀️'}
              {memory.emotion === 'sorrow' && '🌧️'}
              {memory.emotion === 'calm' && '🌿'}
              {memory.emotion === 'surprise' && '✨'}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              [isLeft ? 'right' : 'left']: '50%',
              marginRight: isLeft ? 90 : 0,
              marginLeft: isLeft ? 0 : 90,
              transform: isExpanded ? 'scale(1)' : 'scale(0.7)',
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? 'auto' : 'none',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 5,
              display: 'flex',
              [isLeft ? 'justifyContent' : 'justifyContent']: isLeft ? 'flex-end' : 'flex-start',
              width: 280,
            }}
          >
            <div
              style={{
                width: 280,
                height: 320,
                borderRadius: 16,
                background: 'rgba(30,30,50,0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {memory.imageUrl && (
                <div
                  style={{
                    height: 120,
                    backgroundImage: `url(${memory.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '16px 16px 0 0',
                  }}
                />
              )}
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  overflow: 'hidden',
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {memory.title}
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <span>📅</span>
                  <span>{memory.date}</span>
                </div>
                {memory.location && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <span>📍</span>
                    <span>{memory.location}</span>
                  </div>
                )}
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.5,
                    margin: 0,
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {memory.description}
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playRipple(e);
                      onPlay(memory);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: `linear-gradient(135deg, ${EMOTION_COLORS[memory.emotion]}, ${EMOTION_COLORS[memory.emotion]}CC)`,
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                  >
                    播放回忆 ▶
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [emotion, setEmotion] = useState<Emotion>('joy');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const submitRipple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setEmotion('joy');
      setTitle('');
      setLocation('');
      setDescription('');
      setImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!title.trim()) return;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('date', date);
    formData.append('emotion', emotion);
    formData.append('location', location);
    formData.append('description', description);
    if (image) formData.append('image', image);
    submitRipple(e);
    onSubmit(formData);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fade-in 0.3s ease',
      }}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          height: 480,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #2A2A3E 0%, #1E1E32 100%)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'modal-in 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 4, fontSize: 22, fontWeight: 700 }}>🧵 编织新记忆</h2>

        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>情绪标签</label>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value as Emotion)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {(['joy', 'sorrow', 'calm', 'surprise'] as Emotion[]).map((e) => (
              <option key={e} value={e} style={{ background: '#1E1E32' }}>
                {EMOTION_LABELS[e]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>标题 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这段记忆起个名字..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>地点</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="这段记忆发生在哪里..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
            描述 <span style={{ color: 'rgba(255,255,255,0.3)' }}>({description.length}/200)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            placeholder="写下这段记忆的故事..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
            图片 <span style={{ color: 'rgba(255,255,255,0.3)' }}>(JPG/PNG, 5MB以内)</span>
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size <= 5 * 1024 * 1024) setImage(f);
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          />
          {image && <div style={{ fontSize: 12, color: EMOTION_COLORS[emotion], marginTop: 4 }}>已选择: {image.name}</div>}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            style={{
              flex: 1.5,
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: `linear-gradient(135deg, ${EMOTION_COLORS[emotion]}, ${EMOTION_COLORS[emotion]}99)`,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              opacity: title.trim() ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (title.trim()) {
                (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            提交记忆
          </button>
        </div>
      </div>
    </div>
  );
};

interface PlaybackAnimationProps {
  memory: Memory;
  onClose: () => void;
}

const PlaybackAnimation: React.FC<PlaybackAnimationProps> = ({ memory, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<number>(0);
  const [displayText, setDisplayText] = useState('');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; dx: number; dy: number; size: number; color: string }>>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 900);
    const t3 = setTimeout(() => setStage(3), 1800);

    const colors = Object.values(EMOTION_COLORS);
    const keywords = memory.title.split(/[\s,，。！？、]+/).filter(Boolean);
    const count = Math.min(30, Math.max(20, keywords.length * 5 + 10));
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      dx: (Math.random() - 0.5) * 300,
      dy: (Math.random() - 0.5) * 300,
      size: Math.random() * 4 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t4 = setTimeout(() => setParticles(newParticles), 500);

    const t5 = setTimeout(onClose, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [memory, onClose]);

  useEffect(() => {
    if (stage === 2) {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= memory.description.length) {
          setDisplayText(memory.description.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, Math.max(20, 800 / Math.max(memory.description.length, 1)));
      return () => clearInterval(interval);
    }
  }, [stage, memory.description]);

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        animation: 'darken 1s ease forwards',
      }}
    >
      <style>{`
        @keyframes darken {
          from { background: rgba(0,0,0,0); }
          to { background: #000000; }
        }
        @keyframes image-fade {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes particle-fly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes title-glow {
          0%, 100% { text-shadow: 0 0 20px currentColor; }
          50% { text-shadow: 0 0 40px currentColor, 0 0 80px currentColor; }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: EMOTION_COLORS[memory.emotion],
            animation: stage >= 1 ? 'title-glow 2s ease infinite' : 'none',
            opacity: stage >= 1 ? 1 : 0,
            transition: 'opacity 0.5s ease',
            textAlign: 'center',
          }}
        >
          {memory.title}
        </h1>

        {memory.imageUrl && (
          <div
            style={{
              width: 280,
              height: 180,
              borderRadius: 16,
              backgroundImage: `url(${memory.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: `0 0 60px ${EMOTION_COLORS[memory.emotion]}40`,
              opacity: stage >= 1 ? 1 : 0,
              animation: stage >= 1 ? 'image-fade 0.5s ease forwards' : 'none',
            }}
          />
        )}

        <p
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.8,
            textAlign: 'center',
            minHeight: 60,
            opacity: stage >= 2 ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {displayText}
          {stage >= 2 && displayText.length < memory.description.length && (
            <span style={{ color: EMOTION_COLORS[memory.emotion] }}>▊</span>
          )}
        </p>

        {memory.location && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 15,
              color: 'rgba(255,255,255,0.7)',
              padding: '10px 20px',
              borderRadius: 30,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              opacity: stage >= 3 ? 1 : 0,
              animation: stage >= 3 ? 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards' : 'none',
            }}
          >
            <span style={{ fontSize: 20 }}>📍</span>
            <span>{memory.location}</span>
            <span style={{ opacity: 0.5, marginLeft: 8 }}>📅 {memory.date}</span>
          </div>
        )}
      </div>

      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '40%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            transform: `translate(${p.dx}px, ${p.dy}px)`,
            animation: 'particle-fly 3s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.4)',
          opacity: stage >= 3 ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        点击任意位置返回时间线
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Emotion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playingMemory, setPlayingMemory] = useState<Memory | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const addRipple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    fetch('/api/memories')
      .then((r) => r.json())
      .then((data) => setMemories(data))
      .catch(() => console.warn('后端未启动，使用空数据'));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleFilter = useCallback((emotion: Emotion) => {
    setActiveFilter((prev) => (prev === emotion ? null : emotion));
  }, []);

  const handleSubmit = useCallback(async (formData: FormData) => {
    try {
      const res = await fetch('/api/memories', { method: 'POST', body: formData });
      if (res.ok) {
        const newMem = (await res.json()) as Memory;
        setMemories((prev) => [newMem, ...prev]);
        setNewIds((prev) => new Set(prev).add(newMem.id));
        setTimeout(() => setNewIds((prev) => { const s = new Set(prev); s.delete(newMem.id); return s; }), 1000);
        setIsModalOpen(false);
      }
    } catch (e) {
      const newMem: Memory = {
        id: Date.now().toString(),
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        location: (formData.get('location') as string) || '',
        description: (formData.get('description') as string) || '',
        emotion: formData.get('emotion') as Emotion,
        createdAt: Date.now(),
      };
      setMemories((prev) => [newMem, ...prev]);
      setNewIds((prev) => new Set(prev).add(newMem.id));
      setTimeout(() => setNewIds((prev) => { const s = new Set(prev); s.delete(newMem.id); return s; }), 1000);
      setIsModalOpen(false);
    }
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      <StarBackground />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 120px',
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            .timeline-container { padding: 0 16px !important; }
          }
        `}</style>

        <div className="timeline-container" style={{ padding: '0 120px' }}>
          <div style={{ textAlign: 'center', padding: '40px 0 10px' }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #FF6B9D, #FFD700, #48C9B0, #6A5ACD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🧵 织忆线轴
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 14 }}>
              将碎片化的记忆编织成永恒的丝线
            </p>
          </div>

          <EmotionFilter activeFilter={activeFilter} onToggle={handleFilter} />

          <div style={{ padding: '10px 0 160px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {memories.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 15,
                }}
              >
                点击右下角的 + 按钮，编织你的第一段记忆 ✨
              </div>
            )}
            {memories.map((mem, idx) => (
              <MemoryNode
                key={mem.id}
                memory={mem}
                index={idx}
                isExpanded={expandedId === mem.id}
                isFilteredOut={activeFilter !== null && mem.emotion !== activeFilter}
                isNew={newIds.has(mem.id)}
                onToggle={handleToggle}
                onPlay={(m) => setPlayingMemory(m)}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          addRipple(e);
          setIsModalOpen(true);
        }}
        style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #FF6B9D 0%, #FF8FAB 100%)',
          color: '#fff',
          fontSize: 36,
          fontWeight: 300,
          cursor: 'pointer',
          boxShadow: '0 10px 40px rgba(255,107,157,0.5)',
          zIndex: 50,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        +
      </button>

      <AddMemoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} />

      {playingMemory && (
        <PlaybackAnimation memory={playingMemory} onClose={() => setPlayingMemory(null)} />
      )}
    </div>
  );
};

export default App;
