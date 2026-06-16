import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { LevelProgress } from '../types';

interface LevelSelectProps {
  progress: Record<string, LevelProgress>;
  onSelectLevel: (levelId: string) => void;
}

interface LevelCardData {
  id: string;
  name: string;
  description: string;
  totalItems: number;
  difficulty: '简单' | '普通' | '困难';
}

const LEVEL_CARDS: LevelCardData[] = [
  {
    id: '1',
    name: '暗夜街巷',
    description: '初学者潜入训练',
    totalItems: 3,
    difficulty: '简单'
  },
  {
    id: '2',
    name: '仓库禁区',
    description: '守卫密集的工业区',
    totalItems: 3,
    difficulty: '普通'
  },
  {
    id: '3',
    name: '豪宅之夜',
    description: '精英保镖与红外线',
    totalItems: 3,
    difficulty: '困难'
  }
];

const LevelSelect: React.FC<LevelSelectProps> = ({ progress, onSelectLevel }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const totalStolen = useMemo(() => {
    let total = 0;
    let possible = 0;
    for (const card of LEVEL_CARDS) {
      possible += card.totalItems;
      total += progress[card.id]?.stolenItems.length || 0;
    }
    return { total, possible, percent: possible > 0 ? Math.round((total / possible) * 100) : 0 };
  }, [progress]);

  const completedCount = useMemo(() => {
    return Object.values(progress).filter(p => p.completed).length;
  }, [progress]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a36 50%, #0f0f23 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 221, 87, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 221, 87, 0.03) 0%, transparent 50%)
          `,
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '14px',
            color: '#a0a0b0',
            textAlign: 'center',
            letterSpacing: '8px',
            marginBottom: '8px',
            opacity: 0.8
          }}
        >
          DARK ALLEY ECHO
        </div>
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#ffdd57',
            textAlign: 'center',
            letterSpacing: '6px',
            margin: 0,
            textShadow: `
              0 0 20px rgba(255, 221, 87, 0.4),
              0 0 40px rgba(255, 221, 87, 0.2)
            `
          }}
        >
          暗巷回声
        </h1>
        <div
          style={{
            marginTop: '12px',
            fontSize: '15px',
            color: '#a0a0b0',
            textAlign: 'center',
            letterSpacing: '2px'
          }}
        >
          潜行 · 解谜 · 偷窃
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '40px',
        marginBottom: '40px',
        position: 'relative',
        zIndex: 1
      }}>
        <StatBox
          label="总完成度"
          value={`${totalStolen.percent}%`}
          subValue={`${totalStolen.total}/${totalStolen.possible} 物品`}
          color="#ffdd57"
        />
        <StatBox
          label="关卡进度"
          value={`${completedCount}/${LEVEL_CARDS.length}`}
          subValue={`${completedCount} 关完成`}
          color="#22c55e"
        />
      </div>

      <div
        style={{
          fontSize: '13px',
          color: '#a0a0b0',
          marginBottom: '16px',
          letterSpacing: '2px',
          position: 'relative',
          zIndex: 1
        }}
      >
        — 选择关卡 —
      </div>

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '24px',
          padding: '20px 40px',
          overflowX: 'auto',
          maxWidth: '100%',
          scrollBehavior: 'smooth',
          position: 'relative',
          zIndex: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: '#2d2d44 transparent'
        }}
      >
        {LEVEL_CARDS.map((card, index) => {
          const prog = progress[card.id];
          const unlocked = prog?.unlocked ?? index === 0;
          const isHovered = hoveredCard === card.id;

          return (
            <LevelCard
              key={card.id}
              card={card}
              progress={prog}
              unlocked={unlocked}
              isHovered={isHovered}
              onHover={() => setHoveredCard(card.id)}
              onLeave={() => setHoveredCard(null)}
              onClick={() => unlocked && onSelectLevel(card.id)}
              index={index}
            />
          );
        })}
      </div>

      <div
        style={{
          marginTop: '40px',
          padding: '16px 28px',
          background: 'rgba(30, 30, 54, 0.6)',
          borderRadius: '12px',
          border: '1px solid #2d2d44',
          maxWidth: '700px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: '#ffdd57',
            marginBottom: '10px',
            fontWeight: 'bold',
            letterSpacing: '2px'
          }}
        >
          游戏操作指南
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px 24px',
          fontSize: '13px',
          color: '#a0a0b0'
        }}>
          <div><span style={{ color: '#ffdd57' }}>WASD</span> — 移动角色</div>
          <div><span style={{ color: '#ffdd57' }}>空格键</span> — 回声定位</div>
          <div><span style={{ color: '#ffdd57' }}>E 键</span> — 窃取物品</div>
          <div><span style={{ color: '#ffdd57' }}>阴影区</span> — 减少被发现几率</div>
        </div>
      </div>
    </div>
  );
};

function StatBox({ label, value, subValue, color }: {
  label: string;
  value: string;
  subValue: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '16px 28px',
        background: 'rgba(30, 30, 54, 0.8)',
        borderRadius: '12px',
        border: `1px solid ${color}30`,
        minWidth: '160px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#a0a0b0',
          letterSpacing: '2px',
          marginBottom: '6px'
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: color,
          textShadow: `0 0 12px ${color}40`
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#a0a0b0',
          marginTop: '4px'
        }}
      >
        {subValue}
      </div>
    </div>
  );
}

function LevelCard({ card, progress, unlocked, isHovered, onHover, onLeave, onClick, index }: {
  card: LevelCardData;
  progress?: LevelProgress;
  unlocked: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  index: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stolenCount = progress?.stolenItems.length || 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = 10;
    const cols = 24;
    const rows = 16;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const seed = (x * 7 + y * 13 + index * 17) % 23;
        const px = x * tileSize;
        const py = y * tileSize;

        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
          ctx.fillStyle = '#4a4a6a';
          ctx.fillRect(px, py, tileSize, tileSize);
        } else if (seed < 5) {
          const gradient = ctx.createLinearGradient(px, py, px, py + tileSize);
          gradient.addColorStop(0, '#4a4a6a');
          gradient.addColorStop(1, '#2a2a45');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = '#5a5a7a';
          ctx.fillRect(px, py, tileSize, 2);
        } else if (seed >= 20) {
          ctx.fillStyle = '#2d2d44';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(px, py, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#2d2d44';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.strokeStyle = '#252538';
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
        }
      }
    }

    const itemPositions = [
      { x: 5, y: 4 },
      { x: 18, y: 7 },
      { x: 10, y: 13 }
    ];
    for (let i = 0; i < card.totalItems; i++) {
      const pos = itemPositions[i] || itemPositions[0];
      const cx = pos.x * tileSize + tileSize / 2;
      const cy = pos.y * tileSize + tileSize / 2;
      ctx.fillStyle = i < stolenCount ? '#22c55e' : '#ffdd57';
      ctx.shadowColor = i < stolenCount ? '#22c55e' : '#ffdd57';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      const s = 6;
      ctx.moveTo(cx, cy - s / 2);
      ctx.lineTo(cx + s / 2, cy);
      ctx.lineTo(cx, cy + s / 2);
      ctx.lineTo(cx - s / 2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [card, stolenCount, index]);

  const difficultyColor = {
    '简单': '#22c55e',
    '普通': '#eab308',
    '困难': '#ef4444'
  }[card.difficulty];

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        width: 280,
        height: 200,
        borderRadius: '16px',
        background: '#1e1e36',
        border: `1px solid ${isHovered && unlocked ? '#ffdd57' : '#2d2d44'}`,
        boxShadow: isHovered && unlocked
          ? '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255, 221, 87, 0.15)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        transform: isHovered && unlocked ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.5,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{
        position: 'relative',
        height: 120,
        overflow: 'hidden'
      }}>
        <canvas
          ref={canvasRef}
          width={240}
          height={120}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '12px',
          padding: '4px 10px',
          background: 'rgba(15, 15, 35, 0.85)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#ffdd57',
          border: '1px solid #ffdd5740'
        }}>
          关卡 {card.id}
        </div>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '12px',
          padding: '4px 10px',
          background: `${difficultyColor}20`,
          borderRadius: '6px',
          fontSize: '11px',
          color: difficultyColor,
          border: `1px solid ${difficultyColor}40`
        }}>
          {card.difficulty}
        </div>

        {!unlocked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 15, 35, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '36px',
            color: '#a0a0b0'
          }}>
            🔒
          </div>
        )}

        {progress?.completed && (
          <div style={{
            position: 'absolute',
            top: '50%',
            right: '12px',
            transform: 'translateY(-50%)',
            fontSize: '20px'
          }}>
            ⭐
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #2d2d44'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: unlocked ? '#ffdd57' : '#a0a0b0',
          marginBottom: '4px'
        }}>
          {card.name}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#a0a0b0',
          marginBottom: '10px'
        }}>
          {card.description}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: card.totalItems }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: i < stolenCount ? '#ffdd57' : '#3f3f5c',
                  boxShadow: i < stolenCount ? '0 0 4px #ffdd5760' : 'none'
                }}
              />
            ))}
          </div>
          <div style={{
            fontSize: '11px',
            color: unlocked ? '#ffdd57' : '#a0a0b0',
            opacity: isHovered && unlocked ? 1 : 0.7,
            transition: 'opacity 0.25s'
          }}>
            {stolenCount}/{card.totalItems} 物品
          </div>
        </div>
      </div>
    </div>
  );
}

export default LevelSelect;
