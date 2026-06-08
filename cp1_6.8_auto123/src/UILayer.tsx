import React from 'react'

interface UILayerProps {
  score: number
  lives: number
  dust: number
  gameOver: boolean
  finalScore: number
  onRestart: () => void
}

export const UILayer: React.FC<UILayerProps> = ({ score, lives, dust, gameOver, finalScore, onRestart }) => {
  return (
    <>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: '12px 20px',
        borderRadius: 12,
        background: 'rgba(20, 15, 40, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(100, 80, 160, 0.25)',
        color: '#e0d8ff',
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: 14,
        lineHeight: 1.8,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ opacity: 0.7 }}>分数</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#ffd866' }}>{score}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ opacity: 0.7 }}>生命</span>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{
              fontSize: 18,
              opacity: i < lives ? 1 : 0.25,
              filter: i < lives ? 'drop-shadow(0 0 4px rgba(255,80,100,0.6))' : 'none',
              transition: 'opacity 0.3s, filter 0.3s',
            }}>
              ❤️
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ opacity: 0.7 }}>鳞粉</span>
          <span style={{ color: '#ffe080', fontWeight: 600 }}>✦ {dust}</span>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: '8px 14px',
        borderRadius: 10,
        background: 'rgba(20, 15, 40, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(100, 80, 160, 0.2)',
        color: 'rgba(200, 190, 230, 0.6)',
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: 12,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
      }}>
        方向键 / WASD 移动 · 鼠标拖拽蝴蝶
      </div>

      {gameOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5, 2, 15, 0.6)',
          zIndex: 20,
        }}>
          <div style={{
            padding: '40px 50px',
            borderRadius: 20,
            background: 'rgba(25, 18, 50, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(120, 90, 200, 0.3)',
            textAlign: 'center',
            color: '#e8e0ff',
            fontFamily: "'Segoe UI', sans-serif",
            animation: 'fadeIn 0.5s ease',
          }}>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 12,
              color: '#ff8080',
              textShadow: '0 0 20px rgba(255,80,80,0.4)',
            }}>
              游戏结束
            </div>
            <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 8 }}>
              最终得分
            </div>
            <div style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#ffd866',
              textShadow: '0 0 20px rgba(255,200,50,0.4)',
              marginBottom: 8,
            }}>
              {finalScore}
            </div>
            <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 24 }}>
              收集了 {dust} 个光之鳞粉
            </div>
            <button
              onClick={onRestart}
              style={{
                padding: '12px 36px',
                fontSize: 16,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #6a3de8, #9b59b6)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 15px rgba(106, 61, 232, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(106, 61, 232, 0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(106, 61, 232, 0.4)'
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </>
  )
}
