import { memo } from 'react';

export interface HUDProps {
  energy: number;
  score: number;
  combo: number;
  comboBroken: boolean;
  currentBeat: number;
  beatProgress: number;
  isBeat: boolean;
}

const HUD = memo(({ energy, score, combo, comboBroken, currentBeat, beatProgress, isBeat }: HUDProps) => {
  const isEnergyFull = energy >= 100;
  const beatIndex = currentBeat % 4;
  
  const getComboColor = () => {
    if (combo === 0) return '#FFFFFF';
    const t = Math.min(combo / 20, 1);
    const r = Math.round(255);
    const g = Math.round(255 * (1 - t) + 215 * t);
    const b = Math.round(255 * (1 - t) + 0 * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="hud-container">
      <div className="hud-top-left">
        <div className="combo-container">
          <div className={`combo-counter ${comboBroken ? 'combo-broken' : ''}`}>
            <span className="combo-label">COMBO</span>
            <span 
              className="combo-number"
              style={{ color: getComboColor() }}
            >
              {combo}x
            </span>
          </div>
        </div>
      </div>

      <div className="hud-top-center">
        <div className={`energy-container ${isEnergyFull ? 'energy-full' : ''}`}>
          <div className="energy-label">能量</div>
          <div className="energy-bar-wrapper">
            <div
              className="energy-bar-new"
              style={{ 
                width: `${energy}%`,
              }}
            />
            <div className="energy-bar-shine" />
          </div>
          <div className="energy-percent">{Math.floor(energy)}%</div>
        </div>
      </div>

      <div className="hud-top-right">
        <div className="score-container">
          <div className="score-label">得分</div>
          <div className="score-value">{Math.floor(score)}</div>
        </div>
      </div>

      <div className="hud-bottom-center">
        <div className="beat-indicator">
          {[0, 1, 2, 3].map((index) => {
            const isActive = index === beatIndex;
            const isNext = index === (beatIndex + 1) % 4;
            return (
              <div
                key={index}
                className={`beat-dot 
                  ${isActive ? 'beat-dot-active' : ''} 
                  ${isNext && beatProgress > 0.7 ? 'beat-dot-pending' : ''}
                `}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

HUD.displayName = 'HUD';

export default HUD;
