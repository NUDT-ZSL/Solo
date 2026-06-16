import React from 'react';
import type { DiceType } from './GameLogic';
import './DicePanel.css';

interface DicePanelProps {
  dice: DiceType[];
  onDiceClick: (diceId: string) => void;
  onMerge: () => void;
  onPlaceGuard: () => void;
  selectedCount: number;
  canMerge: boolean;
  canPlace: boolean;
}

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
  };

  const positions = dotPositions[value] || [];

  return (
    <div className="dice-face">
      {positions.map((pos, idx) => (
        <div key={idx} className={`dice-dot ${pos}`} />
      ))}
    </div>
  );
};

const DicePanel: React.FC<DicePanelProps> = ({ dice, onDiceClick, onMerge, onPlaceGuard, selectedCount, canMerge, canPlace }) => {
  return (
    <div className="dice-panel">
      <div className="dice-container">
        {dice.map((die) => (
          <div
            key={die.id}
            className={`dice ${die.isSelected ? 'selected' : ''} ${die.isNew ? 'new' : ''} ${die.isMerging ? 'merging' : ''}`}
            onClick={() => onDiceClick(die.id)}
          >
            <div className="dice-inner">
              <DiceFace value={die.value} />
            </div>
            {die.isMerging && <div className="merge-glow" />}
          </div>
        ))}
      </div>
      <div className="panel-actions">
        <button
          className="place-button"
          onClick={onPlaceGuard}
          disabled={!canPlace}
        >
          放置守卫
        </button>
        <button
          className="merge-button"
          onClick={onMerge}
          disabled={!canMerge}
        >
          合成 ({selectedCount}/2)
        </button>
      </div>
    </div>
  );
};

export default DicePanel;
