import { useState, useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const MINIMAP_RADIUS = 80;

function GameUI() {
  const { gameState } = useGameState();
  const [hovered, setHovered] = useState<string | null>(null);
  const healthRef = useRef<number>(100);

  useEffect(() => {
    if (gameState) {
      healthRef.current = gameState.player.health;
    }
  }, [gameState?.player.health]);

  if (!gameState) return null;

  const { player, enemies, map, time, score, lightIntensityAtPlayer } = gameState;

  const healthPercent = player.health / player.maxHealth;
  const healthColor = `rgb(${Math.floor(239 - healthPercent * 205)}, ${Math.floor(68 + healthPercent * 129)}, ${Math.floor(68 + healthPercent * 26)})`;

  const potionCooldownPercent = Math.max(0, player.potionCooldown / player.potionMaxCooldown);
  const potionReady = player.potionCooldown <= 0 && player.hasPotion;

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMinimapPos = (x: number, y: number) => {
    const scaleX = (MINIMAP_RADIUS * 2) / CANVAS_WIDTH;
    const scaleY = (MINIMAP_RADIUS * 2) / CANVAS_HEIGHT;
    return {
      x: x * scaleX,
      y: y * scaleY,
    };
  };

  const isInViewDistance = (ex: number, ey: number) => {
    const dist = Math.hypot(ex - player.x, ey - player.y);
    return dist < 200;
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      right: '16px',
      bottom: '16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        padding: '12px 16px',
        pointerEvents: 'auto',
        transition: 'transform 0.2s ease-out',
        transform: hovered === 'status' ? 'scale(1.05)' : 'scale(1)',
      }}
        onMouseEnter={() => setHovered('status')}
        onMouseLeave={() => setHovered(null)}
      >
        <div style={{
          fontFamily: "'MedievalSharp', cursive",
          color: '#c9a959',
          fontSize: '14px',
          marginBottom: '8px',
          letterSpacing: '1px',
        }}>
          生命值
        </div>
        
        <div style={{
          width: '160px',
          height: '12px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid rgba(201, 169, 89, 0.3)',
        }}>
          <div
            style={{
              height: '100%',
              width: `${healthPercent * 100}%`,
              background: `linear-gradient(to right, #ef4444, ${healthColor}, #22c55e)`,
              transition: 'width 0.2s ease-out',
              borderRadius: '6px',
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '12px',
        }}>
          <div style={{
            position: 'relative',
            width: '32px',
            height: '32px',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="rgba(255, 255, 255, 0.1)"
                stroke="#c9a959"
                strokeWidth="1"
              />
              
              {potionCooldownPercent > 0 && (
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="rgba(100, 100, 100, 0.8)"
                  strokeWidth="4"
                  strokeDasharray={`${potionCooldownPercent * 88} 88`}
                  transform="rotate(-90 16 16)"
                />
              )}
              
              <circle
                cx="16"
                cy="16"
                r="10"
                fill={potionReady ? 'rgba(100, 200, 255, 0.8)' : 'rgba(100, 100, 100, 0.5)'}
              />
              
              {player.hasPotion && (
                <text
                  x="16"
                  y="20"
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  E
                </text>
              )}
            </svg>
          </div>
          
          <div>
            <div style={{
              fontFamily: "'MedievalSharp', cursive",
              color: '#c9a959',
              fontSize: '12px',
            }}>
              {player.hasPotion ? (potionCooldownPercent > 0 ? `冷却: ${player.potionCooldown.toFixed(1)}s` : '按 E 使用') : '寻找药水'}
            </div>
            <div style={{
              fontFamily: "'MedievalSharp', cursive",
              color: '#00ff88',
              fontSize: '12px',
              marginTop: '2px',
            }}>
              {player.isSneaking ? '🦶 潜行中' : '🚶 站立'}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        pointerEvents: 'auto',
        transition: 'transform 0.2s ease-out',
        transform: hovered === 'minimap' ? 'scale(1.05)' : 'scale(1)',
      }}
        onMouseEnter={() => setHovered('minimap')}
        onMouseLeave={() => setHovered(null)}
      >
        <svg width={MINIMAP_RADIUS * 2} height={MINIMAP_RADIUS * 2}>
          <defs>
            <radialGradient id="minimapBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(15, 15, 26, 0.9)" />
              <stop offset="70%" stopColor="rgba(15, 15, 26, 0.7)" />
              <stop offset="100%" stopColor="rgba(15, 15, 26, 0)" />
            </radialGradient>
          </defs>
          
          <circle
            cx={MINIMAP_RADIUS}
            cy={MINIMAP_RADIUS}
            r={MINIMAP_RADIUS}
            fill="url(#minimapBg)"
            stroke="#c9a959"
            strokeWidth="2"
            strokeOpacity="0.5"
          />

          {map.mushrooms.map((m, i) => {
            const pos = getMinimapPos(m.x, m.y);
            if (pos.x < 0 || pos.x > MINIMAP_RADIUS * 2 || pos.y < 0 || pos.y > MINIMAP_RADIUS * 2) return null;
            const dist = Math.hypot(pos.x - MINIMAP_RADIUS, pos.y - MINIMAP_RADIUS);
            if (dist > MINIMAP_RADIUS - 2) return null;
            return (
              <circle
                key={`m-${i}`}
                cx={pos.x}
                cy={pos.y}
                r="2"
                fill="#00ff88"
                opacity="0.8"
              />
            );
          })}

          {enemies.map((e) => {
            if (!isInViewDistance(e.x, e.y)) return null;
            const pos = getMinimapPos(e.x, e.y);
            if (pos.x < 0 || pos.x > MINIMAP_RADIUS * 2 || pos.y < 0 || pos.y > MINIMAP_RADIUS * 2) return null;
            const dist = Math.hypot(pos.x - MINIMAP_RADIUS, pos.y - MINIMAP_RADIUS);
            if (dist > MINIMAP_RADIUS - 2) return null;
            return (
              <circle
                key={`e-${e.id}`}
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill={e.state === 'chase' ? '#ff0000' : '#ff6b35'}
              />
            );
          })}

          {(() => {
            const pos = getMinimapPos(player.x, player.y);
            return (
              <circle
                cx={pos.x}
                cy={pos.y}
                r="4"
                fill="#ffe066"
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })()}
        </svg>
      </div>

      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        gap: '16px',
        fontFamily: "'MedievalSharp', cursive",
        color: '#c9a959',
        fontSize: '16px',
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(201, 169, 89, 0.3)',
          pointerEvents: 'auto',
          transition: 'transform 0.2s ease-out',
          transform: hovered === 'time' ? 'scale(1.05)' : 'scale(1)',
        }}
          onMouseEnter={() => setHovered('time')}
          onMouseLeave={() => setHovered(null)}
        >
          ⏱️ {formatTime(time)}
        </div>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(201, 169, 89, 0.3)',
          pointerEvents: 'auto',
          transition: 'transform 0.2s ease-out',
          transform: hovered === 'score' ? 'scale(1.05)' : 'scale(1)',
        }}
          onMouseEnter={() => setHovered('score')}
          onMouseLeave={() => setHovered(null)}
        >
          🏆 {score}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: "'MedievalSharp', cursive",
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(201, 169, 89, 0.3)',
          color: '#c9a959',
          fontSize: '14px',
          pointerEvents: 'auto',
          transition: 'transform 0.2s ease-out',
          transform: hovered === 'light' ? 'scale(1.05)' : 'scale(1)',
        }}
          onMouseEnter={() => setHovered('light')}
          onMouseLeave={() => setHovered(null)}
        >
          💡 光照强度: {(lightIntensityAtPlayer * 100).toFixed(0)}%
        </div>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(201, 169, 89, 0.3)',
          color: player.visibility < 0.5 ? '#00ff88' : '#ef4444',
          fontSize: '14px',
          pointerEvents: 'auto',
          transition: 'transform 0.2s ease-out',
          transform: hovered === 'visibility' ? 'scale(1.05)' : 'scale(1)',
        }}
          onMouseEnter={() => setHovered('visibility')}
          onMouseLeave={() => setHovered(null)}
        >
          👁️ 可见度: {(player.visibility * 100).toFixed(0)}%
        </div>
      </div>

      {player.potionActive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: "'MedievalSharp', cursive",
          color: '#88ccff',
          fontSize: '24px',
          textShadow: '0 0 20px rgba(100, 200, 255, 0.8)',
          animation: 'pulse 1s infinite',
          pointerEvents: 'none',
        }}>
          ✨ 隐身中... {player.potionTimer.toFixed(1)}s ✨
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default GameUI;
