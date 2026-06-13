import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { SoundType, PlantStage } from '../game/GameEngine';
import { MOOD_COLORS } from '../game/GameEngine';

interface PanelProps {
  canWater: boolean;
  waterCooldownMs: number;
  lightLevel: number;
  activeSound: SoundType;
  mood: number;
  plantStage: PlantStage;
  growthPercent: number;
  isMeditating: boolean;
  meditationRemaining: number;
  onWater: () => void;
  onLightChange: (value: number) => void;
  onSoundToggle: () => void;
  onMeditate: () => void;
}

const SOUND_LABELS: Record<SoundType, string> = {
  none: '关闭',
  rain: '雨声',
  stream: '溪流',
  wind: '风声',
};

const STAGE_LABELS: Record<PlantStage, string> = {
  seed: '种子',
  sprout: '萌芽',
  stem: '长茎',
  bud: '含苞',
  bloom: '开花',
};

const WaterDropIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const MeditationIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <path d="M12 8v4" />
    <path d="M8 12l-3 8h14l-3-8" />
    <path d="M9 12l-1 4" />
    <path d="M15 12l1 4" />
  </svg>
);

export const Panel: React.FC<PanelProps> = ({
  canWater,
  waterCooldownMs,
  lightLevel,
  activeSound,
  mood,
  plantStage,
  growthPercent,
  isMeditating,
  meditationRemaining,
  onWater,
  onLightChange,
  onSoundToggle,
  onMeditate,
}) => {
  const [waterScale, setWaterScale] = useState(1);
  const waterTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleWater = useCallback(() => {
    if (!canWater) return;
    setWaterScale(0.9);
    if (waterTimeoutRef.current) clearTimeout(waterTimeoutRef.current);
    waterTimeoutRef.current = setTimeout(() => {
      setWaterScale(1.0);
    }, 100);
    onWater();
  }, [canWater, onWater]);

  useEffect(() => {
    return () => {
      if (waterTimeoutRef.current) clearTimeout(waterTimeoutRef.current);
    };
  }, []);

  const moodColor = MOOD_COLORS[plantStage];
  const moodPercent = Math.round(mood * 100);

  return (
    <div className={`panel-container ${isMeditating ? 'panel-meditating' : ''}`}>
      <div className="panel-section">
        <div className="panel-label">照料植物</div>
        <button
          className="water-btn"
          onClick={handleWater}
          disabled={!canWater}
          style={{
            transform: `scale(${waterScale})`,
            opacity: canWater ? 1 : 0.5,
            transition: 'transform 0.1s ease',
          }}
        >
          <WaterDropIcon />
          <span>{canWater ? '浇水' : `冷却 ${Math.ceil(waterCooldownMs / 1000)}s`}</span>
        </button>
        <div className="panel-hint">每次浇水间隔5秒</div>
      </div>

      <div className="panel-section">
        <div className="panel-label">光照调节</div>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={lightLevel}
            onChange={(e) => onLightChange(Number(e.target.value))}
            className="light-slider"
          />
          <div className="slider-value">{lightLevel}</div>
        </div>
        <div className="panel-hint">拖动调节光照强度</div>
      </div>

      <div className="panel-section">
        <div className="panel-label">禅意音景</div>
        <button className="sound-btn" onClick={onSoundToggle}>
          <span className={`sound-dot ${activeSound !== 'none' ? 'sound-dot-active' : ''}`} />
          <span>{SOUND_LABELS[activeSound]}</span>
        </button>
        <div className="panel-hint">点击切换环境音效</div>
      </div>

      <div className="panel-section">
        <div className="panel-label">心情指示</div>
        <div className="mood-bar-container">
          <div
            className="mood-bar-fill"
            style={{
              width: `${moodPercent}%`,
              backgroundColor: moodColor,
            }}
          />
        </div>
        <div className="panel-hint">
          {STAGE_LABELS[plantStage]} · {Math.round(growthPercent)}%
        </div>
      </div>

      <button
        className={`meditate-btn ${isMeditating ? 'meditate-active' : ''}`}
        onClick={onMeditate}
        title={isMeditating ? `禅定中 (${meditationRemaining}s)` : '进入禅定模式'}
      >
        <MeditationIcon />
      </button>
    </div>
  );
};
