import React from 'react';
import { GameState } from './GameEngine';

interface UILayerProps {
  gameState: GameState;
  onReset: () => void;
}

const UILayer: React.FC<UILayerProps> = ({ gameState, onReset }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      fontFamily: '"Courier New", monospace',
      zIndex: 10,
    }}>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{
          color: '#88CCFF',
          fontSize: 18,
          textShadow: '0 0 10px rgba(100, 180, 255, 0.8), 0 0 20px rgba(100, 180, 255, 0.4)',
          letterSpacing: 2,
        }}>
          得分: {gameState.score}
        </div>
        <div style={{
          color: '#FFD700',
          fontSize: 15,
          textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 0 16px rgba(255, 215, 0, 0.3)',
          letterSpacing: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff, #FFD700, #FFA500)',
            boxShadow: '0 0 6px #FFD700',
          }} />
          光球: {gameState.orbCount}
        </div>
        <div style={{
          color: '#00FFFF',
          fontSize: 14,
          textShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
          letterSpacing: 1,
        }}>
          瞬移: {gameState.teleportCharges}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
      }}>
        <button
          onClick={onReset}
          style={{
            pointerEvents: 'auto',
            padding: '10px 24px',
            border: '1px solid rgba(100, 180, 255, 0.4)',
            borderRadius: 8,
            background: 'rgba(20, 20, 40, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#88CCFF',
            fontSize: 14,
            fontFamily: '"Courier New", monospace',
            letterSpacing: 2,
            cursor: 'pointer',
            textShadow: '0 0 6px rgba(100, 180, 255, 0.5)',
            boxShadow: '0 0 15px rgba(100, 180, 255, 0.15), inset 0 0 15px rgba(100, 180, 255, 0.05)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(100, 180, 255, 0.8)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(100, 180, 255, 0.3), inset 0 0 25px rgba(100, 180, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(100, 180, 255, 0.4)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(100, 180, 255, 0.15), inset 0 0 15px rgba(100, 180, 255, 0.05)';
          }}
        >
          重置关卡
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: 'rgba(100, 180, 255, 0.4)',
        fontSize: 12,
        letterSpacing: 1,
      }}>
        WASD / 方向键移动 | 空格瞬移
      </div>

      {gameState.isGameOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.7)',
          pointerEvents: 'auto',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}>
            <div style={{
              color: '#FF4466',
              fontSize: 36,
              textShadow: '0 0 20px rgba(255, 68, 102, 0.8), 0 0 40px rgba(255, 68, 102, 0.4)',
              letterSpacing: 4,
            }}>
              暗影吞噬
            </div>
            <div style={{
              color: '#88CCFF',
              fontSize: 18,
              textShadow: '0 0 10px rgba(100, 180, 255, 0.6)',
            }}>
              最终得分: {gameState.score}
            </div>
            <button
              onClick={onReset}
              style={{
                padding: '12px 32px',
                border: '1px solid rgba(100, 180, 255, 0.5)',
                borderRadius: 8,
                background: 'rgba(20, 20, 40, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#88CCFF',
                fontSize: 16,
                fontFamily: '"Courier New", monospace',
                letterSpacing: 2,
                cursor: 'pointer',
                textShadow: '0 0 8px rgba(100, 180, 255, 0.5)',
                boxShadow: '0 0 20px rgba(100, 180, 255, 0.2)',
              }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UILayer;
