import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendsApi, favoritesApi } from '../utils/api';
import { templates } from '../utils/templates';
import type { SendRecord, Template, CardElement, EffectsConfig } from '../types';

interface ViewCardProps {
  token: string;
  onReply?: (templateId: number) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  phase: number;
}

interface Petal {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
}

const ViewCard: React.FC<ViewCardProps> = ({ token, onReply }) => {
  const [loading, setLoading] = useState(true);
  const [sendData, setSendData] = useState<SendRecord | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const [petals, setPetals] = useState<Petal[]>([]);
  const [glowPhase, setGlowPhase] = useState(0);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [textBlinkOpacity, setTextBlinkOpacity] = useState(1);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCard();
    initStars();
    initPetals();
  }, [token]);

  const loadCard = async () => {
    try {
      setLoading(true);
      const data = await sendsApi.getByToken(token) as SendRecord;
      setSendData(data);
      const tmpl = templates.find(t => t.id === data.card.template_id);
      if (tmpl) setTemplate(tmpl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initStars = () => {
    const newStars: Star[] = [];
    for (let i = 0; i < 30; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        opacity: Math.random(),
        phase: Math.random() * Math.PI * 2,
      });
    }
    setStars(newStars);
  };

  const initPetals = () => {
    const newPetals: Petal[] = [];
    for (let i = 0; i < 15; i++) {
      newPetals.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * -20,
        size: Math.random() * 20 + 10,
        rotation: Math.random() * 360,
        speed: Math.random() * 0.5 + 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    setPetals(newPetals);
  };

  const animate = useCallback((currentTime: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = (currentTime - lastTimeRef.current) * speed;
    lastTimeRef.current = currentTime;

    setStars(prevStars =>
      prevStars.map(star => ({
        ...star,
        phase: star.phase + deltaTime * 0.003,
        opacity: (Math.sin(star.phase + deltaTime * 0.003) + 1) / 2,
      }))
    );

    setPetals(prevPetals =>
      prevPetals.map(petal => {
        let newY = petal.y + petal.speed * deltaTime * 0.05;
        let newX = petal.x + Math.sin(petal.wobble) * 0.1;
        const newWobble = petal.wobble + petal.wobbleSpeed * deltaTime * 0.1;
        const newRotation = petal.rotation + deltaTime * 0.05;

        if (newY > 110) {
          newY = -10;
          newX = Math.random() * 100;
        }
        if (newX < -5) newX = 105;
        if (newX > 105) newX = -5;

        return {
          ...petal,
          x: newX,
          y: newY,
          rotation: newRotation,
          wobble: newWobble,
        };
      })
    );

    setGlowPhase(prev => (prev + deltaTime * 0.001) % (Math.PI * 2));
    setRotateAngle(prev => (prev + deltaTime * 0.01) % 360);
    setTextBlinkOpacity(prev => {
      const newOpacity = 0.5 + 0.5 * Math.abs(Math.sin(currentTime * 0.002 * speed));
      return newOpacity;
    });

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, speed]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const increaseSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    if (currentIndex < SPEED_OPTIONS.length - 1) {
      setSpeed(SPEED_OPTIONS[currentIndex + 1]);
    }
  };

  const decreaseSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    if (currentIndex > 0) {
      setSpeed(SPEED_OPTIONS[currentIndex - 1]);
    }
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const toggleFavorite = async () => {
    if (!sendData) return;

    try {
      if (!isFavorited) {
        await favoritesApi.add(sendData.card.id);
        setIsFavorited(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error('Failed to favorite:', err);
    }
  };

  const handleReply = () => {
    if (onReply && template) {
      onReply(template.id);
    }
  };

  const effects: EffectsConfig = sendData?.card.effects || {
    isSparkleEnabled: false,
    isPetalEnabled: false,
    isGlowEnabled: false,
    isRotateEnabled: false,
    isTextBlinkEnabled: false,
  };

  const elements: CardElement[] = sendData?.card.elements || [];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  const glowIntensity = effects.isGlowEnabled ? (Math.sin(glowPhase) + 1) / 2 : 0;

  return (
    <div style={styles.container}>
      <div style={styles.cardWrapper}>
        <div style={styles.senderInfo}>
          <p style={styles.senderName}>
            来自 {sendData?.senderName || '匿名'} 的祝福
          </p>
          <p style={styles.sendTime}>
            {sendData?.sendTime ? new Date(sendData.sendTime).toLocaleString() : ''}
          </p>
        </div>

        <div
          ref={cardRef}
          style={{
            ...styles.card,
            background: template?.colors.background || '#fff',
            border: `2px solid white`,
            boxShadow: effects.isGlowEnabled
              ? `0 0 ${30 + glowIntensity * 40}px rgba(255, 215, 0, ${0.3 + glowIntensity * 0.4}), 0 20px 60px rgba(0,0,0,0.5)`
              : '0 20px 60px rgba(0,0,0,0.5)',
            transform: effects.isRotateEnabled ? `rotate(${rotateAngle * 0.1}deg)` : 'none',
          }}
        >
          {effects.isSparkleEnabled && stars.map(star => (
            <div
              key={star.id}
              style={{
                ...styles.sparkle,
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              }}
            />
          ))}

          {effects.isPetalEnabled && petals.map(petal => (
            <div
              key={petal.id}
              style={{
                ...styles.petal,
                left: `${petal.x}%`,
                top: `${petal.y}%`,
                width: petal.size,
                height: petal.size,
                transform: `rotate(${petal.rotation}deg)`,
              }}
            >
              🌸
            </div>
          ))}

          <div style={styles.cardContent}>
            {elements.length > 0 ? (
              elements.map(element => (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: element.zIndex,
                    opacity: effects.isTextBlinkEnabled && element.type === 'text'
                      ? textBlinkOpacity
                      : (element.opacity ?? 1),
                    transform: element.rotation ? `rotate(${element.rotation}deg)` : 'none',
                  }}
                >
                  {element.type === 'text' ? (
                    <span
                      style={{
                        fontSize: element.fontSize || 16,
                        color: element.color || '#333',
                        fontFamily: element.fontFamily || 'inherit',
                        fontWeight: element.fontWeight || 'normal',
                        textAlign: (element.textAlign as any) || 'left',
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      {element.content}
                    </span>
                  ) : (
                    <img
                      src={element.content}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: element.borderRadius || 0,
                      }}
                    />
                  )}
                </div>
              ))
            ) : (
              <div style={styles.defaultContent}>
                <div style={{
                  ...styles.defaultCardInner,
                  background: template?.colors.primary || '#ff8c42',
                }}>
                  <span style={styles.defaultEmoji}>
                    {template?.decorations.slice(0, 3).join('') || '🎉🎊✨'}
                  </span>
                </div>
                <h1 style={{
                  ...styles.defaultGreeting,
                  color: template?.colors.primary || '#ff8c42',
                  opacity: effects.isTextBlinkEnabled ? textBlinkOpacity : 1,
                }}>
                  节日快乐！
                </h1>
                <p style={styles.defaultMessage}>
                  收到来自 {sendData?.senderName || '朋友'} 的祝福
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.controls}>
          <button onClick={togglePlay} style={styles.controlButton}>
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>

          <div style={styles.speedControl}>
            <button
              onClick={decreaseSpeed}
              style={{
                ...styles.speedButton,
                opacity: speed === SPEED_OPTIONS[0] ? 0.5 : 1,
              }}
              disabled={speed === SPEED_OPTIONS[0]}
            >
              −
            </button>
            <span style={styles.speedDisplay}>{speed.toFixed(2)}x</span>
            <button
              onClick={increaseSpeed}
              style={{
                ...styles.speedButton,
                opacity: speed === SPEED_OPTIONS[SPEED_OPTIONS.length - 1] ? 0.5 : 1,
              }}
              disabled={speed === SPEED_OPTIONS[SPEED_OPTIONS.length - 1]}
            >
              +
            </button>
          </div>

          <div style={styles.speedPresets}>
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                style={{
                  ...styles.speedPresetButton,
                  background: speed === s ? '#ff8c42' : 'rgba(255,255,255,0.1)',
                  color: speed === s ? 'white' : '#ccc',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div style={styles.actionButtons}>
          <button onClick={handleReply} style={styles.replyButton}>
            💌 回复贺卡
          </button>
          <button
            onClick={toggleFavorite}
            style={{
              ...styles.favoriteButton,
              color: isFavorited ? '#ff6b6b' : '#ccc',
            }}
          >
            {isFavorited ? '❤️' : '🤍'} 收藏
          </button>
        </div>
      </div>

      {showToast && (
        <div style={styles.toast}>
          ✨ 收藏成功
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  loadingText: {
    fontSize: '16px',
    color: '#999',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  errorText: {
    fontSize: '16px',
    color: '#e74c3c',
    textAlign: 'center',
  },
  cardWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  senderInfo: {
    textAlign: 'center',
    marginBottom: '10px',
  },
  senderName: {
    fontSize: '16px',
    color: '#b0b0b0',
    margin: '0 0 6px 0',
    fontWeight: '500',
  },
  sendTime: {
    fontSize: '13px',
    color: '#808080',
    margin: 0,
  },
  card: {
    width: 800,
    height: 1000,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.3s ease, transform 0.1s linear',
  },
  sparkle: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #fff 0%, #ffd700 50%, transparent 100%)',
    pointerEvents: 'none',
    boxShadow: '0 0 6px 2px rgba(255, 215, 0, 0.6)',
  },
  petal: {
    position: 'absolute',
    pointerEvents: 'none',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  defaultContent: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '30px',
    padding: '60px',
  },
  defaultCardInner: {
    width: 200,
    height: 260,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  },
  defaultEmoji: {
    fontSize: 72,
  },
  defaultGreeting: {
    fontSize: 42,
    fontWeight: 'bold',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
    transition: 'opacity 0.1s ease',
  },
  defaultMessage: {
    fontSize: 18,
    color: '#666',
    margin: 0,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  controlButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #ff8c42, #ff6f42)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: 100,
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  speedButton: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  speedDisplay: {
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
    minWidth: 60,
    textAlign: 'center',
  },
  speedPresets: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  speedPresetButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionButtons: {
    display: 'flex',
    gap: '16px',
    marginTop: '10px',
  },
  replyButton: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  favoriteButton: {
    padding: '12px 28px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toast: {
    position: 'fixed',
    top: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 28px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    zIndex: 1000,
    animation: 'fadeInDown 0.3s ease',
  },
};

export default ViewCard;
