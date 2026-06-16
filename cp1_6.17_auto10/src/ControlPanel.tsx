import React from 'react';
import { PetAction, PetStats } from './types';

interface ControlPanelProps {
  onAction: (action: PetAction) => void;
  stats: PetStats;
  isDead: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onAction, stats, isDead }) => {
  const canUseMedicine = stats.health < 50;

  return (
    <div className="control-panel">
      <button
        className="pixel-btn"
        onClick={() => onAction(PetAction.FEED)}
        disabled={isDead}
      >
        喂食
      </button>
      <button
        className="pixel-btn"
        onClick={() => onAction(PetAction.PLAY)}
        disabled={isDead}
      >
        玩耍
      </button>
      <button
        className="pixel-btn"
        onClick={() => onAction(PetAction.CLEAN)}
        disabled={isDead}
      >
        清洁
      </button>
      <button
        className="pixel-btn"
        style={{
          opacity: canUseMedicine && !isDead ? 1 : 0.5,
          cursor: canUseMedicine && !isDead ? 'pointer' : 'not-allowed',
        }}
        onClick={() => canUseMedicine && !isDead && onAction(PetAction.MEDICINE)}
        disabled={!canUseMedicine || isDead}
      >
        急救包
      </button>
    </div>
  );
};

export default ControlPanel;
