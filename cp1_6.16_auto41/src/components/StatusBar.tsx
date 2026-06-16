import React, { useState } from 'react';
import { PotionState } from '../logic/potionEngine';

interface StatusBarProps {
  timeLeft: number;
  potionState: PotionState;
  successCount: number;
  failureCount: number;
  onNewRecipe: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  timeLeft,
  potionState,
  successCount,
  failureCount,
  onNewRecipe
}) => {
  const [showMaterialList, setShowMaterialList] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeWarning = timeLeft <= 10;

  return (
    <div className="status-bar" style={{
      width: '100%',
      padding: '16px 24px',
      background: 'linear-gradient(135deg, #2C3E50 0%, #1B1B2F 100%)',
      borderBottom: '2px solid #8E44AD',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      borderRadius: '0 0 8px 8px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
      position: 'relative',
      zIndex: 100
    }}>
      <div className="status-left" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flex: 1
      }}>
        <div className="timer" style={{
          fontSize: '28px',
          fontWeight: 700,
          fontFamily: "'Cinzel', serif",
          color: timeWarning ? '#E74C3C' : '#F5F5DC',
          padding: '8px 20px',
          background: 'rgba(142, 68, 173, 0.2)',
          borderRadius: '8px',
          border: '2px solid #8E44AD',
          minWidth: '100px',
          textAlign: 'center',
          transition: 'color 0.3s ease',
          animation: timeWarning ? 'pulse 1s infinite' : 'none'
        }}>
          ⏱ {formatTime(timeLeft)}
        </div>

        <div className="material-history" style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMaterialList(!showMaterialList)}
            className="hover-lift"
            style={{
              padding: '10px 18px',
              background: '#2C3E50',
              border: '2px solid #8E44AD',
              borderRadius: '8px',
              color: '#F5F5DC',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'Noto Serif SC', serif"
            }}
          >
            <span>📜</span>
            <span>已用材料 ({potionState.addedMaterials.length})</span>
            <span style={{
              transform: showMaterialList ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}>▼</span>
          </button>

          <div
            className="material-list-panel"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              background: '#2C3E50',
              border: '2px solid #8E44AD',
              borderRadius: '8px',
              padding: showMaterialList ? '12px' : '0 12px',
              minWidth: '240px',
              maxHeight: showMaterialList ? '300px' : '0',
              overflow: 'hidden',
              overflowY: showMaterialList ? 'auto' : 'hidden',
              transition: 'max-height 0.2s ease-out, padding 0.2s ease-out',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
              zIndex: 200
            }}
          >
            {potionState.addedMaterials.length === 0 ? (
              <p style={{ color: '#95A5A6', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                尚未投入任何材料
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {potionState.addedMaterials.map((mat, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'rgba(142, 68, 173, 0.15)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    <span style={{ color: '#F5F5DC' }}>
                      <span style={{ color: '#8E44AD', marginRight: '8px' }}>#{index + 1}</span>
                      {mat.materialName}
                    </span>
                    <span style={{ color: '#F39C12', fontSize: '11px' }}>
                      🔥 {mat.heat}级
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="status-right" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div className="stats" style={{
          display: 'flex',
          gap: '16px',
          padding: '10px 18px',
          background: 'rgba(142, 68, 173, 0.15)',
          borderRadius: '8px',
          border: '1px solid rgba(142, 68, 173, 0.4)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#27AE60',
              boxShadow: '0 0 8px #27AE60'
            }}></span>
            <span style={{ color: '#27AE60' }}>{successCount}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#C0392B',
              boxShadow: '0 0 8px #C0392B'
            }}></span>
            <span style={{ color: '#C0392B' }}>{failureCount}</span>
          </div>
        </div>

        <button
          onClick={onNewRecipe}
          className="hover-lift"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#F5F5DC',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Noto Serif SC', serif",
            boxShadow: '0 4px 15px rgba(142, 68, 173, 0.4)'
          }}
        >
          ✨ 新配方
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
