import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { LevelProgress } from '../types';
import { useLevelList } from '../hooks/useLevelData';

interface LevelSelectProps {
  progress: Record<string, LevelProgress>;
  totalStolen: number;
  totalPossible: number;
  completedLevels: number;
  onSelectLevel: (levelId: string) => void;
  isLevelUnlocked: (levelId: string) => boolean;
  isLevelComplete: (levelId: string) => boolean;
  getStolenItems: (levelId: string) => string[];
  onResetProgress: () => void;
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

const LevelSelect: React.FC<LevelSelectProps> = ({
  progress,
  totalStolen,
  totalPossible,
  completedLevels,
  onSelectLevel,
  isLevelUnlocked,
  isLevelComplete,
  getStolenItems,
  onResetProgress
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const { loading } = useLevelList();

  const totalPercent = useMemo(() => {
    return totalPossible > 0 ? Math.round((totalStolen / totalPossible) * 100) : 0;
  }, [totalStolen, totalPossible]);

  const handleResetClick = () => {
    setShowConfirmReset(true);
  };

  const handleConfirmReset = () => {
    onResetProgress();
    setShowConfirmReset(false);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '28px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '13px',
            color: '#a0a0b0',
            letterSpacing: '10px',
            marginBottom: '6px',
            opacity: 0.75
          }}
        >
          DARK ALLEY ECHO
        </div>
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 900,
            color: '#ffdd57',
            letterSpacing: '8px',
            margin: 0,
            textShadow: `
              0 0 24px rgba(255, 221, 87, 0.45),
              0 0 48px rgba(255, 221, 87, 0.2)
            `,
            lineHeight: 1
          }}
        >
          暗巷回声
        </h1>
        <div
          style={{
            marginTop: '10px',
            fontSize: '14px',
            color: '#a0a0b0',
            letterSpacing: '3px'
          }}
        >
          潜 行 · 解 谜 · 偷 窃
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '32px',
          marginBottom: '28px',
          position: 'relative',
          zIndex: 1,
          alignItems: 'center'
        }}
      >
        <StatBox
          label="总 完 成 度"
          value={`${totalPercent}%`}
          subValue={`${totalStolen} / ${totalPossible} 物品`}
          color="#ffdd57"
        />
        <StatBox
          label="关 卡 进 度"
          value={`${completedLevels} / ${LEVEL_CARDS.length}`}
          subValue={`${completedLevels} 关完成`}
          color="#22c55e"
        />
        <button
          onClick={handleResetClick}
          style={{
            padding: '12px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            color: '#ef4444',
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '2px',
            transition: 'all 0.2s ease',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
          }}
        >
          <div style={{ fontSize: '18px' }}>↺</div>
          <div>重置进度</div>
        </button>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#a0a0b0',
          marginBottom: '14px',
          letterSpacing: '4px',
          position: 'relative',
          zIndex: 1
        }}
      >
        — 选 择 关 卡 —
      </div>

      {loading && (
        <div
          style={{
            color: '#ffdd57',
            fontSize: '13px',
            marginBottom: '10px',
            opacity: 0.7,
            letterSpacing: '2px'
          }}
        >
          正在连接服务器获取关卡列表...
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '24px',
          padding: '16px 40px 28px 40px',
          overflowX: 'auto',
          maxWidth: '100%',
          scrollBehavior: 'smooth',
          position: 'relative',
          zIndex: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: '#3f3f5c transparent'
        }}
      >
        {LEVEL_CARDS.map((card, index) => {
          const unlocked = isLevelUnlocked(card.id);
          const complete = isLevelComplete(card.id);
          const stolenItems = getStolenItems(card.id);
          const isHovered = hoveredCard === card.id;

          return (
            <LevelCard
              key={card.id}
              card={card}
              progress={progress[card.id]}
              unlocked={unlocked}
              complete={complete}
              stolenCount={stolenItems.length}
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
          marginTop: '24px',
          padding: '14px 28px',
          background: 'rgba(30, 30, 54, 0.7)',
          borderRadius: '12px',
          border: '1px solid #2d2d44',
          maxWidth: '720px',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#ffdd57',
            marginBottom: '10px',
            fontWeight: 700,
            letterSpacing: '3px'
          }}
        >
          游 戏 操 作 指 南
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px 28px',
            fontSize: '13px',
            color: '#a0a0b0'
          }}
        >
          <div>
            <KeyHint label="WASD" /> — 移动角色
          </div>
          <div>
            <KeyHint label="空格键" /> — 回声定位（暴露位置标记敌人）
          </div>
          <div>
            <KeyHint label="E 键" /> — 窃取物品（按住1.5秒）
          </div>
          <div>
            <KeyHint label="阴影区" /> — 减少50%被发现几率
          </div>
        </div>
      </div>

      {showConfirmReset && (
        <ConfirmDialog
          title="确认重置进度？"
          message="所有关卡进度将被清除，此操作无法撤销。"
          confirmText="确认重置"
          cancelText="取消"
          onConfirm={handleConfirmReset}
          onCancel={() => setShowConfirmReset(false)}
        />
      )}
    </div>
  );
};

function KeyHint({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        background: 'linear-gradient(180deg, #353552 0%, #252538 100%)',
        borderRadius: '5px',
        color: '#ffdd57',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'monospace',
        border: '1px solid #3f3f5c',
        letterSpacing: '1px'
      }}
    >
      {label}
    </span>
  );
}

function StatBox({
  label,
  value,
  subValue,
  color
}: {
  label: string;
  value: string;
  subValue: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '14px 30px',
        background: 'rgba(30, 30, 54, 0.85)',
        borderRadius: '12px',
        border: `1px solid ${color}30`,
        minWidth: '170px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: '#a0a0b0',
          letterSpacing: '3px',
          marginBottom: '6px'
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '30px',
          fontWeight: 900,
          color: color,
          textShadow: `0 0 14px ${color}50`,
          lineHeight: 1
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#a0a0b0',
          marginTop: '6px',
          letterSpacing: '1px'
        }}
      >
        {subValue}
      </div>
    </div>
  );
}

function LevelCard({
  card,
  progress,
  unlocked,
  complete,
  stolenCount,
  isHovered,
  onHover,
  onLeave,
  onClick,
  index
}: {
  card: LevelCardData;
  progress?: LevelProgress;
  unlocked: boolean;
  complete: boolean;
  stolenCount: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  index: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = 10;
    const cols = 24;
    const rows = 12;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const seed = (x * 7 + y * 13 + index * 19) % 23;
        const px = x * tileSize;
        const py = y * tileSize;

        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
          ctx.fillStyle = '#4a4a6a';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = '#5a5a7a';
          ctx.fillRect(px, py, tileSize, 2);
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
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(px, py, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#2d2d44';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.strokeStyle = '#252538';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
        }
      }
    }

    const itemPositions = [
      { x: 5, y: 3 },
      { x: 18, y: 6 },
      { x: 11, y: 9 }
    ];
    for (let i = 0; i < card.totalItems; i++) {
      const pos = itemPositions[i] || itemPositions[0];
      const cx = pos.x * tileSize + tileSize / 2;
      const cy = pos.y * tileSize + tileSize / 2;
      const done = i < stolenCount;
      ctx.fillStyle = done ? '#22c55e' : '#ffdd57';
      ctx.shadowColor = done ? '#22c55e' : '#ffdd57';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      const s = 7;
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
    简单: '#22c55e',
    普通: '#eab308',
    困难: '#ef4444'
  }[card.difficulty];

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        width: 280,
        height: 210,
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #1e1e36 0%, #18182e 100%)',
        border: `1.5px solid ${isHovered && unlocked ? '#ffdd57' : '#2d2d44'}`,
        boxShadow: isHovered && unlocked
          ? '0 10px 30px rgba(0,0,0,0.5), 0 0 28px rgba(255, 221, 87, 0.18)'
          : '0 5px 16px rgba(0,0,0,0.3)',
        transform: isHovered && unlocked ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.45,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        animation: unlocked
          ? `cardAppear 0.4s ease-out ${index * 0.1}s both`
          : 'none'
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 120,
          overflow: 'hidden'
        }}
      >
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
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '12px',
            padding: '4px 10px',
            background: 'rgba(15, 15, 35, 0.9)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#ffdd57',
            border: '1px solid rgba(255, 221, 87, 0.3)',
            letterSpacing: '1px'
          }}
        >
          关卡 {card.id}
        </div>
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            padding: '4px 10px',
            background: `${difficultyColor}18`,
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: difficultyColor,
            border: `1px solid ${difficultyColor}40`,
            letterSpacing: '1px'
          }}
        >
          {card.difficulty}
        </div>

        {!unlocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 15, 35, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#a0a0b0'
            }}
          >
            <div style={{ fontSize: '40px' }}>🔒</div>
            <div style={{ letterSpacing: '2px' }}>完成前一关解锁</div>
          </div>
        )}

        {complete && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '14px',
              transform: 'translateY(-50%)',
              fontSize: '24px',
              filter: 'drop-shadow(0 0 6px rgba(255, 221, 87, 0.6))',
              animation: 'starSpin 4s ease-in-out infinite'
            }}
          >
            ⭐
          </div>
        )}

        {isHovered && unlocked && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #ffdd57, transparent)',
              animation: 'borderPulse 1s ease-in-out infinite'
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(45, 45, 68, 0.8)'
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: unlocked ? '#ffdd57' : '#6a6a8a',
            marginBottom: '4px',
            letterSpacing: '1px'
          }}
        >
          {card.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#8a8aa0',
            marginBottom: '12px',
            letterSpacing: '0.5px'
          }}
        >
          {card.description}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: card.totalItems }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: i < stolenCount ? '#ffdd57' : '#323250',
                  boxShadow:
                    i < stolenCount ? '0 0 6px rgba(255, 221, 87, 0.5)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: unlocked ? '#ffdd57' : '#6a6a8a',
              opacity: isHovered && unlocked ? 1 : 0.7,
              transition: 'opacity 0.25s',
              fontWeight: 700,
              letterSpacing: '1px'
            }}
          >
            {stolenCount} / {card.totalItems} 物品
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 15, 35, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(180deg, #1e1e36 0%, #18182e 100%)',
          borderRadius: '14px',
          border: '1.5px solid #2d2d44',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          maxWidth: '400px',
          textAlign: 'center',
          animation: 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div
          style={{
            fontSize: '40px',
            marginBottom: '12px'
          }}
        >
          ⚠️
        </div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#ffdd57',
            marginBottom: '10px',
            letterSpacing: '2px'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#a0a0b0',
            marginBottom: '24px',
            lineHeight: 1.6
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 22px',
              background: '#2d2d44',
              border: '1px solid #3f3f5c',
              borderRadius: '8px',
              color: '#a0a0b0',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '2px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#353555';
              e.currentTarget.style.color = '#ffdd57';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2d2d44';
              e.currentTarget.style.color = '#a0a0b0';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 22px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '2px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default LevelSelect;
