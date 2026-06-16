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

  const rafRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const resultTriggeredRef = useRef(false);
  const lastParticleTimeRef = useRef(0);
  const brewResultDataRef = useRef<BrewResult | null>(null);
  const isActiveRef = useRef(false);
  const isBrewingRef = useRef(false);
  const liquidColor = mixIngredientColors(ingredientIds);

  const onBrewStartRef = useRef(onBrewStart);
  const onBrewCompleteRef = useRef(onBrewComplete);
  const onInvalidRecipeRef = useRef(onInvalidRecipe);

  useEffect(() => { onBrewStartRef.current = onBrewStart; }, [onBrewStart]);
  useEffect(() => { onBrewCompleteRef.current = onBrewComplete; }, [onBrewComplete]);
  useEffect(() => { onInvalidRecipeRef.current = onInvalidRecipe; }, [onInvalidRecipe]);
  useEffect(() => { isBrewingRef.current = isBrewing; }, [isBrewing]);

  const makeEventParticles = useCallback((type: EventType): Particle[] => {
    const newParticles: Particle[] = [];
    const cx = 128;
    const cy = 128;
    switch (type) {
      case 'success': {
        const goldColors = ['#FFD700', '#FFA500', '#FFEC8B', '#FFF8DC'];
        for (let i = 0; i < 25; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          const speed = 2 + Math.random() * 4;
          newParticles.push({
            id: particleIdRef.current++,
            x: cx + (Math.random() - 0.5) * 60,
            y: cy,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5,
            vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 6,
            opacity: 1,
            color: goldColors[Math.floor(Math.random() * goldColors.length)],
            type: 'rise',
            gravity: 0.02,
          });
        }
        break;
      }
      case 'minorBoom': {
        const orangeColors = ['#FF6B35', '#FF8C42', '#FFA726', '#FFD54F'];
        for (let i = 0; i < 35; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          newParticles.push({
            id: particleIdRef.current++,
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 3 + Math.random() * 5,
            opacity: 1,
            color: orangeColors[Math.floor(Math.random() * orangeColors.length)],
            type: 'spark',
            gravity: 0.12,
          });
        }
        break;
      }
      case 'majorBoom': {
        const redColors = ['#8B0000', '#A52A2A', '#CD5C5C', '#F08080'];
        const brownColors = ['#4A3728', '#5D4037', '#6D4C41', '#8D6E63'];
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          newParticles.push({
            id: particleIdRef.current++,
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 10 + Math.random() * 15,
            opacity: 0.9,
            color: redColors[Math.floor(Math.random() * redColors.length)],
            type: 'smoke',
            gravity: -0.03,
          });
        }
        for (let i = 0; i < 25; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 4 + Math.random() * 6;
          newParticles.push({
            id: particleIdRef.current++,
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 7,
            opacity: 1,
            color: brownColors[Math.floor(Math.random() * brownColors.length)],
            type: 'debris',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 20,
            gravity: 0.2,
          });
        }
        break;
      }
      case 'perfect': {
        const rainbowColors = ['#FF6B9D', '#C084FC', '#818CF8', '#38BDF8', '#34D399', '#FBBF24', '#FB923C', '#F87171'];
        for (let i = 0; i < 40; i++) {
          const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
          const speed = 4 + Math.random() * 6;
          newParticles.push({
            id: particleIdRef.current++,
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 7,
            opacity: 1,
            color: rainbowColors[Math.floor(Math.random() * rainbowColors.length)],
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
            x: cx,
            y: cy,
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

  const particleCreatorRef = useRef(makeEventParticles);
  useEffect(() => { particleCreatorRef.current = makeEventParticles; }, [makeEventParticles]);

  const makeDefaultParticle = useCallback((): Particle => {
    const cx = 128;
    const cy = 130;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 1.8;
    return {
      id: particleIdRef.current++,
      x: cx + (Math.random() - 0.5) * 70,
      y: cy,
      vx: Math.cos(angle) * speed * 0.5,
      vy: -speed,
      size: 3 + Math.random() * 4,
      opacity: 0.7,
      color: liquidColor,
      type: 'default',
    };
  }, [liquidColor]);

  const defaultParticleRef = useRef(makeDefaultParticle);
  useEffect(() => { defaultParticleRef.current = makeDefaultParticle; }, [makeDefaultParticle]);

  const stepParticles = useCallback((prev: Particle[], addNew: boolean): Particle[] => {
    const updated = prev
      .map((p) => {
        const g = p.gravity ?? 0.04;
        let nVy = p.vy - g;
        let nVx = p.vx;
        if (p.type === 'smoke') {
          nVx += (Math.random() - 0.5) * 0.25;
        }
        return {
          ...p,
          x: p.x + nVx,
          y: p.y + nVy,
          vy: nVy,
          vx: nVx,
          opacity: p.opacity - (p.type === 'smoke' ? 0.007 : 0.015),
          size: p.type === 'smoke' ? p.size * 1.014 : p.size * 0.995,
          rotation: p.rotation !== undefined ? p.rotation + (p.rotationSpeed ?? 0) : undefined,
        };
      })
      .filter((p) => p.opacity > 0 && p.y < 330 && p.y > -60 && p.x > -60 && p.x < 330);
    if (addNew) {
      return [...updated.slice(-45), defaultParticleRef.current()];
    }
    return updated;
  }, []);

  const particleUpdaterRef = useRef(stepParticles);
  useEffect(() => { particleUpdaterRef.current = stepParticles; }, [stepParticles]);

  useEffect(() => {
    if (!isBrewing) {
      return;
    }

    const ids = ingredientIds;
    const result = brewPotion(ids);

    if (!result) {
      onInvalidRecipeRef.current();
      const empty: BrewResult = {
        eventType: 'success',
        potionName: '',
        quality: 'common',
        quantity: 0,
        goldPenalty: 0,
        stopProgress: 0,
      };
      const t = window.setTimeout(() => {
        onBrewCompleteRef.current(empty);
      }, 100);
      return () => window.clearTimeout(t);
    }

    onBrewStartRef.current();
    brewResultDataRef.current = result;
    isActiveRef.current = true;
    startTimeRef.current = performance.now();
    resultTriggeredRef.current = false;
    lastParticleTimeRef.current = 0;

    setProgress(0);
    setShowResult(false);
    setBrewResult(null);
    setEventType(null);
    setBurstEffect(false);
    setFlashEffect(false);
    setShakeEffect('');
    setParticles([]);

    const duration = 3000;
    const stopProgress = result.stopProgress;
    const stopTime = (stopProgress / 100) * duration;
    const totalEnd = stopTime + 2000;

    let timeoutsToClear: number[] = [];

    const tick = () => {
      if (!isActiveRef.current) {
        return;
      }

      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const curProg = Math.min((elapsed / duration) * 100, stopProgress);
      setProgress(curProg);

      const addP = curProg >= 5 && now - lastParticleTimeRef.current > 80;
      if (addP) {
        lastParticleTimeRef.current = now;
      }
      setParticles((p) => particleUpdaterRef.current(p, addP));

      if (elapsed >= stopTime && !resultTriggeredRef.current) {
        resultTriggeredRef.current = true;
        const r = brewResultDataRef.current!;
        setEventType(r.eventType);
        setBrewResult(r);
        setShowResult(true);
        setFlashEffect(true);

        if (r.eventType === 'majorBoom') {
          setShakeEffect('major');
        } else if (r.eventType === 'minorBoom') {
          setShakeEffect('minor');
        }

        if (r.eventType === 'perfect') {
          setBurstEffect(true);
        }

        setParticles(particleCreatorRef.current(r.eventType));

        const t1 = window.setTimeout(() => setFlashEffect(false), 200);
        const t2 = window.setTimeout(() => setShakeEffect(''), 500);
        const t3 = window.setTimeout(() => {
          if (isActiveRef.current) {
            isActiveRef.current = false;
            onBrewCompleteRef.current(r);
          }
        }, 1800);
        timeoutsToClear.push(t1, t2, t3);
      }

      if (elapsed >= totalEnd) {
        isActiveRef.current = false;
        if (intervalIdRef.current !== null) {
          window.clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      }
    };

    intervalIdRef.current = window.setInterval(tick, 16);
    tick();

    return () => {
      isActiveRef.current = false;
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      timeoutsToClear.forEach((id) => window.clearTimeout(id));
    };
  }, [isBrewing, ingredientIds]);

  const ratio = progress / 100;
  const startHue = 217;
  const endHue = 0;
  const hue = startHue + (endHue - startHue) * ratio;
  const saturation = 72 + 18 * ratio;
  const lightness = 48 + 14 * ratio;
  const progressColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const getEventLabel = (type: EventType) => {
    switch (type) {
      case 'success': return '✨ 炼制成功！';
      case 'minorBoom': return '💥 小爆炸！';
      case 'majorBoom': return '🔥 大爆炸！';
      case 'perfect': return '🌟 完美品质！';
    }
  };

  const getParticleClassName = (type: ParticleType) => {
    switch (type) {
      case 'rise': return 'particle particle-rise';
      case 'spark': return 'particle particle-spark';
      case 'smoke': return 'particle particle-smoke';
      case 'debris': return 'particle particle-debris';
      case 'star': return 'particle particle-star';
      default: return 'particle';
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
                {Array.from({ length: 8 }).map((_, i) => (
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
                  {Array.from({ length: 3 }).map((_, i) => (
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
            <path d="M50 100 L50 160 Q50 200 128 200 Q206 200 206 160 L206 100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
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
                {Array.from({ length: 7 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={70 + i * 20}
                    cy={130 + (progress / 100) * 40}
                    r={2 + (i % 3) * 1.5}
                    fill="rgba(255,255,255,0.5)"
                    className="bubble"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </g>
            )}
            {burstEffect && (
              <>
                <circle cx="128" cy="128" r="10" fill="none" stroke="#FFD700" strokeWidth="4" className="burst-ring" />
                <circle cx="128" cy="128" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" className="burst-ring burst-ring-2" />
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
                height: p.size,
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
