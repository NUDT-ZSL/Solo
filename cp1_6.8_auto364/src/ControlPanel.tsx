import React from 'react';
import { TOTAL_LEVELS } from './utils/puzzleLogic';

interface ControlPanelProps {
  energy: number;
  maxEnergy: number;
  currentLevel: number;
  onHint: () => void;
  onLevelSelect: (level: number) => void;
  hintAvailable: boolean;
  levelName: string;
  levelDesc: string;
  fragmentsTotal: number;
  fragmentsLocked: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  energy,
  maxEnergy,
  currentLevel,
  onHint,
  onLevelSelect,
  hintAvailable,
  levelName,
  levelDesc,
  fragmentsTotal,
  fragmentsLocked,
}) => {
  const energyPercent = (energy / maxEnergy) * 100;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        left: 20,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'auto',
      }}>
        <div style={{
          background: 'rgba(40, 30, 15, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          padding: '14px 18px',
          border: '1px solid rgba(200, 164, 78, 0.3)',
          minWidth: 180,
        }}>
          <div style={{
            color: 'rgba(230, 195, 106, 0.8)',
            fontSize: 12,
            marginBottom: 6,
            fontFamily: 'serif',
            letterSpacing: 2,
          }}>
            灵能
          </div>
          <div style={{
            width: '100%',
            height: 14,
            background: 'rgba(30, 22, 10, 0.8)',
            borderRadius: 7,
            overflow: 'hidden',
            border: '1px solid rgba(200, 164, 78, 0.2)',
          }}>
            <div style={{
              width: `${energyPercent}%`,
              height: '100%',
              background: energyPercent > 30
                ? 'linear-gradient(90deg, #c8a44e, #e6c36a)'
                : 'linear-gradient(90deg, #8b4513, #a0522d)',
              borderRadius: 7,
              transition: 'width 0.3s ease, background 0.3s ease',
              boxShadow: energyPercent > 30
                ? '0 0 8px rgba(230, 195, 106, 0.4)'
                : '0 0 4px rgba(139, 69, 19, 0.4)',
            }} />
          </div>
          <div style={{
            color: 'rgba(230, 195, 106, 0.6)',
            fontSize: 11,
            marginTop: 4,
            textAlign: 'right',
            fontFamily: 'monospace',
          }}>
            {Math.floor(energy)} / {maxEnergy}
          </div>
        </div>

        <div style={{
          background: 'rgba(40, 30, 15, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          padding: '10px 14px',
          border: '1px solid rgba(200, 164, 78, 0.3)',
          minWidth: 180,
        }}>
          <div style={{
            color: 'rgba(230, 195, 106, 0.8)',
            fontSize: 12,
            marginBottom: 4,
            fontFamily: 'serif',
            letterSpacing: 2,
          }}>
            进度
          </div>
          <div style={{
            color: '#e6c36a',
            fontSize: 16,
            fontFamily: 'serif',
            fontWeight: 'bold',
          }}>
            {fragmentsLocked} / {fragmentsTotal}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        right: 20,
        top: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}>
        <div style={{
          background: 'rgba(40, 30, 15, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          padding: '14px 18px',
          border: '1px solid rgba(200, 164, 78, 0.3)',
          minWidth: 160,
          textAlign: 'center',
        }}>
          <div style={{
            color: '#e6c36a',
            fontSize: 20,
            fontFamily: 'serif',
            fontWeight: 'bold',
            letterSpacing: 4,
            marginBottom: 4,
          }}>
            {levelName}
          </div>
          <div style={{
            color: 'rgba(230, 195, 106, 0.6)',
            fontSize: 12,
            fontFamily: 'serif',
            letterSpacing: 1,
          }}>
            {levelDesc}
          </div>
          <div style={{
            color: 'rgba(230, 195, 106, 0.5)',
            fontSize: 11,
            marginTop: 6,
            fontFamily: 'serif',
          }}>
            第 {currentLevel} 卷
          </div>
        </div>

        <button
          onClick={onHint}
          disabled={!hintAvailable}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '2px solid rgba(200, 164, 78, 0.6)',
            background: hintAvailable
              ? 'radial-gradient(circle at 40% 40%, #5a4520, #3a2a10)'
              : 'radial-gradient(circle at 40% 40%, #3a3020, #2a2010)',
            color: hintAvailable ? '#e6c36a' : 'rgba(200, 164, 78, 0.3)',
            fontSize: 16,
            fontFamily: 'serif',
            fontWeight: 'bold',
            cursor: hintAvailable ? 'pointer' : 'not-allowed',
            boxShadow: hintAvailable
              ? '0 0 15px rgba(200, 164, 78, 0.3), inset 0 0 8px rgba(200, 164, 78, 0.1)'
              : 'none',
            transition: 'all 0.3s ease',
            letterSpacing: 2,
          }}
          title="提示：高亮下一块正确碎片"
        >
          鉴
        </button>

        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: 200,
        }}>
          {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map(lv => (
            <button
              key={lv}
              onClick={() => onLevelSelect(lv)}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: lv === currentLevel
                  ? '2px solid #e6c36a'
                  : '1.5px solid rgba(200, 164, 78, 0.4)',
                background: lv === currentLevel
                  ? 'radial-gradient(circle at 40% 40%, #5a4520, #3a2a10)'
                  : 'radial-gradient(circle at 40% 40%, rgba(50,38,20,0.8), rgba(30,22,10,0.6))',
                color: lv === currentLevel ? '#e6c36a' : 'rgba(200, 164, 78, 0.5)',
                fontSize: 14,
                fontFamily: 'serif',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: lv === currentLevel
                  ? '0 0 10px rgba(200, 164, 78, 0.3)'
                  : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
