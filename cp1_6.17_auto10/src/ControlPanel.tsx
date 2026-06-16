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
    <div style={styles.container}>
      <button
        style={styles.button}
        onClick={() => onAction(PetAction.FEED)}
        disabled={isDead}
      >
        喂食
      </button>
      <button
        style={styles.button}
        onClick={() => onAction(PetAction.PLAY)}
        disabled={isDead}
      >
        玩耍
      </button>
      <button
        style={styles.button}
        onClick={() => onAction(PetAction.CLEAN)}
        disabled={isDead}
      >
        清洁
      </button>
      <button
        style={{
          ...styles.button,
          opacity: canUseMedicine && !isDead ? 1 : 0.5,
          cursor: canUseMedicine && !isDead ? 'pointer' : 'not-allowed',
        }}
        onClick={() => canUseMedicine && !isDead && onAction(PetAction.MEDICINE)}
        disabled={!canUseMedicine || isDead}
      >
        急救包
      </button>
      <style>{`
        .pixel-btn:hover:not(:disabled) {
          background-color: #5A8A3C !important;
        }
        .pixel-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        @media (max-width: 480px) {
          .control-panel {
            flex-wrap: wrap !important;
          }
          .control-panel button {
            width: 45% !important;
            margin: 4px !important;
            font-size: 0.8em !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'nowrap',
    marginTop: '16px',
  },
  button: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '10px',
    padding: '12px 16px',
    background: '#306230',
    color: '#8BAC0F',
    border: '3px solid #0F380F',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    borderRadius: 0,
  },
};

export default ControlPanel;
