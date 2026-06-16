import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Material,
  PotionState,
  getMaterialUsageCount
} from '../logic/potionEngine';

interface WorkbenchProps {
  materials: Material[];
  potionState: PotionState;
  currentHeat: number;
  onHeatChange: (heat: number) => void;
  onAddMaterial: (materialId: string) => void;
  showStepGlow: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  delay: number;
}

interface ThrowingMaterial {
  id: string;
  materialId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  duration: number;
  color: { r: number; g: number; b: number };
}

const Workbench: React.FC<WorkbenchProps> = ({
  materials,
  potionState,
  currentHeat,
  onHeatChange,
  onAddMaterial,
  showStepGlow
}) => {
  const [throwingMaterials, setThrowingMaterials] = useState<ThrowingMaterial[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [displayColor, setDisplayColor] = useState(potionState.currentColor);

  const flaskRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particleStartTimeRef = useRef<number | null>(null);
  const throwAnimFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startColor = displayColor;
    const endColor = potionState.currentColor;
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayColor({
        r: Math.round(startColor.r + (endColor.r - startColor.r) * easeProgress),
        g: Math.round(startColor.g + (endColor.g - startColor.g) * easeProgress),
        b: Math.round(startColor.b + (endColor.b - startColor.b) * easeProgress)
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [potionState.currentColor]);

  useEffect(() => {
    if (potionState.isFailed) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [potionState.isFailed]);

  useEffect(() => {
    if (potionState.isComplete && !potionState.isFailed && particles.length === 0) {
      spawnParticles();
    }
  }, [potionState.isComplete, potionState.isFailed]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (throwAnimFrameRef.current) {
        cancelAnimationFrame(throwAnimFrameRef.current);
      }
    };
  }, []);

  const spawnParticles = useCallback(() => {
    const flaskRect = flaskRef.current?.getBoundingClientRect();
    const containerRect = particleContainerRef.current?.getBoundingClientRect();

    if (!flaskRect || !containerRect) return;

    const centerX = flaskRect.left + flaskRect.width / 2 - containerRect.left;
    const startY = flaskRect.top - containerRect.top + flaskRect.height * 0.3;

    const newParticles: Particle[] = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 30 + Math.random() * 50;

      newParticles.push({
        id: i,
        x: centerX + (Math.random() - 0.5) * 20,
        y: startY,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed - 20,
        size: 2 + Math.random() * 2,
        opacity: 1,
        delay: i * (2000 / count)
      });
    }

    setParticles(newParticles);
    particleStartTimeRef.current = performance.now();
    animateParticles(newParticles);
  }, []);

  const animateParticles = useCallback((initialParticles: Particle[]) => {
    const duration = 2000;
    let currentParticles = [...initialParticles];

    const animate = (currentTime: number) => {
      if (!particleStartTimeRef.current) return;

      const elapsed = currentTime - particleStartTimeRef.current;

      currentParticles = initialParticles.map(p => {
        const particleElapsed = Math.max(0, elapsed - p.delay);
        const progress = Math.min(particleElapsed / (duration - p.delay), 1);

        if (progress <= 0) {
          return { ...p, opacity: 0 };
        }

        const easeProgress = progress;
        const newY = p.y + p.vy * easeProgress;
        const newX = p.x + p.vx * easeProgress;
        const newOpacity = 1 - easeProgress;
        const newSize = p.size * (1 + easeProgress * 0.5);

        return {
          ...p,
          x: newX,
          y: newY,
          opacity: Math.max(0, newOpacity),
          size: newSize
        };
      });

      setParticles(currentParticles);

      if (elapsed < duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => setParticles([]), 100);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const handleMaterialClick = (material: Material, event: React.MouseEvent) => {
    if (potionState.isFailed || potionState.isComplete) return;

    const usageCount = getMaterialUsageCount(potionState, material.id);
    if (usageCount >= material.maxUses) return;

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const containerRect = particleContainerRef.current?.getBoundingClientRect();

    if (!containerRect || !flaskRef.current) return;

    const flaskRect = flaskRef.current.getBoundingClientRect();

    const startX = buttonRect.left + buttonRect.width / 2 - containerRect.left;
    const startY = buttonRect.top + buttonRect.height / 2 - containerRect.top;
    const endX = flaskRect.left + flaskRect.width / 2 - containerRect.left;
    const endY = flaskRect.top + flaskRect.height * 0.4 - containerRect.top;

    const throwId = `throw-${Date.now()}-${Math.random()}`;
    const newThrow: ThrowingMaterial = {
      id: throwId,
      materialId: material.id,
      startX,
      startY,
      endX,
      endY,
      startTime: performance.now(),
      duration: 300,
      color: material.color
    };

    setThrowingMaterials(prev => [...prev, newThrow]);
    animateThrow(newThrow, () => {
      onAddMaterial(material.id);
      setThrowingMaterials(prev => prev.filter(t => t.id !== throwId));
    });
  };

  const animateThrow = (throwItem: ThrowingMaterial, onComplete: () => void) => {
    const animate = (currentTime: number) => {
      const elapsed = currentTime - throwItem.startTime;
      const progress = Math.min(elapsed / throwItem.duration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentX = throwItem.startX + (throwItem.endX - throwItem.startX) * easeProgress;
      const currentY = throwItem.startY + (throwItem.endY - throwItem.startY) * easeProgress
        - Math.sin(progress * Math.PI) * 50;

      const rotation = progress * 720;

      const throwElement = document.querySelector(`[data-throw-id="${throwItem.id}"]`) as HTMLElement;
      if (throwElement) {
        throwElement.style.left = `${currentX}px`;
        throwElement.style.top = `${currentY}px`;
        throwElement.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        throwElement.style.opacity = String(1 - progress * 0.3);
      }

      if (progress < 1) {
        throwAnimFrameRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    throwAnimFrameRef.current = requestAnimationFrame(animate);
  };

  const heatPercentage = (currentHeat / 10) * 100;

  return (
    <div
      ref={particleContainerRef}
      className="workbench"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(145deg, #2C3E50 0%, #1B1B2F 100%)',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #8E44AD',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}
    >
      <div className="material-shelf" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {materials.map(material => {
          const usageCount = getMaterialUsageCount(potionState, material.id);
          const isDisabled = usageCount >= material.maxUses || potionState.isFailed || potionState.isComplete;

          return (
            <button
              key={material.id}
              onClick={(e) => handleMaterialClick(material, e)}
              disabled={isDisabled}
              className="hover-lift"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 8px',
                background: isDisabled
                  ? 'rgba(44, 62, 80, 0.5)'
                  : 'linear-gradient(145deg, #34495E, #2C3E50)',
                border: `2px solid ${isDisabled ? '#555' : '#8E44AD'}`,
                borderRadius: '8px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'all 0.2s ease-out'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: `rgb(${material.color.r}, ${material.color.g}, ${material.color.b})`,
                boxShadow: `0 0 12px rgba(${material.color.r}, ${material.color.g}, ${material.color.b}, 0.6)`,
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}></div>
              <span style={{
                fontSize: '12px',
                color: '#F5F5DC',
                fontWeight: 600,
                textAlign: 'center',
                fontFamily: "'Noto Serif SC', serif"
              }}>
                {material.name}
              </span>
              <span style={{
                fontSize: '11px',
                color: usageCount >= material.maxUses ? '#E74C3C' : '#95A5A6'
              }}>
                {material.maxUses - usageCount}/{material.maxUses}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flask-area" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '280px',
        position: 'relative',
        marginBottom: '24px'
      }}>
        {showStepGlow && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(46, 204, 113, 0.8) 0%, transparent 70%)',
            animation: 'glow 0.5s ease-out',
            pointerEvents: 'none',
            zIndex: 1
          }}></div>
        )}

        <div
          ref={flaskRef}
          className="flask"
          style={{
            position: 'relative',
            width: '120px',
            height: '180px',
            animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
            zIndex: 2
          }}
        >
          <svg
            viewBox="0 0 120 180"
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))'
            }}
          >
            <defs>
              <clipPath id="flaskClip">
                <path d="M45 20 L45 60 L25 140 Q25 160 60 160 Q95 160 95 140 L75 60 L75 20 Z" />
              </clipPath>
            </defs>

            <path
              d="M45 20 L45 60 L25 140 Q25 160 60 160 Q95 160 95 140 L75 60 L75 20 Z"
              fill="rgba(200, 220, 255, 0.1)"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2"
            />

            <g clipPath="url(#flaskClip)">
              <rect
                x="20"
                y="70"
                width="80"
                height="90"
                fill={`rgba(${displayColor.r}, ${displayColor.g}, ${displayColor.b}, 0.7)`}
                style={{
                  transition: 'fill 0.3s ease'
                }}
              />
              <ellipse
                cx="60"
                cy="70"
                rx="22"
                ry="5"
                fill={`rgba(${displayColor.r}, ${displayColor.g}, ${displayColor.b}, 0.5)`}
                style={{
                  transition: 'fill 0.3s ease'
                }}
              />
            </g>

            <path
              d="M50 25 L50 55 L32 130"
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30px',
            height: '15px',
            background: 'linear-gradient(180deg, #8B4513, #654321)',
            borderRadius: '4px 4px 2px 2px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}></div>

          {potionState.isComplete && !potionState.isFailed && (
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              boxShadow: '0 0 30px 10px rgba(255, 215, 0, 0.5), 0 0 60px 20px rgba(255, 215, 0, 0.3)',
              animation: 'glow 2s infinite',
              pointerEvents: 'none'
            }}></div>
          )}
        </div>
      </div>

      {particles.map(particle => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size * 2}px`,
            height: `${particle.size * 2}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FFD700 0%, #FFA500 100%)',
            boxShadow: `0 0 ${particle.size * 2}px #FFD700`,
            opacity: particle.opacity,
            pointerEvents: 'none',
            zIndex: 10,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      {throwingMaterials.map(tm => (
        <div
          key={tm.id}
          data-throw-id={tm.id}
          style={{
            position: 'absolute',
            left: `${tm.startX}px`,
            top: `${tm.startY}px`,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: `rgb(${tm.color.r}, ${tm.color.g}, ${tm.color.b})`,
            boxShadow: `0 0 10px rgba(${tm.color.r}, ${tm.color.g}, ${tm.color.b}, 0.8)`,
            pointerEvents: 'none',
            zIndex: 100,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      <div className="heat-control" style={{
        padding: '16px',
        background: 'rgba(44, 62, 80, 0.5)',
        borderRadius: '8px',
        border: '2px solid rgba(142, 68, 173, 0.4)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{
            fontSize: '14px',
            color: '#F5F5DC',
            fontWeight: 600,
            fontFamily: "'Noto Serif SC', serif"
          }}>
            🔥 火候控制
          </span>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#FFD700',
            fontFamily: "'Cinzel', serif"
          }}>
            {currentHeat} / 10
          </span>
        </div>

        <div style={{
          position: 'relative',
          height: '20px',
          padding: '0 5px'
        }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              right: '0',
              height: '12px',
              transform: 'translateY(-50%)',
              borderRadius: '6px',
              background: 'linear-gradient(to right, #8B0000 0%, #FF4500 30%, #FF8C00 60%, #FFD700 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: `${100 - heatPercentage}%`,
              height: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              transition: 'width 0.15s ease-out'
            }}></div>
          </div>

          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={currentHeat}
            onChange={(e) => onHeatChange(Number(e.target.value))}
            disabled={potionState.isFailed || potionState.isComplete}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: potionState.isFailed || potionState.isComplete ? 'not-allowed' : 'pointer',
              zIndex: 10
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `calc(${heatPercentage}% - 12px)`,
              width: '24px',
              height: '24px',
              transform: 'translateY(-50%)',
              borderRadius: '50%',
              background: `linear-gradient(135deg, hsl(${35 + (currentHeat / 10) * 25}, 100%, 60%), hsl(${15 + (currentHeat / 10) * 15}, 100%, 50%))`,
              boxShadow: `0 0 12px hsl(${25 + (currentHeat / 10) * 20}, 100%, 50%), 0 2px 6px rgba(0, 0, 0, 0.4)`,
              border: '2px solid #FFF',
              pointerEvents: 'none',
              transition: 'left 0.15s ease-out, background 0.2s ease',
              zIndex: 5
            }}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '5px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.6)'
            }}></div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '11px',
          color: '#95A5A6'
        }}>
          <span>❄️ 低温</span>
          <span>🌡️ 中温</span>
          <span>🔥 高温</span>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
