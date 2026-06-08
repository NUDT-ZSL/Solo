import React from 'react';
import { LEVELS } from './GameEngine';

interface UILayerProps {
  currentLevel: number;
  moveCount: number;
  elapsedTime: number;
  attempts: number;
  levelComplete: boolean;
  selectedMirrorId: string | null;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onSelectLevel: (level: number) => void;
}

const glassPanelStyle: React.CSSProperties = {
  background: 'rgba(20, 30, 40, 0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(0, 160, 220, 0.2)',
  borderRadius: 12,
  padding: '14px 18px',
  color: 'rgba(200, 220, 230, 0.9)',
  fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
  fontSize: 13,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(0, 160, 220, 0.08)',
  userSelect: 'none',
};

const btnStyle: React.CSSProperties = {
  background: 'rgba(0, 140, 200, 0.15)',
  border: '1px solid rgba(0, 160, 220, 0.35)',
  borderRadius: 8,
  color: 'rgba(180, 220, 240, 0.9)',
  padding: '8px 16px',
  cursor: 'pointer',
  fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
  fontSize: 13,
  transition: 'all 0.15s ease',
  outline: 'none',
};

const rotateBtnStyle: React.CSSProperties = {
  ...btnStyle,
  padding: '10px 20px',
  fontSize: 18,
  fontWeight: 700,
  minWidth: 48,
  textAlign: 'center',
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export const UILayer: React.FC<UILayerProps> = ({
  currentLevel,
  moveCount,
  elapsedTime,
  attempts,
  levelComplete,
  selectedMirrorId,
  onRotateLeft,
  onRotateRight,
  onReset,
  onSelectLevel,
}) => {
  const levelDef = LEVELS[currentLevel];

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        style={{
          ...glassPanelStyle,
          position: 'absolute',
          top: 16,
          left: 16,
          pointerEvents: 'auto',
          minWidth: 160,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>镜界回响</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'rgba(0, 200, 255, 0.9)' }}>
          {levelDef.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div>
            <span style={{ opacity: 0.6 }}>关卡 </span>
            <span style={{ fontWeight: 600 }}>{currentLevel + 1} / {LEVELS.length}</span>
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>用时 </span>
            <span style={{ fontWeight: 600 }}>{formatTime(elapsedTime)}</span>
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>步数 </span>
            <span style={{ fontWeight: 600 }}>{moveCount}</span>
            <span style={{ opacity: 0.4, fontSize: 11 }}> / {levelDef.parMoves}</span>
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>尝试 </span>
            <span style={{ fontWeight: 600 }}>{attempts}</span>
          </div>
        </div>
      </div>

      {levelComplete && (
        <div
          style={{
            ...glassPanelStyle,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'auto',
            borderColor: 'rgba(255, 200, 50, 0.4)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255, 210, 60, 0.95)', marginBottom: 8 }}>
            ✦ 光路贯通 ✦
          </div>
          <div style={{ marginBottom: 4 }}>
            步数: {moveCount} {moveCount <= levelDef.parMoves ? '★' : ''}
          </div>
          <div style={{ marginBottom: 12 }}>用时: {formatTime(elapsedTime)}</div>
          {currentLevel < LEVELS.length - 1 && (
            <button
              style={{ ...btnStyle, borderColor: 'rgba(255, 200, 50, 0.4)', color: 'rgba(255, 210, 60, 0.9)' }}
              onClick={() => onSelectLevel(currentLevel + 1)}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255, 200, 50, 0.15)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0, 140, 200, 0.15)'; }}
            >
              下一关 →
            </button>
          )}
        </div>
      )}

      {selectedMirrorId && !levelComplete && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ ...glassPanelStyle, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>旋转镜面</span>
            <button
              style={rotateBtnStyle}
              onClick={onRotateLeft}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0, 160, 220, 0.25)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0, 140, 200, 0.15)'; }}
            >
              ←
            </button>
            <button
              style={rotateBtnStyle}
              onClick={onRotateRight}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0, 160, 220, 0.25)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0, 140, 200, 0.15)'; }}
            >
              →
            </button>
            <span style={{ fontSize: 10, opacity: 0.4 }}>A / D</span>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'auto',
        }}
      >
        <button
          style={btnStyle}
          onClick={onReset}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0, 160, 220, 0.25)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0, 140, 200, 0.15)'; }}
        >
          ↺ 重置
        </button>
        <select
          style={{
            ...btnStyle,
            appearance: 'none',
            paddingRight: 28,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='rgba(180,220,240,0.7)' stroke-width='1.5'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
          value={currentLevel}
          onChange={e => onSelectLevel(Number(e.target.value))}
        >
          {LEVELS.map((lv, i) => (
            <option key={i} value={i} style={{ background: '#1a2530', color: '#c0d0dd' }}>
              {i + 1}. {lv.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
