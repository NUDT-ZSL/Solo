import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Theme } from './theme';

interface PageProps {
  index: number;
  imageSrc: string;
  isActive: boolean;
  theme: Theme;
  totalPages: number;
}

const Page: React.FC<PageProps> = ({ index, imageSrc, isActive, theme, totalPages }) => {
  const [showGlow, setShowGlow] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShowGlow(true), 800);
      return () => clearTimeout(timer);
    } else {
      setShowGlow(false);
    }
  }, [isActive]);

  const playTone = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.5);
      gainNode.gain.linearRampToValueAtTime(0, now + 1);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 1);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  return (
    <div
      className="page-face"
      onTouchStart={handleTouchStart}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        backgroundColor: theme.pageBackground,
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 30px',
        boxShadow: `inset 0 0 30px ${theme.shadowColor}`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: theme.textColor,
          zIndex: 5,
          userSelect: 'none',
        }}
      >
        {index + 1} / {totalPages}
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: `0 4px 20px ${theme.shadowColor}`,
            backgroundColor: '#fff',
          }}
        >
          <img
            src={imageSrc}
            alt={`照片 ${index + 1}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
            draggable={false}
          />

          {showGlow && isActive && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  pointerEvents: 'none',
                  background: `radial-gradient(circle at 50% 50%, ${theme.glowColor.replace('0.3', '0.5')} 0%, ${theme.glowColor.replace('0.3', '0.2')} 40%, transparent 70%)`,
                  animation: 'breathe 4s ease-in-out infinite',
                  mixBlendMode: 'screen',
                  borderRadius: '6px',
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playTone();
                }}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                }}
                aria-label="播放音效"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={theme.primary}
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

interface BackSideProps {
  theme: Theme;
}

export const BackSide: React.FC<BackSideProps> = ({ theme }) => {
  return (
    <div
      className="page-back"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        backgroundColor: theme.pageBackground,
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: `inset 0 0 30px ${theme.shadowColor}`,
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 8px,
            ${theme.shadowColor.replace('0.4', '0.06')} 8px,
            ${theme.shadowColor.replace('0.4', '0.06')} 10px
          ),
          repeating-radial-gradient(
            circle at 0 50%,
            ${theme.shadowColor.replace('0.4', '0.08')} 0,
            ${theme.shadowColor.replace('0.4', '0.08')} 3px,
            transparent 3px,
            transparent 12px
          )
        `,
        backgroundSize: '100% 10px, 12px 24px',
      }}
    />
  );
};

export default Page;
