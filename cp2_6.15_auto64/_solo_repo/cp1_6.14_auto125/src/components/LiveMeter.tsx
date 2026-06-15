import React, { useMemo, useEffect, useState, useCallback } from 'react';
import type { Emotions, EmotionKey } from '../types';
import { getDominantEmotion } from '../utils/Simulator';

interface LiveMeterProps {
  averageEmotions: Emotions;
}

const EMOTION_COLORS: Record<EmotionKey, string> = {
  joy: '#fbbf24',
  fear: '#ef4444',
  anger: '#f97316',
  surprise: '#38bdf8'
};

const EMOTION_EMOJIS: Record<EmotionKey, string> = {
  joy: '😊',
  fear: '😨',
  anger: '😠',
  surprise: '😮'
};

const EMOTION_LABELS: Record<EmotionKey, string> = {
  joy: '高兴',
  fear: '恐惧',
  anger: '愤怒',
  surprise: '惊喜'
};

const ARC_WIDTH = 24;
const SIZE = 200;
const STEPS = 6;

const LiveMeter: React.FC<LiveMeterProps> = React.memo(({ averageEmotions }) => {
  const [displayValue, setDisplayValue] = useState(0);

  const { dominantKey, percentage } = useMemo(() => {
    const dominant = getDominantEmotion(averageEmotions);
    const total = Math.abs(averageEmotions.joy) + Math.abs(averageEmotions.fear) +
      Math.abs(averageEmotions.anger) + Math.abs(averageEmotions.surprise);
    const pct = total > 0 ? (Math.abs(dominant.value) / (total / 4)) * 100 : 0;
    const steppedPct = Math.round(pct / (100 / STEPS)) * (100 / STEPS);
    return {
      dominantKey: dominant.key,
      percentage: Math.min(steppedPct, 100)
    };
  }, [averageEmotions]);

  const animateTo = useCallback((endValue: number) => {
    const startValue = displayValue;
    const startTime = performance.now();
    const duration = 500;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [displayValue]);

  useEffect(() => {
    animateTo(percentage);
  }, [percentage]);

  const radius = useMemo(() => (SIZE - ARC_WIDTH) / 2, []);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const progress = useMemo(() => (displayValue / 100) * circumference, [displayValue, circumference]);

  const emotionBars = useMemo(() => {
    return (Object.keys(EMOTION_EMOJIS) as EmotionKey[]).map(key => {
      const val = averageEmotions[key];
      const pct = ((val + 1) / 2) * 100;
      return { key, val, pct };
    });
  }, [averageEmotions]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">主导情绪</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '16px',
          minHeight: 0
        }}
      >
        <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={ARC_WIDTH}
              strokeLinecap="round"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              fill="none"
              stroke={EMOTION_COLORS[dominantKey]}
              strokeWidth={ARC_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              style={{ transition: 'stroke 0.3s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '4px' }}>
              {EMOTION_EMOJIS[dominantKey]}
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#f1f5f9',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {Math.round(displayValue)}%
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {EMOTION_LABELS[dominantKey]}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          {emotionBars.map(({ key, val, pct }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px'
              }}
            >
              <span style={{ fontSize: '16px' }}>{EMOTION_EMOJIS[key]}</span>
              <span style={{ color: '#94a3b8', width: '32px' }}>{EMOTION_LABELS[key]}</span>
              <div
                style={{
                  flex: 1,
                  height: '6px',
                  backgroundColor: '#334155',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: EMOTION_COLORS[key],
                    width: `${pct}%`,
                    transition: 'width 0.5s ease',
                    borderRadius: '3px'
                  }}
                />
              </div>
              <span
                style={{
                  color: '#64748b',
                  width: '36px',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {val.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

LiveMeter.displayName = 'LiveMeter';

export default LiveMeter;
