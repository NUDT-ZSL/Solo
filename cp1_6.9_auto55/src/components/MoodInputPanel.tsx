import React, { useCallback, useRef, useState } from 'react';
import type { MoodType, MoodRecord } from '../types';
import { MOOD_EMOJIS, MOOD_LABELS, MOOD_COLORS } from '../types';
import { hexToRgba } from '../utils/moodColors';
import { formatDate, getToday } from '../utils/dateUtils';
import MoodShape from './MoodShape';

interface MoodInputPanelProps {
  onAddMood: (mood: MoodType, text: string, buttonEl: HTMLElement) => Promise<MoodRecord | null>;
  autoFocus?: boolean;
}

const MOODS: MoodType[] = ['happy', 'calm', 'melancholy', 'anger', 'anxiety'];

export const MoodInputPanel: React.FC<MoodInputPanelProps> = ({ onAddMood, autoFocus = true }) => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flyingCapsule, setFlyingCapsule] = useState<{
    record: MoodRecord;
    startX: number;
    startY: number;
    targetDate: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRefs = useRef<Record<MoodType, HTMLButtonElement | null>>({
    happy: null,
    calm: null,
    melancholy: null,
    anger: null,
    anxiety: null,
  });

  const todayStr = formatDate(getToday());

  const handleMoodClick = useCallback((mood: MoodType, btnEl: HTMLButtonElement | null) => {
    if (isSubmitting) return;
    setSelectedMood(mood);
    setTimeout(() => {
      if (inputRef.current && autoFocus) {
        inputRef.current.focus();
      }
    }, 50);
  }, [isSubmitting, autoFocus]);

  const handleSubmit = useCallback(async () => {
    if (!selectedMood || isSubmitting) return;
    const btnEl = buttonRefs.current[selectedMood];
    if (!btnEl) return;

    setIsSubmitting(true);
    try {
      const record = await onAddMood(selectedMood, inputText, btnEl);
      if (record) {
        const rect = btnEl.getBoundingClientRect();
        setFlyingCapsule({
          record,
          startX: rect.left + rect.width / 2,
          startY: rect.top + rect.height / 2,
          targetDate: todayStr,
        });

        setInputText('');
        setSelectedMood(null);

        setTimeout(() => {
          setFlyingCapsule(null);
        }, 320);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMood, inputText, isSubmitting, onAddMood, todayStr]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setSelectedMood(null);
      setInputText('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        animation: 'float-in 0.6s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {MOODS.map((mood) => {
          const color = MOOD_COLORS[mood];
          const isSelected = selectedMood === mood;

          return (
            <button
              key={mood}
              ref={(el) => { buttonRefs.current[mood] = el; }}
              onClick={(e) => handleMoodClick(mood, e.currentTarget)}
              disabled={isSubmitting}
              title={MOOD_LABELS[mood]}
              style={{
                position: 'relative',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: hexToRgba(color, isSelected ? 0.45 : 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                lineHeight: 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                boxShadow: isSelected
                  ? `0 0 0 3px ${hexToRgba(color, 0.5)}, 0 0 18px 4px ${hexToRgba(color, 0.35)}`
                  : 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                border: `1px solid ${hexToRgba(color, 0.35)}`,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isSelected) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.boxShadow = `0 0 10px 4px ${hexToRgba('#FFD700', 0.25)}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <span style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {MOOD_EMOJIS[mood]}
              </span>
            </button>
          );
        })}
      </div>

      {selectedMood && (
        <div
          style={{
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'fade-in 0.25s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              color: MOOD_COLORS[selectedMood],
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 20 }}>{MOOD_EMOJIS[selectedMood]}</span>
            <span>此刻的心情是「{MOOD_LABELS[selectedMood]}」</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--bg-card)',
              borderRadius: 14,
              border: `1px solid ${hexToRgba(MOOD_COLORS[selectedMood], 0.25)}`,
              boxShadow: `0 4px 24px ${hexToRgba(MOOD_COLORS[selectedMood], 0.08)}`,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 50))}
              onKeyDown={handleKeyDown}
              placeholder={`写点什么...（最多50字）`}
              style={{
                flex: 1,
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 15,
                lineHeight: '24px',
                minHeight: 24,
              }}
              maxLength={50}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: inputText.length > 45 ? 'var(--mood-anger)' : 'var(--text-muted)',
                  alignSelf: 'flex-end',
                  marginBottom: 3,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {inputText.length}/50
              </span>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${MOOD_COLORS[selectedMood]} 0%, ${hexToRgba(MOOD_COLORS[selectedMood], 0.7)} 100%)`,
                  color: '#1E1E2E',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'all 0.18s ease',
                  transform: isSubmitting ? 'scale(0.97)' : 'scale(1)',
                  letterSpacing: 0.5,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                    e.currentTarget.style.boxShadow = `0 6px 18px ${hexToRgba(MOOD_COLORS[selectedMood], 0.35)}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isSubmitting ? '保存中...' : '存入胶囊'}
              </button>
            </div>
          </div>
        </div>
      )}

      {flyingCapsule && (
        <FlyingCapsule
          key={flyingCapsule.record.id}
          record={flyingCapsule.record}
          startX={flyingCapsule.startX}
          startY={flyingCapsule.startY}
        />
      )}
    </div>
  );
};

interface FlyingCapsuleProps {
  record: MoodRecord;
  startX: number;
  startY: number;
}

const FlyingCapsule: React.FC<FlyingCapsuleProps> = ({ record, startX, startY }) => {
  const [pos, setPos] = useState({ x: 0, y: 0, scale: 1, opacity: 0.8 });
  const animRef = useRef<number | null>(null);

  React.useEffect(() => {
    const targetEl = document.querySelector<HTMLElement>(`[data-date-slot="${record.date}"]`);
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const startPosX = startX - window.innerWidth / 2;
    const startPosY = startY - window.innerHeight / 2;
    const endPosX = endX - window.innerWidth / 2;
    const endPosY = endY - window.innerHeight / 2;

    const duration = 300;
    const startTime = performance.now();

    const animate = (ts: number) => {
      const elapsed = ts - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);

      const midY = Math.min(startPosY, endPosY) - 50;
      const oneMinusT = 1 - easeT;

      const x = oneMinusT * oneMinusT * startPosX + 2 * oneMinusT * easeT * ((startPosX + endPosX) / 2) + easeT * easeT * endPosX;
      const y = oneMinusT * oneMinusT * startPosY + 2 * oneMinusT * easeT * midY + easeT * easeT * endPosY;
      const scale = 1 + Math.sin(t * Math.PI) * 0.2;
      const opacity = t < 0.1 ? t * 10 : t > 0.9 ? (1 - t) * 10 : 1;

      setPos({ x, y, scale, opacity });

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [record.date, startX, startY]);

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${pos.scale})`,
        opacity: pos.opacity,
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'var(--bg-card)',
          border: `1px solid ${hexToRgba(MOOD_COLORS[record.mood], 0.45)}`,
          boxShadow: `0 10px 30px ${hexToRgba(MOOD_COLORS[record.mood], 0.35)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{MOOD_EMOJIS[record.mood]}</span>
        <MoodShape shape={record.shape} mood={record.mood} size={32} />
      </div>
    </div>
  );
};

export default MoodInputPanel;
