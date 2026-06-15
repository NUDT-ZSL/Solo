import React, { useState, useEffect } from 'react';
import { BeatEvent } from '../audio-engine';
import { eventBus } from '../event-bus';

interface HUDProps {
  score: number;
  lives: number;
  wave: number;
  bpm: number;
}

export const HUD: React.FC<HUDProps> = ({ score, lives, wave, bpm }) => {
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [beatPulsing, setBeatPulsing] = useState(false);

  useEffect(() => {
    const unsub1 = eventBus.on('enemy_die', () => {
      setScoreAnimating(true);
      setTimeout(() => setScoreAnimating(false), 300);
    });

    const unsub2 = eventBus.on('beat_tick', (e: BeatEvent) => {
      setBeatPulsing(true);
      setTimeout(() => setBeatPulsing(false), 100);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          padding: '16px 20px',
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '12px',
          fontFamily: "'Courier New', monospace",
          fontSize: '16px',
          color: '#00ff88',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: '180px',
        }}
      >
        <div
          style={{
            fontSize: '20px',
            marginBottom: '8px',
            animation: scoreAnimating ? 'scoreJump 0.3s ease' : 'none',
          }}
        >
          ❤️ {lives}
        </div>
        <div
          style={{
            fontSize: '20px',
            animation: scoreAnimating ? 'scoreJump 0.3s ease' : 'none',
          }}
        >
          🏆 {score}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 20px',
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '12px',
          fontFamily: "'Courier New', monospace",
          fontSize: '16px',
          color: '#00ff88',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: '180px',
          textAlign: 'right',
        }}
      >
        <div style={{ fontSize: '20px', marginBottom: '8px' }}>
          🌊 Wave {wave}
        </div>
        <div style={{ fontSize: '20px' }}>
          🎵 {bpm} BPM
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: beatPulsing ? '#ffffff' : '#2a2a3a',
            border: '2px solid #00ff88',
            transform: beatPulsing ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.1s ease',
            boxShadow: beatPulsing ? '0 0 20px #00ff88' : 'none',
          }}
        />
      </div>
    </>
  );
};

export default HUD;
