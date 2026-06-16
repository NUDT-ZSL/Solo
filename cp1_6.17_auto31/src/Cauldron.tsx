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

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
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

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const resultTriggeredRef = useRef(false);
  const liquidColor = mixIngredientColors(ingredientIds);

  const createParticle = useCallback((cauldronRect: DOMRect): Particle => {
    const centerX = cauldronRect.width / 2;
    const centerY = cauldronRect.height / 2 + 20;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;

    return {
      id: particleIdRef.current++,
      x: centerX + (Math.random() - 0.5) * 80,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: -speed - Math.random() * 2,
      size: 3 + Math.random() * 5,
      opacity: 0.8,
      color: liquidColor,
    };
  }, [liquidColor]);

  const createBurstParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const centerX = 128;
    const centerY = 128;

    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        opacity: 1,
        color: '#FFD700',
      });
    }
    return newParticles;
  }, []);

  const startBrewing = useCallback(() => {
    const result = brewPotion(ingredientIds);
    if (!result) {
      onInvalidRecipe();
      return;
    }

    onBrewStart();
    setProgress(0);
    setShowResult(false);
    setBrewResult(null);
    setEventType(null);
    setBurstEffect(false);
    resultTriggeredRef.current = false;
    startTimeRef.current = performance.now();

    let lastParticleTime = 0;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const duration = 3000;
      const stopProgress = result.stopProgress;
      const stopTime = (stopProgress / 100) * duration;

      const currentProgress = Math.min((elapsed / duration) * 100, stopProgress);
      setProgress(currentProgress);

      if (timestamp - lastParticleTime > 100 && currentProgress > 5) {
        lastParticleTime = timestamp;
        setParticles((prev) => {
          const newParticle = createParticle({ width: 256, height: 256 } as DOMRect);
          const updated = prev
            .map((p) => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy - 0.1,
              opacity: p.opacity - 0.02,
              size: p.size * 0.98,
            }))
            .filter((p) => p.opacity > 0 && p.y > -20);
          return [...updated.slice(-20), newParticle];
        });
      } else {
        setParticles((prev) =>
          prev
            .map((p) => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy - 0.05,
              opacity: p.opacity - 0.015,
            }))
            .filter((p) => p.opacity > 0)
        );
      }

      if (elapsed >= stopTime && !resultTriggeredRef.current) {
        resultTriggeredRef.current = true;
        setEventType(result.eventType);
        setBrewResult(result);
        setShowResult(true);

        if (result.eventType === 'perfect') {
          setBurstEffect(true);
          setParticles(createBurstParticles());
        }

        setTimeout(() => {
          onBrewComplete(result);
        }, 1500);
      }

      if (elapsed < stopTime + 1500) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [ingredientIds, onBrewStart, onBrewComplete, onInvalidRecipe, createParticle, createBurstParticles]);

  useEffect(() => {
    if (isBrewing && !animationRef.current) {
      startBrewing();
    }
  }, [isBrewing, startBrewing]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const progressColor = `hsl(${220 + (progress / 100) * 80}, 70%, 60%)`;

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

  return (
    <div className="cauldron-container">
      <h2 className="cauldron-title">⚗️ 炼药台</h2>

      <div className="cauldron-wrapper">
        <div className="cauldron-svg-container">
          <svg width="256" height="256" viewBox="0 0 256 256" className="cauldron-svg">
            <ellipse cx="128" cy="200" rx="80" ry="12" fill="rgba(0,0,0,0.3)" />

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
            </g>

            <ellipse cx="128" cy="100" rx="78" ry="18" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.5" />

            <path
              d="M50 100 L50 160 Q50 200 128 200 Q206 200 206 160 L206 100"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
            />

            {isBrewing && (
              <g className="bubble-group">
                {[...Array(5)].map((_, i) => (
                  <circle
                    key={i}
                    cx={80 + i * 25}
                    cy={130 + (progress / 100) * 30}
                    r={3 + Math.random() * 4}
                    fill="rgba(255,255,255,0.4)"
                    className="bubble"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </g>
            )}

            {burstEffect && (
              <circle
                cx="128"
                cy="128"
                r="10"
                fill="none"
                stroke="#FFD700"
                strokeWidth="4"
                className="burst-ring"
              />
            )}
          </svg>

          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.opacity,
              }}
            />
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
                boxShadow: `0 0 10px ${progressColor}`,
              }}
            />
          </div>
          <div className="progress-text">{Math.floor(progress)}%</div>
        </div>

        <div className="status-text">
          {!isBrewing && !showResult && '选择药材后点击开始炼药'}
          {isBrewing && !showResult && '🔥 正在炼制中...'}
          {showResult && '完成！'}
        </div>
      </div>
    </div>
  );
}
