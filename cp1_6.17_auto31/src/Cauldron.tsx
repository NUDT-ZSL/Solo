import { useState, useEffect, useRef, useCallback } from 'react';
import {
  brewPotion,
  mixIngredientColors,
  getQualityStars,
  type BrewResult,
  type EventType,
} from './potionEngine';
import './Cauldron.css';

interface CauldronProps {
  ingredientIds: string[];
  isBrewing: boolean;
  onBrewStart: () => void;
  onBrewComplete: (result: BrewResult) => void;
  onInvalidRecipe: () => void;
}

type ParticleType = 'rise' | 'spark' | 'smoke' | 'debris' | 'star' | 'default';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  type: ParticleType;
  rotation?: number;
  rotationSpeed?: number;
  gravity?: number;
}

export default function Cauldron({
  ingredientIds,
  isBrewing,
  onBrewStart,
  onBrewComplete,
  onInvalidRecipe,
}: CauldronProps) {
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [brewResult, setBrewResult] = useState<BrewResult | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [burstEffect, setBurstEffect] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [shakeEffect, setShakeEffect] = useState<'' | 'minor' | 'major'>('');

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const resultTriggeredRef = useRef(false);
  const liquidColor = mixIngredientColors(ingredientIds);

  const createDefaultParticle = useCallback((): Particle => {
    const centerX = 128;
    const centerY = 130;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 1.8;

    return {
      id: particleIdRef.current++,
      x: centerX + (Math.random() - 0.5) * 70,
      y: centerY,
      vx: Math.cos(angle) * speed * 0.5,
      vy: -speed,
      size: 3 + Math.random() * 4,
      opacity: 0.7,
      color: liquidColor,
      type: 'default',
    };
  }, [liquidColor]);

  const createEventParticles = useCallback((type: EventType): Particle[] => {
    const newParticles: Particle[] = [];
    const centerX = 128;
    const centerY = 128;

    switch (type) {
      case 'success': {
        for (let i = 0; i < 25; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          const speed = 2 + Math.random() * 4;
          const colors = ['#FFD700', '#FFA500', '#FFEC8B', '#FFF8DC'];
          newParticles.push({
            id: particleIdRef.current++,
            x: centerX + (Math.random() - 0.5) * 60,
            y: centerY,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5,
            vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 6,
            opacity: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: 'rise',
            gravity: 0.02,
          });
        }
        break;
      }
      case 'minorBoom': {
        for (let i = 0; i < 35; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          const colors = ['#FF6B35', '#FF8C42', '#FFA726', '#FFD54F'];
          newParticles.push({
            id: particleIdRef.current++,
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 3 + Math.random() * 5,
            opacity: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: 'spark',
            gravity: 0.12,
          });
        }
        break;
      }
      case 'majorBoom': {
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          const colors = ['#8B0000', '#A52A2A', '#CD5C5C', '#F08080'];
          newParticles.push({
            id: particleIdRef.current++,
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 10 + Math.random() * 15,
            opacity: 0.9,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: 'smoke',
            gravity: -0.03,
          });
        }
        for (let i = 0; i < 25; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 4 + Math.random() * 6;
          const colors = ['#4A3728', '#5D4037', '#6D4C41', '#8D6E63'];
          newParticles.push({
            id: particleIdRef.current++,
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 7,
            opacity: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: 'debris',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 20,
            gravity: 0.2,
          });
        }
        break;
      }
      case 'perfect': {
        for (let i = 0; i < 40; i++) {
          const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
          const speed = 4 + Math.random() * 6;
          const colors = [
            '#FF6B9D', '#C084FC', '#818CF8', '#38BDF8',
            '#34D399', '#FBBF24', '#FB923C', '#F87171',
          ];
          newParticles.push({
            id: particleIdRef.current++,
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 7,
            opacity: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: 'star',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            gravity: -0.02,
          });
        }
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 6 + Math.random() * 4;
          newParticles.push({
            id: particleIdRef.current++,
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 4,
            opacity: 1,
            color: '#FFD700',
            type: 'spark',
            gravity: 0.05,
          });
        }
        break;
      }
    }
    return newParticles;
  }, []);

  const startBrewing = useCallback(() => {
    const result = brewPotion(ingredientIds);
    if (!result) {
      onInvalidRecipe();
      animationRef.current = null;
      setTimeout(() => {
        onBrewComplete({
          eventType: 'success',
          potionName: '',
          quality: 'common',
          quantity: 0,
          goldPenalty: 0,
          stopProgress: 0,
        });
      }, 100);
      return;
    }

    onBrewStart();
    console.log('[DEBUG] startBrewing called, result.stopProgress:', result.stopProgress);
    setProgress(0);
    setShowResult(false);
    setBrewResult(null);
    setEventType(null);
    setBurstEffect(false);
    setFlashEffect(false);
    setShakeEffect('');
    resultTriggeredRef.current = false;
    startTimeRef.current = performance.now();
    console.log('[DEBUG] startTimeRef set to:', startTimeRef.current);
    setParticles([]);

    let lastParticleTime = 0;
    let animateFrameCount = 0;

    const animate = (timestamp: number) => {
      animateFrameCount++;
      console.log(`[DEBUG-ANIMATE] ENTER frame=${animateFrameCount}, ts=${timestamp.toFixed(0)}`);
      const elapsed = timestamp - startTimeRef.current;
      const duration = 3000;
      const stopProgress = result.stopProgress;
      const stopTime = (stopProgress / 100) * duration;

      const currentProgress = Math.min((elapsed / duration) * 100, stopProgress);
      console.log(`[DEBUG-ANIMATE] elapsed=${elapsed.toFixed(0)}, progress=${currentProgress.toFixed(2)}, stopTime=${stopTime}`);
      setProgress(currentProgress);

      if (currentProgress >= 5 && timestamp - lastParticleTime > 80) {
        lastParticleTime = timestamp;
        setParticles((prev) => {
          const newParticle = createDefaultParticle();
          const updated = prev
            .map((p) => {
              const gravity = p.gravity ?? 0.05;
              let newVy = p.vy - gravity;
              let newVx = p.vx;
              if (p.type === 'smoke') {
                newVx += (Math.random() - 0.5) * 0.3;
              }
              return {
                ...p,
                x: p.x + newVx,
                y: p.y + newVy,
                vy: newVy,
                vx: newVx,
                opacity: p.opacity - (p.type === 'smoke' ? 0.008 : 0.018),
                size: p.type === 'smoke' ? p.size * 1.015 : p.size * 0.99,
                rotation: p.rotation !== undefined ? p.rotation + (p.rotationSpeed ?? 0) : undefined,
              };
            })
            .filter((p) => p.opacity > 0 && p.y < 320 && p.y > -50 && p.x > -50 && p.x < 320);
          return [...updated.slice(-40), newParticle];
        });
      } else {
        setParticles((prev) =>
          prev
            .map((p) => {
              const gravity = p.gravity ?? 0.03;
              let newVy = p.vy - gravity;
              let newVx = p.vx;
              if (p.type === 'smoke') {
                newVx += (Math.random() - 0.5) * 0.2;
              }
              return {
                ...p,
                x: p.x + newVx,
                y: p.y + newVy,
                vy: newVy,
                vx: newVx,
                opacity: p.opacity - (p.type === 'smoke' ? 0.006 : 0.012),
                size: p.type === 'smoke' ? p.size * 1.012 : p.size * 0.995,
                rotation: p.rotation !== undefined ? p.rotation + (p.rotationSpeed ?? 0) : undefined,
              };
            })
            .filter((p) => p.opacity > 0)
        );
      }

      if (elapsed >= stopTime && !resultTriggeredRef.current) {
        resultTriggeredRef.current = true;
        setEventType(result.eventType);
        setBrewResult(result);
        setShowResult(true);
        setFlashEffect(true);

        if (result.eventType === 'majorBoom') {
          setShakeEffect('major');
        } else if (result.eventType === 'minorBoom') {
          setShakeEffect('minor');
        }

        if (result.eventType === 'perfect') {
          setBurstEffect(true);
        }

        setParticles(createEventParticles(result.eventType));

        setTimeout(() => {
          setFlashEffect(false);
        }, 200);

        setTimeout(() => {
          setShakeEffect('');
        }, 500);

        setTimeout(() => {
          onBrewComplete(result);
          animationRef.current = null;
        }, 1800);
      }

      if (elapsed < stopTime + 2000) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    const rafId = requestAnimationFrame(animate);
    animationRef.current = rafId;
    console.log('[DEBUG] startBrewing END, animationRef.current =', rafId);
  }, [ingredientIds, onBrewStart, onBrewComplete, onInvalidRecipe, createDefaultParticle, createEventParticles]);

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (isBrewing) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        queueMicrotask(() => {
          if (!animationRef.current) {
            startBrewing();
          }
        });
      }
    } else {
      hasStartedRef.current = false;
    }
  }, [isBrewing, startBrewing]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  const remainingRatio = 1 - progress / 100;
  const hue = 220 * remainingRatio + 0 * (progress / 100);
  const saturation = 70 + (progress / 100) * 20;
  const lightness = 50 + (progress / 100) * 10;
  const progressColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const getEventLabel = (type: EventType) => {
    switch (type) {
      case 'success':
        return '✨ 炼制成功！';
      case 'minorBoom':
        return '💥 小爆炸！';
      case 'majorBoom':
        return '🔥 大爆炸！';
      case 'perfect':
        return '🌟 完美品质！';
    }
  };

  const getParticleClassName = (type: ParticleType) => {
    switch (type) {
      case 'rise':
        return 'particle particle-rise';
      case 'spark':
        return 'particle particle-spark';
      case 'smoke':
        return 'particle particle-smoke';
      case 'debris':
        return 'particle particle-debris';
      case 'star':
        return 'particle particle-star';
      default:
        return 'particle';
    }
  };

  return (
    <div className="cauldron-container">
      <h2 className="cauldron-title">⚗️ 炼药台</h2>

      <div className="cauldron-wrapper">
        <div
          className={`cauldron-svg-container ${shakeEffect === 'minor' ? 'shake-minor' : ''} ${
            shakeEffect === 'major' ? 'shake-major' : ''
          }`}
        >
          {flashEffect && <div className="flash-overlay" />}

          {isBrewing && (
            <div className="fire-container">
              <div className="fire fire-back">
                <div className="flame flame-1" />
                <div className="flame flame-2" />
                <div className="flame flame-3" />
              </div>
              <div className="fire fire-front">
                <div className="flame flame-4" />
                <div className="flame flame-5" />
                <div className="flame flame-6" />
                <div className="flame flame-7" />
              </div>
              <div className="ember-container">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`ember ember-${i + 1}`} />
                ))}
              </div>
            </div>
          )}

          {isBrewing && <div className="cauldron-glow" />}

          <svg width="256" height="256" viewBox="0 0 256 256" className={`cauldron-svg ${isBrewing ? 'brewing-active' : ''}`}>
            <ellipse cx="128" cy="200" rx="80" ry="12" fill="rgba(0,0,0,0.3)" />

            <defs>
              <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FF4500" />
                <stop offset="50%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
            </defs>

            <path
              d="M50 100 L50 160 Q50 200 128 200 Q206 200 206 160 L206 100 Z"
              fill="#4A3728"
              stroke="#2E1F15"
              strokeWidth="4"
            />

            <ellipse cx="128" cy="100" rx="78" ry="18" fill="#3E2723" stroke="#2E1F15" strokeWidth="3" />

            <clipPath id="liquidClip">
              <path d="M54 105 L54 160 Q54 196 128 196 Q202 196 202 160 L202 105 Z" />
            </clipPath>

            <g clipPath="url(#liquidClip)">
              <rect
                x="40"
                y={105 + (1 - progress / 100) * 90}
                width="176"
                height="200"
                fill={liquidColor}
                className="liquid-fill"
                style={{ transition: 'y 0.1s linear' }}
              />
              <path
                d={`M40 ${120 + (1 - progress / 100) * 90} Q70 ${110 + (1 - progress / 100) * 90} 100 ${120 + (1 - progress / 100) * 90} T160 ${120 + (1 - progress / 100) * 90} T220 ${120 + (1 - progress / 100) * 90} L220 220 L40 220 Z`}
                fill={liquidColor}
                className="liquid-wave"
                opacity="0.7"
              />
              {isBrewing && progress > 30 && (
                <g className="swirl-group">
                  {[...Array(3)].map((_, i) => (
                    <circle
                      key={i}
                      cx={100 + i * 30}
                      cy={150 + (1 - progress / 100) * 40}
                      r={8 + i * 2}
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1.5"
                      className={`swirl swirl-${i + 1}`}
                    />
                  ))}
                </g>
              )}
            </g>

            <ellipse cx="128" cy="100" rx="78" ry="18" fill="none" stroke="#FFD700" strokeWidth="2" opacity={isBrewing ? 0.8 : 0.5} />

            <path
              d="M50 100 L50 160 Q50 200 128 200 Q206 200 206 160 L206 100"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
            />

            <path
              d="M50 100 L50 160 Q50 200 128 200 Q206 200 206 160 L206 100"
              fill="none"
              stroke="url(#fireGradient)"
              strokeWidth="2"
              opacity={isBrewing ? progress / 200 : 0}
              className="fire-outline"
            />

            {isBrewing && (
              <g className="bubble-group">
                {[...Array(7)].map((_, i) => (
                  <circle
                    key={i}
                    cx={70 + i * 20}
                    cy={130 + (progress / 100) * 40}
                    r={2 + Math.random() * 4}
                    fill="rgba(255,255,255,0.5)"
                    className="bubble"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </g>
            )}

            {burstEffect && (
              <>
                <circle
                  cx="128"
                  cy="128"
                  r="10"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="4"
                  className="burst-ring"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="10"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="burst-ring burst-ring-2"
                />
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <line
                    key={i}
                    x1="128"
                    y1="128"
                    x2={128 + Math.cos((angle * Math.PI) / 180) * 50}
                    y2={128 + Math.sin((angle * Math.PI) / 180) * 50}
                    stroke="#FFD700"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className={`burst-ray burst-ray-${i + 1}`}
                  />
                ))}
              </>
            )}
          </svg>

          {particles.map((p) => (
            <div
              key={p.id}
              className={getParticleClassName(p.type)}
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.type === 'star' ? p.size : p.size,
                backgroundColor: p.type === 'star' ? 'transparent' : p.color,
                opacity: p.opacity,
                transform: p.rotation !== undefined
                  ? `translate(-50%, -50%) rotate(${p.rotation}deg)`
                  : 'translate(-50%, -50%)',
                borderColor: p.color,
                boxShadow: p.type === 'rise' || p.type === 'star' || p.type === 'spark'
                  ? `0 0 ${p.size * 2}px ${p.color}`
                  : undefined,
              }}
            >
              {p.type === 'star' && (
                <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color}>
                  <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
                </svg>
              )}
            </div>
          ))}

          {showResult && brewResult && (
            <div className={`result-overlay event-${eventType}`}>
              <div className="result-content">
                <div className="result-event">{getEventLabel(brewResult.eventType)}</div>
                {brewResult.quantity > 0 && (
                  <>
                    <div className="result-potion">{brewResult.potionName}</div>
                    <div className="result-quality">{getQualityStars(brewResult.quality)}</div>
                    <div className="result-quantity">×{brewResult.quantity}</div>
                  </>
                )}
                {brewResult.goldPenalty > 0 && (
                  <div className="result-penalty">-{brewResult.goldPenalty} 金币</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                backgroundColor: progressColor,
                boxShadow: `0 0 12px ${progressColor}, 0 0 24px ${progressColor}40`,
              }}
            />
            <div
              className="progress-glow-dot"
              style={{
                left: `${Math.min(progress, 98)}%`,
                backgroundColor: progressColor,
                boxShadow: `0 0 10px ${progressColor}, 0 0 20px ${progressColor}`,
              }}
            />
          </div>
          <div className="progress-text">{Math.floor(progress)}%</div>
        </div>

        <div className="status-text">
          {!isBrewing && !showResult && '选择药材后点击开始炼药'}
          {isBrewing && !showResult && (
            progress < 30
              ? '🔥 加热中...'
              : progress < 60
              ? '⚗️ 融合中...'
              : progress < 90
              ? '✨ 凝练中...'
              : '🌟 即将完成！'
          )}
          {showResult && brewResult && (
            brewResult.eventType === 'perfect' ? '🎉 完美成功！' :
            brewResult.eventType === 'success' ? '✅ 炼制完成' :
            brewResult.eventType === 'minorBoom' ? '⚠️ 略有损失' :
            brewResult.eventType === 'majorBoom' ? '💔 炼制失败' : '完成！'
          )}
        </div>
      </div>
    </div>
  );
}
