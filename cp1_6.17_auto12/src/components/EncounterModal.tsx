import React from 'react';
import type { VoyageEvent, Ship } from '../types';
import { calculatePlayerPower, calculateWinRate } from '../GameEngine';

interface EncounterModalProps {
  event: VoyageEvent;
  ship: Ship;
  onResolve: (action: 'fight' | 'flee') => void;
}

const EncounterModal: React.FC<EncounterModalProps> = ({ event, ship, onResolve }) => {
  const playerPower = calculatePlayerPower(ship);
  const piratePower = event.piratePower ?? 0;
  const winRate = calculateWinRate(playerPower, piratePower);
  const maxPower = Math.max(playerPower, piratePower, 1);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={() => onResolve('flee')}>×</button>

        <h2 style={styles.title}>☠️ 海盗来袭！</h2>

        <div style={styles.battleContainer}>
          <div style={styles.battleInner}>
            <div style={styles.powerSection}>
              <div style={styles.powerLabel}>
                <span>🚢 己方战力</span>
                <span>{playerPower}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.playerBar, width: `${(playerPower / maxPower) * 100}%` }} />
              </div>
            </div>

            <div style={styles.powerSection}>
              <div style={styles.powerLabel}>
                <span>🏴‍☠️ 海盗战力</span>
                <span>{piratePower}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.pirateBar, width: `${(piratePower / maxPower) * 100}%` }} />
              </div>
            </div>

            <div style={styles.winRateSection}>
              <div style={styles.winRateLabel}>胜率: {Math.round(winRate * 100)}%</div>
              <div style={styles.winRateTrack}>
                <div style={{ ...styles.winRateMarker, left: `${winRate * 100}%` }} />
              </div>
            </div>
          </div>

          <div style={styles.redFlash} />
        </div>

        <div style={styles.actions}>
          <button className="encounter-fight-btn" style={styles.fightBtn} onClick={() => onResolve('fight')}>⚔️ 战斗</button>
          <button className="encounter-flee-btn" style={styles.fleeBtn} onClick={() => onResolve('flee')}>🏃 逃离</button>
        </div>
      </div>

      <style>{keyframes}</style>
    </div>
  );
};

const keyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
@keyframes redFlash {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.3; }
}
.encounter-fight-btn:hover { background: #FF6B6B !important; }
.encounter-fight-btn:active { transform: scale(0.95); }
.encounter-flee-btn:hover { background: #5A9FBD !important; }
.encounter-flee-btn:active { transform: scale(0.95); }
`;

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#00000080',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'linear-gradient(135deg, #8B6914 0%, #A0783C 25%, #6B4F1A 50%, #8B6914 75%, #A0783C 100%)',
    border: '3px solid #D4A373',
    borderRadius: 8,
    padding: 24,
    maxWidth: 420,
    width: '90%',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 12,
    background: 'none',
    border: 'none',
    color: '#F1FAEE',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
  },
  title: {
    color: '#F1FAEE',
    fontFamily: 'Cinzel, serif',
    fontSize: 24,
    textAlign: 'center' as const,
    margin: 0,
    marginBottom: 16,
  },
  battleContainer: {
    animation: 'shake 0.3s infinite',
    position: 'relative' as const,
  },
  battleInner: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  redFlash: {
    position: 'absolute' as const,
    inset: 0,
    background: '#FF0000',
    animation: 'redFlash 0.3s infinite',
    pointerEvents: 'none' as const,
    borderRadius: 4,
  },
  powerSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    position: 'relative' as const,
    zIndex: 1,
  },
  powerLabel: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    color: '#F1FAEE',
    fontSize: 14,
    fontWeight: 'bold',
  },
  barTrack: {
    height: 12,
    background: '#00000040',
    borderRadius: 6,
    overflow: 'hidden',
  },
  playerBar: {
    height: '100%',
    background: '#2ECC71',
    borderRadius: 6,
    transition: 'width 0.3s ease',
  },
  pirateBar: {
    height: '100%',
    background: '#E74C3C',
    borderRadius: 6,
    transition: 'width 0.3s ease',
  },
  winRateSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    position: 'relative' as const,
    zIndex: 1,
  },
  winRateLabel: {
    color: '#F1FAEE',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  winRateTrack: {
    height: 12,
    background: 'linear-gradient(to right, #2ECC71, #E74C3C)',
    borderRadius: 6,
    position: 'relative' as const,
  },
  winRateMarker: {
    position: 'absolute' as const,
    top: -3,
    width: 4,
    height: 18,
    background: '#F1FAEE',
    borderRadius: 2,
    transform: 'translateX(-50%)',
    transition: 'left 0.3s ease',
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 20,
    position: 'relative' as const,
    zIndex: 1,
  },
  fightBtn: {
    flex: 1,
    padding: '10px 0',
    background: '#E63946',
    color: '#F1FAEE',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  fleeBtn: {
    flex: 1,
    padding: '10px 0',
    background: '#457B9D',
    color: '#F1FAEE',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default EncounterModal;
