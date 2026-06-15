import { useState, useEffect, useCallback } from 'react';
import { eventBus } from './EventBus';
import { levelManager } from './LevelManager';

interface LevelButtonProps {
  levelId: string;
  index: number;
  isCurrent: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
  onClick: (levelId: string) => void;
}

function LevelButton({ levelId, index, isCurrent, isUnlocked, isCompleted, onClick }: LevelButtonProps) {
  const [hover, setHover] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const getBgColor = (): string => {
    if (isCompleted) return '#ffd54f';
    if (isCurrent) return '#ffeb3b';
    if (isUnlocked) return 'rgba(124, 77, 255, 0.6)';
    return '#424242';
  };

  const getTextColor = (): string => {
    if (isCompleted || isCurrent) return '#212121';
    if (isUnlocked) return '#ffffff';
    return '#757575';
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <button
        onClick={() => isUnlocked && onClick(levelId)}
        onMouseEnter={() => { setHover(true); setShowTooltip(true); }}
        onMouseLeave={() => { setHover(false); setShowTooltip(false); }}
        disabled={!isUnlocked}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          cursor: isUnlocked ? 'pointer' : 'not-allowed',
          backgroundColor: getBgColor(),
          color: getTextColor(),
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Courier New', monospace",
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: hover && isUnlocked ? 'scale(1.15)' : 'scale(1)',
          boxShadow: isCurrent
            ? '0 0 8px #ffeb3b, 0 0 16px rgba(255, 235, 59, 0.5)'
            : hover && isUnlocked
              ? '0 0 12px rgba(124, 77, 255, 0.6)'
              : 'none',
          outline: 'none'
        }}
      >
        {index + 1}
      </button>
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid #311b92',
            borderRadius: 8,
            fontSize: 12,
            color: isUnlocked ? '#e0e0e0' : '#757575',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            关卡 {index + 1}
          </div>
          <div style={{ opacity: 0.8 }}>
            {levelManager.getLevelName(levelId)}
          </div>
          {isCompleted && (
            <div style={{ color: '#ffd54f', marginTop: 2, fontSize: 11 }}>✓ 已完成</div>
          )}
          {!isUnlocked && (
            <div style={{ color: '#ff5252', marginTop: 2, fontSize: 11 }}>🔒 未解锁</div>
          )}
        </div>
      )}
    </div>
  );
}

interface UIProps {
  currentLevelId: string;
  stepCount: number;
  levelName: string;
  levelComplete: boolean;
}

export function GameUI({ currentLevelId, stepCount, levelName, levelComplete }: UIProps) {
  const levelOrder = levelManager.getLevelOrder();
  const currentIndex = levelOrder.indexOf(currentLevelId);

  const handleReset = useCallback(() => {
    eventBus.emit('gameReset', undefined as any);
  }, []);

  const handleLevelChange = useCallback((levelId: string) => {
    eventBus.emit('levelChange', { levelId });
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
      <div
        style={{
          height: 64,
          backgroundColor: '#1a1a2e',
          borderTop: '1px solid #2a2a3e',
          borderRadius: '0 0 16px 16px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <span
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 18,
              color: '#e0e0e0',
              fontWeight: 500
            }}
          >
            ◇ {levelName}
          </span>
          <span
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 14,
              color: '#7c4dff',
              backgroundColor: 'rgba(124, 77, 255, 0.15)',
              padding: '2px 10px',
              borderRadius: 12,
              fontWeight: 600
            }}
          >
            LV {currentIndex + 1}
          </span>
        </div>

        <button
          onClick={handleReset}
          style={{
            width: 120,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#311b92',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Courier New', monospace",
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4527a0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#311b92';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          ⟲ 重置
        </button>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: 'rgba(158, 158, 158, 0.1)',
              borderRadius: 20
            }}
          >
            <span style={{ fontSize: 18 }}>👣</span>
            <span
              style={{
                fontSize: 16,
                color: '#9e9e9e',
                fontFamily: "'Courier New', monospace",
                fontWeight: 500
              }}
            >
              步数: <span style={{ color: '#e0e0e0', fontWeight: 700 }}>{stepCount}</span>
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          height: 48,
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginTop: 16
        }}
      >
        {levelOrder.map((levelId, index) => (
          <LevelButton
            key={levelId}
            levelId={levelId}
            index={index}
            isCurrent={levelId === currentLevelId}
            isUnlocked={levelManager.isLevelUnlocked(levelId)}
            isCompleted={levelManager.isLevelCompleted(levelId)}
            onClick={handleLevelChange}
          />
        ))}
      </div>

      {levelComplete && (
        <div
          style={{
            textAlign: 'center',
            marginTop: 12,
            fontFamily: "'Courier New', monospace",
            fontSize: 14,
            color: '#ffd54f',
            animation: 'pulse 1s ease-in-out infinite'
          }}
        >
          ✨ 恭喜通关！点击下方按钮进入下一关 ✨
        </div>
      )}
    </div>
  );
}
