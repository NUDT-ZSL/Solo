import React from 'react';
import type { PetState, MoodType } from '../GameEngine';
import { PALETTE } from '../GameEngine';

interface StatusBarProps {
  state: PetState;
  mood: MoodType;
}

const moodEmoji: Record<MoodType, string> = {
  happy: '😊',
  normal: '😐',
  sad: '😢',
};

interface BarConfig {
  icon: string;
  value: number;
  colorStart: string;
  colorEnd: string;
}

const ProgressBar: React.FC<BarConfig> = ({ icon, value, colorStart, colorEnd }) => {
  const percentage = Math.max(0, Math.min(100, value));
  const gradientId = `gradient-${icon}-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '12px' }}>{icon}</span>
      <div
        style={{
          width: '120px',
          height: '14px',
          borderRadius: '7px',
          backgroundColor: '#2a2a3e',
          overflow: 'hidden',
          border: '1px solid #0a0a1a',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${colorStart} 0%, ${colorEnd} 100%)`,
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

const StatusBar: React.FC<StatusBarProps> = ({ state, mood }) => {
  return (
    <div
      style={{
        backgroundColor: PALETTE.uiBg,
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontFamily: "'Press Start 2P', cursive",
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
        {moodEmoji[mood]}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <ProgressBar
            icon="❤️"
            value={state.happiness}
            colorStart={PALETTE.lightRed}
            colorEnd={PALETTE.darkRed}
          />
          <ProgressBar
            icon="🍖"
            value={state.hunger}
            colorStart={PALETTE.orange}
            colorEnd={PALETTE.darkOrange}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <ProgressBar
            icon="✨"
            value={state.cleanliness}
            colorStart={PALETTE.skyBlue}
            colorEnd={PALETTE.lightSky}
          />
          <ProgressBar
            icon="⚡"
            value={state.energy}
            colorStart={PALETTE.gold}
            colorEnd={PALETTE.darkGold}
          />
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
