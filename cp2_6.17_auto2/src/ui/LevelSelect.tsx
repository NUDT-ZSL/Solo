import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  enemies: number;
}

const LEVEL_CARDS: LevelCardData[] = [
  {
    id: '1',
    name: '暗夜街巷',
    description: '初学者潜入训练，熟悉回声定位和阴影躲藏',
    totalItems: 3,
    difficulty: '简单',
    enemies: 4
  },
  {
    id: '2',
    name: '仓库禁区',
    description: '守卫密集的工业区，巡逻路线复杂',
    totalItems: 3,
    difficulty: '普通',
    enemies: 6
  },
  {
    id: '3',
    name: '豪宅之夜',
    description: '精英保镖、警犬与多重探照灯',
    totalItems: 3,
    difficulty: '困难',
    enemies: 8
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
  const { loading, error, levels: apiLevels } = useLevelList();

  const totalPercent = useMemo(() => {
    return totalPossible > 0 ? Math.round((totalStolen / totalPossible) * 100) : 0;
  }, [totalStolen, totalPossible]);

  const handleResetClick = useCallback(() => {
    setShowConfirmReset(true);
  }, []);

  const handleConfirmReset = useCallback(() => {
    onResetProgress();
    setShowConfirmReset(false);
  }, [onResetProgress]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: `
          linear-gradient(180deg, #0a0a1a 0%, #0f0f23 30%, #14142e 70%, #0a0a1a 100%)
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 20px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(255, 221, 87, 0.06) 0%, transparent 45%),
            radial-gradient(circle at 85% 80%, rgba(255, 221, 87, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(15, 15, 35, 0) 0%, rgba(10, 10, 26, 0.8) 100%)
          `,
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 221, 87, 0.015) 2px,
              rgba(255, 221, 87, 0.015) 4px
            )
          `,
          pointerEvents: 'none',
          opacity: 0.5
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          marginBottom: '24px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: '#a0a0b0',
            letterSpacing: '12px',
            marginBottom: '6px',
            opacity: 0.7,
            textTransform: 'uppercase'
          }}
        >
          DARK ALLEY ECHO
        </div>
        <h1
          style={{
            fontSize: '60px',
            fontWeight: 900,
            color: '#ffdd57',
            letterSpacing: '10px',
            margin: 0,
            textShadow: `
              0 0 20px rgba(255, 221, 87, 0.5),
              0 0 40px rgba(255, 221, 87, 0.3),
              0 0 60px rgba(255, 221, 87, 0.15),
              0 4px 8px rgba(0, 0, 0, 0.5)
            `,
            lineHeight: 1,
            position: 'relative'
          }}
        >
          暗巷回声
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #ffdd57, transparent)',
              opacity: 0.4,
              filter: 'blur(1px)'
            }}
          />
        </h1>
        <div
          style={{
            marginTop: '14px',
            fontSize: '14px',
            color: '#8a8ab0',
            letterSpacing: '6px',
            fontWeight: 300
          }}
        >
          潜 行 · 解 谜 · 偷 窃
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#a0a0b0',
              letterSpacing: '3px',
              textTransform: 'uppercase'
            }}
          >
            总 体 进 度
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffdd57',
              letterSpacing: '2px',
              textShadow: '0 0 8px rgba(255, 221, 87, 0.4)'
            }}
          >
            {totalStolen} / {totalPossible} 物品 · {totalPercent}%
          </div>
        </div>
        <div
          style={{
            height: '14px',
            background: 'linear-gradient(180deg, #1a1a35 0%, #0f0f23 100%)',
            borderRadius: '7px',
            border: '1.5px solid #2d2d44',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
            position: 'relative'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${totalPercent}%`,
              background: 'linear-gradient(90deg, #ffdd57 0%, #ffaa00 50%, #ffdd57 100%)',
              borderRadius: '5px',
              boxShadow: '0 0 20px rgba(255, 221, 87, 0.6)',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 6px,
                    rgba(255, 255, 255, 0.25) 6px,
                    rgba(255, 255, 255, 0.25) 12px
                  )
                `,
                animation: 'progressShine 2s linear infinite'
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '28px',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1,
          alignItems: 'center'
        }}
      >
        <StatBox
          label="完 成 关 卡"
          value={`${completedLevels} / ${LEVEL_CARDS.length}`}
          subValue={`${completedLevels} 关已通关`}
          color="#22c55e"
        />
        <StatBox
          label="收 集 物 品"
          value={`${totalStolen} / ${totalPossible}`}
          subValue={`${totalPercent}% 完成度`}
          color="#ffdd57"
        />
        <button
          onClick={handleResetClick}
          style={{
            padding: '14px 24px',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            color: '#ef4444',
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '2px',
            transition: 'all 0.25s ease',
            minHeight: '84px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(180deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 100%)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '20px' }}>↺</div>
          <div>重置进度</div>
        </button>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#a0a0b0',
          marginBottom: '16px',
          letterSpacing: '5px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #2d2d44)'
          }}
        />
        选 择 关 卡
        <div
          style={{
            width: '40px',
            height: '1px',
            background: 'linear-gradient(90deg, #2d2d44, transparent)'
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            color: '#ffdd57',
            fontSize: '13px',
            marginBottom: '12px',
            opacity: 0.7,
            letterSpacing: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid #ffdd57',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          正在连接服务器...
        </div>
      )}

      {error && (
        <div
          style={{
            color: '#ef4444',
            fontSize: '12px',
            marginBottom: '12px',
            opacity: 0.8,
            letterSpacing: '1px'
          }}
        >
          ⚠ {error} - 使用本地数据
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '24px',
          padding: '12px 40px 24px 40px',
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
          marginTop: '20px',
          padding: '16px 32px',
          background: 'linear-gradient(135deg, rgba(30, 30, 54, 0.7) 0%, rgba(20, 20, 46, 0.7) 100%)',
          borderRadius: '14px',
          border: '1.5px solid rgba(45, 45, 68, 0.9)',
          maxWidth: '760px',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#ffdd57',
            marginBottom: '12px',
            fontWeight: 700,
            letterSpacing: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '14px' }}>🎮</span>
          游 戏 操 作 指 南
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px 32px',
            fontSize: '13px',
            color: '#a0a0b0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyHint label="WASD" />
            <span>— 移动角色，保持在阴影中降低被发现几率</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyHint label="空格" />
            <span>— 回声定位（暴露位置但标记附近敌人）</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyHint label="E" />
            <span>— 窃取物品（按住1.5秒不移动完成）</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyHint label="阴影区" />
            <span>— 深色区域，降低50%被发现距离</span>
          </div>
        </div>
      </div>

      {showConfirmReset && (
        <ConfirmDialog
          title="确认重置所有进度？"
          message="所有关卡的已窃取物品和解锁状态将被完全清除。此操作无法撤销，确定要继续吗？"
          confirmText="确认重置"
          cancelText="取消"
          onConfirm={handleConfirmReset}
          onCancel={() => setShowConfirmReset(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes progressShine {
          from { background-position: 0 0; }
          to { background-position: 200px 0; }
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #3f3f5c transparent;
        }
        *::-webkit-scrollbar {
          height: 8px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: #3f3f5c;
          border-radius: 4px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: #4f4f6c;
        }
      `}</style>
    </div>
  );
};

function KeyHint({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: '3px 10px',
        background: 'linear-gradient(180deg, #353552 0%, #1a1a35 100%)',
        borderRadius: '6px',
        color: '#ffdd57',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'monospace',
        border: '1.5px solid #3f3f5c',
        letterSpacing: '1px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        minWidth: '40px',
        textAlign: 'center'
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
        padding: '14px 32px',
        background: 'linear-gradient(180deg, rgba(30, 30, 54, 0.9) 0%, rgba(20, 20, 46, 0.9) 100%)',
        borderRadius: '12px',
        border: `1.5px solid ${color}40`,
        minWidth: '180px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)',
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 20px ${color}15`
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: '#a0a0b0',
          letterSpacing: '4px',
          marginBottom: '6px',
          textTransform: 'uppercase'
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '30px',
          fontWeight: 900,
          color: color,
          textShadow: `0 0 16px ${color}60`,
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

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = 11;
    const cols = 22;
    const rows = 12;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const seed = (x * 7 + y * 13 + index * 19) % 23;
        const px = x * tileSize;
        const py = y * tileSize;

        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
          const gradient = ctx.createLinearGradient(px, py, px, py + tileSize);
          gradient.addColorStop(0, '#5a5a7a');
          gradient.addColorStop(1, '#2a2a45');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = '#6a6a8a';
          ctx.fillRect(px, py, tileSize, 2);
        } else if (seed < 5) {
          const gradient = ctx.createLinearGradient(px, py, px, py + tileSize);
          gradient.addColorStop(0, '#4a4a6a');
          gradient.addColorStop(1, '#1a1a35');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = '#5a5a7a';
          ctx.fillRect(px, py, tileSize, 2);
        } else if (seed >= 20) {
          ctx.fillStyle = '#2d2d44';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(px, py, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#252540';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.strokeStyle = '#1a1a35';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
        }
      }
    }

    const itemPositions = [
      { x: 4, y: 3 },
      { x: 17, y: 5 },
      { x: 10, y: 9 }
    ];
    for (let i = 0; i < card.totalItems; i++) {
      const pos = itemPositions[i] || itemPositions[0];
      const cx = pos.x * tileSize + tileSize / 2;
      const cy = pos.y * tileSize + tileSize / 2;
      const done = i < stolenCount;
      ctx.fillStyle = done ? '#22c55e' : '#ffdd57';
      ctx.shadowColor = done ? '#22c55e' : '#ffdd57';
      ctx.shadowBlur = 6;
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

  const difficultyConfig = {
    简单: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)' },
    普通: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' },
    困难: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' }
  }[card.difficulty];

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        width: 290,
        height: 230,
        borderRadius: '18px',
        background: 'linear-gradient(180deg, #1e1e36 0%, #16162e 100%)',
        border: `2px solid ${isHovered && unlocked ? '#ffdd57' : '#2d2d44'}`,
        boxShadow: isHovered && unlocked
          ? `
            0 12px 36px rgba(0, 0, 0, 0.6),
            0 0 40px rgba(255, 221, 87, 0.25),
            inset 0 1px 0 rgba(255, 221, 87, 0.1)
          `
          : `
            0 6px 20px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
        transform: isHovered && unlocked ? 'translateY(-8px) scale(1.02)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.45,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        animation: unlocked
          ? `cardAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.12}s both`
          : 'none'
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 130,
          overflow: 'hidden',
          borderBottom: '1.5px solid #2d2d44'
        }}
      >
        <canvas
          ref={canvasRef}
          width={242}
          height={132}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'pixelated'
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 60%, rgba(15, 15, 35, 0.7) 100%)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            padding: '5px 12px',
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(30, 30, 54, 0.95) 100%)',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#ffdd57',
            border: '1.5px solid rgba(255, 221, 87, 0.4)',
            letterSpacing: '2px',
            textShadow: '0 0 8px rgba(255, 221, 87, 0.4)',
            boxShadow: '0 0 16px rgba(255, 221, 87, 0.2)'
          }}
        >
          关卡 {card.id}
        </div>

        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            padding: '5px 12px',
            background: difficultyConfig.bg,
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            color: difficultyConfig.color,
            border: `1.5px solid ${difficultyConfig.border}`,
            letterSpacing: '2px'
          }}
        >
          {card.difficulty}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(15, 15, 35, 0.85)',
            borderRadius: '6px',
            fontSize: '10px',
            color: '#a0a0b0',
            border: '1px solid #2d2d44'
          }}
        >
          <span style={{ fontSize: '12px' }}>👁</span>
          {card.enemies} 守卫
        </div>

        {!unlocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 10, 26, 0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                fontSize: '48px',
                filter: 'drop-shadow(0 0 8px rgba(160, 160, 176, 0.4))'
              }}
            >
              🔒
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#a0a0b0',
                letterSpacing: '3px',
                fontWeight: 500
              }}
            >
              完成前一关解锁
            </div>
          </div>
        )}

        {complete && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '16px',
              transform: 'translateY(-50%)',
              fontSize: '28px',
              filter: 'drop-shadow(0 0 10px rgba(255, 221, 87, 0.7))',
              animation: 'starFloat 3s ease-in-out infinite'
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
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #ffdd57, #ffaa00, #ffdd57, transparent)',
              backgroundSize: '200% 100%',
              animation: 'neonPulse 1.5s ease-in-out infinite'
            }}
          />
        )}
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div
          style={{
            fontSize: '17px',
            fontWeight: 800,
            color: unlocked ? '#ffdd57' : '#6a6a8a',
            marginBottom: '4px',
            letterSpacing: '2px',
            textShadow: unlocked ? '0 0 10px rgba(255, 221, 87, 0.3)' : 'none'
          }}
        >
          {card.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#8a8aa0',
            marginBottom: '14px',
            lineHeight: 1.4,
            minHeight: '34px'
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
          <div style={{ display: 'flex', gap: '7px' }}>
            {Array.from({ length: card.totalItems }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background:
                    i < stolenCount
                      ? 'linear-gradient(135deg, #ffdd57 0%, #ffaa00 100%)'
                      : '#323250',
                  border: `1.5px solid ${i < stolenCount ? '#ffdd57' : '#4a4a6a'}`,
                  boxShadow:
                    i < stolenCount
                      ? '0 0 10px rgba(255, 221, 87, 0.6), inset 0 0 4px rgba(255, 255, 255, 0.3)'
                      : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: i < stolenCount ? 'scale(1.15)' : 'scale(1)'
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: '12px',
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

      <style>{`
        @keyframes cardAppear {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes starFloat {
          0%, 100% {
            transform: translateY(-50%) rotate(-5deg) scale(1);
          }
          50% {
            transform: translateY(-55%) rotate(5deg) scale(1.1);
          }
        }
        @keyframes neonPulse {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }
      `}</style>
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
        background: 'rgba(10, 10, 26, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '36px 40px',
          background: 'linear-gradient(180deg, #1e1e36 0%, #16162e 100%)',
          borderRadius: '18px',
          border: '2px solid #2d2d44',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.3)',
          maxWidth: '440px',
          textAlign: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div
          style={{
            fontSize: '44px',
            marginBottom: '14px',
            filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))'
          }}
        >
          ⚠️
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#ffdd57',
            marginBottom: '12px',
            letterSpacing: '3px',
            textShadow: '0 0 12px rgba(255, 221, 87, 0.4)'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#a0a0b0',
            marginBottom: '28px',
            lineHeight: 1.7,
            letterSpacing: '0.5px'
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a35 100%)',
              border: '1.5px solid #3f3f5c',
              borderRadius: '10px',
              color: '#a0a0b0',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '3px',
              transition: 'all 0.25s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, #353552 0%, #252540 100%)';
              e.currentTarget.style.color = '#ffdd57';
              e.currentTarget.style.borderColor = '#ffdd5740';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, #2d2d44 0%, #1a1a35 100%)';
              e.currentTarget.style.color = '#a0a0b0';
              e.currentTarget.style.borderColor = '#3f3f5c';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.6)',
              borderRadius: '10px',
              color: '#ef4444',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '3px',
              transition: 'all 0.25s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, rgba(239, 68, 68, 0.45) 0%, rgba(239, 68, 68, 0.25) 100%)';
              e.currentTarget.style.boxShadow = '0 0 24px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 100%)';
              e.currentTarget.style.boxShadow = 'none';
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
