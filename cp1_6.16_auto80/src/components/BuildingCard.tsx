import { useState, useRef, useCallback } from 'react';
import { Building } from '../data/buildings';

type TimeSlot = 'morning' | 'noon' | 'dusk' | 'night';

interface BuildingCardProps {
  building: Building;
  unlockedSlots: TimeSlot[];
  onClick: () => void;
}

interface LightConfig {
  gradientAngle: number;
  lightColor: string;
  shadowColor: string;
  ambientColor: string;
  lightDirectionX: number;
  lightDirectionY: number;
}

const TIME_SLOT_COLORS: Record<TimeSlot, string> = {
  morning: '#FFD700',
  noon: '#FFFFFF',
  dusk: '#FF6347',
  night: '#4169E1'
};

const TIME_SLOT_NAMES: Record<TimeSlot, string> = {
  morning: '清晨',
  noon: '正午',
  dusk: '黄昏',
  night: '夜晚'
};

const TIME_SLOTS: TimeSlot[] = ['morning', 'noon', 'dusk', 'night'];

const LIGHT_CONFIGS: Record<TimeSlot, LightConfig> = {
  morning: {
    gradientAngle: 135,
    lightColor: '#FFD700',
    shadowColor: 'rgba(255, 215, 0, 0.6)',
    ambientColor: 'rgba(255, 200, 100, 0.15)',
    lightDirectionX: 1,
    lightDirectionY: -0.5
  },
  noon: {
    gradientAngle: 180,
    lightColor: '#FFFFFF',
    shadowColor: 'rgba(255, 255, 255, 0.5)',
    ambientColor: 'rgba(255, 255, 255, 0.1)',
    lightDirectionX: 0,
    lightDirectionY: -1
  },
  dusk: {
    gradientAngle: 45,
    lightColor: '#FF6347',
    shadowColor: 'rgba(255, 99, 71, 0.6)',
    ambientColor: 'rgba(255, 100, 50, 0.15)',
    lightDirectionX: -1,
    lightDirectionY: -0.5
  },
  night: {
    gradientAngle: 180,
    lightColor: '#4169E1',
    shadowColor: 'rgba(65, 105, 225, 0.5)',
    ambientColor: 'rgba(50, 80, 150, 0.2)',
    lightDirectionX: 0,
    lightDirectionY: -0.8
  }
};

function BuildingCard({ building, unlockedSlots, onClick }: BuildingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);

  const isFullyUnlocked = unlockedSlots.length === 4;
  const latestUnlockedSlot = unlockedSlots[unlockedSlots.length - 1];
  const currentLightConfig = latestUnlockedSlot 
    ? LIGHT_CONFIGS[latestUnlockedSlot] 
    : LIGHT_CONFIGS.night;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMouseX(x);
    setMouseY(y);
    
    const maxRotation = 15;
    const extraRotation = isHovered ? 5 : 0;
    const totalMaxRotation = maxRotation + extraRotation;
    
    const newRotateY = (x - 0.5) * 2 * totalMaxRotation;
    const newRotateX = (0.5 - y) * 2 * totalMaxRotation;
    
    setRotateX(newRotateX);
    setRotateY(newRotateY);
  }, [isHovered]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setMouseX(0.5);
    setMouseY(0.5);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const lightOffsetX = currentLightConfig.lightDirectionX * 30 + (mouseX - 0.5) * 20;
  const lightOffsetY = currentLightConfig.lightDirectionY * 30 + (mouseY - 0.5) * 20;

  const mainGradient = `linear-gradient(${currentLightConfig.gradientAngle}deg, 
    ${currentLightConfig.lightColor}33 0%, 
    transparent 50%, 
    ${currentLightConfig.shadowColor}40 100%)`;

  const radialGradient = `radial-gradient(circle at ${50 + lightOffsetX * 0.5}% ${50 + lightOffsetY * 0.3}%, 
    ${currentLightConfig.lightColor}44 0%, 
    transparent 60%)`;

  const ambientGradient = `radial-gradient(ellipse at center, 
    ${currentLightConfig.ambientColor} 0%, 
    transparent 70%)`;

  const multiLayerShadows = [
    `inset ${lightOffsetX}px ${lightOffsetY}px 40px ${currentLightConfig.lightColor}22`,
    `inset ${-lightOffsetX * 0.5}px ${-lightOffsetY * 0.5}px 60px ${currentLightConfig.shadowColor}33`,
    `${lightOffsetX * 0.3}px ${lightOffsetY * 0.3 + 8}px 20px rgba(0,0,0,0.4)`,
    `0 0 60px ${currentLightConfig.lightColor}15`
  ].join(', ');

  const silhouetteShadows = [
    `${lightOffsetX * 0.8}px ${lightOffsetY * 0.8 + 4}px 8px ${currentLightConfig.shadowColor}`,
    `${lightOffsetX * 0.4}px ${lightOffsetY * 0.4 + 2}px 4px ${currentLightConfig.shadowColor}88`,
    `0 0 20px ${currentLightConfig.lightColor}40`
  ].join(', ');

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{
        width: '320px',
        borderRadius: '20px',
        backgroundColor: '#1A1A2E',
        border: '1px solid #4A4A6A',
        padding: '24px',
        cursor: 'pointer',
        position: 'relative',
        transform: isHovered 
          ? `perspective(1000px) translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` 
          : 'perspective(1000px) translateY(0) rotateX(0) rotateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease-out, border-color 0.4s ease-out',
        transformStyle: 'preserve-3d',
        boxShadow: isHovered 
          ? `0 12px 8px rgba(0, 0, 0, 0.5), 0 0 40px ${currentLightConfig.lightColor}22` 
          : '0 4px 4px rgba(0, 0, 0, 0.3)',
        animation: isFullyUnlocked ? 'goldenGlow 1.5s ease-in-out infinite' : 'none',
        overflow: 'visible'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-4px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px',
        zIndex: 10
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            title={TIME_SLOT_NAMES[slot]}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              transform: isHovered && unlockedSlots.includes(slot) ? 'scale(1.2)' : 'scale(1)',
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none',
              boxShadow: unlockedSlots.includes(slot) && isHovered
                ? `0 0 8px ${TIME_SLOT_COLORS[slot]}` 
                : 'none'
            }}
          />
        ))}
      </div>

      <div style={{
        width: '100%',
        height: '240px',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '20px',
        background: `#0D0D1A`,
        backgroundImage: `${radialGradient}, ${mainGradient}, ${ambientGradient}`,
        boxShadow: multiLayerShadows,
        transition: 'all 0.4s ease-out',
        transformStyle: 'preserve-3d'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(${90 + rotateY * 2}deg, transparent 40%, ${currentLightConfig.lightColor}11 50%, transparent 60%)`,
          transition: 'background 0.1s ease-out',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(${180 + rotateX * 2}deg, transparent 40%, ${currentLightConfig.lightColor}08 50%, transparent 60%)`,
          transition: 'background 0.1s ease-out',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          transform: `translateZ(20px)`
        }}>
          <div style={{
            position: 'relative',
            transform: `perspective(800px) rotateX(${rotateX * 0.5}deg) rotateY(${rotateY * 0.5}deg)`,
            transition: 'transform 0.1s ease-out',
            transformStyle: 'preserve-3d'
          }}>
            <div style={{
              position: 'absolute',
              left: `${lightOffsetX * 0.3}px`,
              top: `${lightOffsetY * 0.3 + 10}px`,
              filter: 'blur(8px)',
              opacity: 0.6,
              transform: 'translateZ(-10px) scale(1.05)',
              transition: 'all 0.3s ease-out'
            }}>
              <svg width="280" height="220" viewBox="0 0 320 260" style={{ overflow: 'visible' }}>
                <path
                  d={building.shadePath}
                  fill={currentLightConfig.shadowColor}
                  opacity="0.5"
                />
              </svg>
            </div>

            <div style={{
              position: 'absolute',
              left: `${lightOffsetX * 0.15}px`,
              top: `${lightOffsetY * 0.15 + 5}px`,
              filter: 'blur(4px)',
              opacity: 0.4,
              transform: 'translateZ(-5px) scale(1.02)',
              transition: 'all 0.3s ease-out'
            }}>
              <svg width="280" height="220" viewBox="0 0 320 260" style={{ overflow: 'visible' }}>
                <path
                  d={building.shadePath}
                  fill={currentLightConfig.shadowColor}
                  opacity="0.4"
                />
              </svg>
            </div>

            <div style={{
              position: 'relative',
              transform: 'translateZ(0)',
              transition: 'all 0.3s ease-out'
            }}>
              <svg width="280" height="220" viewBox="0 0 320 260" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id={`silhouette-grad-${building.id}`} 
                    x1={`${50 - lightOffsetX * 0.5}%`} 
                    y1={`${50 - lightOffsetY * 0.5}%`}
                    x2={`${50 + lightOffsetX * 0.5}%`} 
                    y2={`${50 + lightOffsetY * 0.5}%`}>
                    <stop offset="0%" stopColor="#3A3A5A" />
                    <stop offset="50%" stopColor="#2A2A4A" />
                    <stop offset="100%" stopColor="#1A1A3A" />
                  </linearGradient>
                  
                  <linearGradient id={`highlight-grad-${building.id}`}
                    x1={`${50 + lightOffsetX}%`}
                    y1={`${50 + lightOffsetY}%`}
                    x2={`${50 - lightOffsetX * 0.5}%`}
                    y2={`${50 - lightOffsetY * 0.5}%`}>
                    <stop offset="0%" stopColor={currentLightConfig.lightColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </linearGradient>

                  <filter id={`glow-${building.id}`}>
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                <path
                  d={building.shadePath}
                  fill={`url(#silhouette-grad-${building.id})`}
                  stroke="#5A5A8A"
                  strokeWidth="0.5"
                  style={{
                    transition: 'all 0.4s ease-out',
                    filter: `url(#glow-${building.id})`
                  }}
                />

                <path
                  d={building.shadePath}
                  fill={`url(#highlight-grad-${building.id})`}
                  style={{
                    transition: 'all 0.4s ease-out'
                  }}
                />

                <path
                  d={building.shadePath}
                  fill="none"
                  stroke={currentLightConfig.lightColor}
                  strokeWidth="1"
                  opacity={isFullyUnlocked ? 0.6 : 0.2}
                  style={{
                    transform: `translate(${lightOffsetX * 0.1}px, ${lightOffsetY * 0.1}px)`,
                    transition: 'all 0.4s ease-out'
                  }}
                />
              </svg>
            </div>

            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '280px',
              height: '220px',
              background: `linear-gradient(${currentLightConfig.gradientAngle - 90}deg, transparent 60%, ${currentLightConfig.lightColor}15 80%, ${currentLightConfig.lightColor}33 100%)`,
              clipPath: `url(#clip-${building.id})`,
              transform: 'translateZ(5px)',
              transition: 'all 0.3s ease-out',
              pointerEvents: 'none'
            }}>
              <svg width="0" height="0">
                <defs>
                  <clipPath id={`clip-${building.id}`} clipPathUnits="objectBoundingBox">
                    <path d={building.shadePath} transform="scale(0.003125, 0.003846)" />
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          top: `${20 + lightOffsetY * 0.3}px`,
          left: `${140 + lightOffsetX * 0.3}px`,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: currentLightConfig.lightColor,
          boxShadow: `0 0 20px ${currentLightConfig.lightColor}, 0 0 40px ${currentLightConfig.lightColor}66`,
          opacity: latestUnlockedSlot ? 0.8 : 0.3,
          transition: 'all 0.4s ease-out'
        }} />

        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '100px',
          backdropFilter: 'blur(4px)'
        }}>
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot}
              title={TIME_SLOT_NAMES[slot]}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#444',
                transition: 'all 0.4s ease-out',
                opacity: unlockedSlots.includes(slot) ? 1 : 0.3,
                boxShadow: unlockedSlots.includes(slot) 
                  ? `0 0 6px ${TIME_SLOT_COLORS[slot]}, 0 0 12px ${TIME_SLOT_COLORS[slot]}66` 
                  : 'none'
              }}
            />
          ))}
        </div>
      </div>

      <div style={{
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#FFFFFF',
          marginBottom: '8px',
          transition: 'color 0.4s ease-out',
          letterSpacing: '0.5px',
          textShadow: latestUnlockedSlot ? `0 0 10px ${currentLightConfig.lightColor}44` : 'none'
        }}>
          {building.name}
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#8888AA',
          transition: 'color 0.4s ease-out'
        }}>
          {building.city}
          {latestUnlockedSlot && (
            <span style={{
              marginLeft: '8px',
              color: currentLightConfig.lightColor,
              fontSize: '12px'
            }}>
              · {TIME_SLOT_NAMES[latestUnlockedSlot]}光影
            </span>
          )}
        </p>
      </div>

      <div style={{
        position: 'absolute',
        right: '-4px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            title={TIME_SLOT_NAMES[slot]}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none',
              boxShadow: unlockedSlots.includes(slot) && isHovered
                ? `0 0 8px ${TIME_SLOT_COLORS[slot]}` 
                : 'none'
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '-4px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px'
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            title={TIME_SLOT_NAMES[slot]}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none',
              boxShadow: unlockedSlots.includes(slot) && isHovered
                ? `0 0 8px ${TIME_SLOT_COLORS[slot]}` 
                : 'none'
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={slot}
            title={TIME_SLOT_NAMES[slot]}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: unlockedSlots.includes(slot) ? TIME_SLOT_COLORS[slot] : '#333',
              transition: 'all 0.4s ease-out',
              opacity: unlockedSlots.includes(slot) ? (isHovered ? 1 : 0.7) : 0.3,
              animation: isHovered && unlockedSlots.includes(slot) 
                ? `dotPulse 0.3s ease-out ${index * 0.15}s forwards` 
                : 'none',
              boxShadow: unlockedSlots.includes(slot) && isHovered
                ? `0 0 8px ${TIME_SLOT_COLORS[slot]}` 
                : 'none'
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default BuildingCard;
