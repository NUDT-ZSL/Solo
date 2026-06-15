import React from 'react';
import { PlayerState } from './PlayerManager';
import { Piece } from './GameEngine';

interface UILayerProps {
  state: PlayerState;
  onReset: () => void;
  onEndTurn: () => void;
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(20, 25, 60, 0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(100, 140, 255, 0.2)',
  borderRadius: '12px',
  color: '#c8d4ff',
  fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
};

const btnStyle: React.CSSProperties = {
  ...glassStyle,
  padding: '10px 22px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'all 0.2s ease',
  letterSpacing: '1px',
};

export const UILayer: React.FC<UILayerProps> = ({ state, onReset, onEndTurn }) => {
  const currentPlayerName = state.currentPlayer === 'blue' ? '蓝方' : '橙方';
  const currentPlayerColor = state.currentPlayer === 'blue' ? '#7aa0ff' : '#ff9a4a';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Top-left: Turn & Piece counts */}
      <div
        style={{
          ...glassStyle,
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '16px 22px',
          minWidth: 180,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          回合 <span style={{ color: '#88aaff' }}>{state.turn}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <div>
            <span style={{ color: '#7aa0ff' }}>●</span>{' '}
            蓝方: {state.bluePieceCount} 枚
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
              待放: {state.blueRemaining}
            </div>
          </div>
          <div>
            <span style={{ color: '#ff9a4a' }}>●</span>{' '}
            橙方: {state.orangePieceCount} 枚
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
              待放: {state.orangeRemaining}
            </div>
          </div>
        </div>
        {!state.isGameOver && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: currentPlayerColor,
              fontWeight: 600,
            }}
          >
            ▶ {currentPlayerName}行动
          </div>
        )}
      </div>

      {/* Bottom-right: Buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          gap: 12,
          pointerEvents: 'auto',
        }}
      >
        <button
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(100,140,255,0.5)';
            e.currentTarget.style.background = 'rgba(30,35,80,0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(100,140,255,0.2)';
            e.currentTarget.style.background = 'rgba(20,25,60,0.55)';
          }}
          onClick={onEndTurn}
          disabled={state.isGameOver}
        >
          结束回合
        </button>
        <button
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,100,100,0.5)';
            e.currentTarget.style.background = 'rgba(60,30,30,0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(100,140,255,0.2)';
            e.currentTarget.style.background = 'rgba(20,25,60,0.55)';
          }}
          onClick={onReset}
        >
          重置
        </button>
      </div>

      {/* Selected piece info card */}
      {state.selectedPiece && (
        <PieceInfoCard piece={state.selectedPiece} />
      )}

      {/* Game Over overlay */}
      {state.isGameOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              ...glassStyle,
              padding: '32px 48px',
              textAlign: 'center',
              animation: 'fadeIn 0.5s ease',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              🏆 游戏结束
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: state.winner === 'blue' ? '#7aa0ff' : '#ff9a4a',
              }}
            >
              {state.winner === 'blue' ? '蓝方' : '橙方'}获胜！
            </div>
            <button
              style={{ ...btnStyle, marginTop: 20 }}
              onClick={onReset}
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PieceInfoCard: React.FC<{ piece: Piece }> = ({ piece }) => {
  const isBlue = piece.player === 'blue';
  const playerLabel = isBlue ? '蓝方' : '橙方';
  const accentColor = isBlue ? '#7aa0ff' : '#ff9a4a';

  return (
    <div
      style={{
        ...glassStyle,
        position: 'absolute',
        top: 20,
        right: 20,
        padding: '16px 22px',
        minWidth: 160,
        pointerEvents: 'auto',
        borderColor: `${accentColor}44`,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: accentColor, marginBottom: 8 }}>
        {playerLabel}棋子
      </div>
      <div style={{ fontSize: 13, lineHeight: '1.8' }}>
        <div>引力强度: {Array(piece.gravity).fill('●').join(' ')}</div>
        <div>
          生命值:{' '}
          {Array(piece.maxHp)
            .fill(0)
            .map((_, i) => (
              <span key={i} style={{ color: i < piece.hp ? '#66ff99' : '#444' }}>
                ●{' '}
              </span>
            ))}
        </div>
        <div style={{ opacity: 0.6, fontSize: 11, marginTop: 4 }}>
          位置: ({piece.row + 1}, {piece.col + 1})
        </div>
      </div>
    </div>
  );
};
