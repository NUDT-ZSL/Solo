import React from 'react';

export type PlayState = 'idle' | 'playing' | 'paused' | 'complete';

interface InputPanelProps {
  wishText: string;
  onWishChange: (text: string) => void;
  playState: PlayState;
  onPlayPause: () => void;
  onReset: () => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  wishText,
  onWishChange,
  playState,
  onPlayPause,
  onReset,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        padding: '20px 24px 28px',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
        <input
          type="text"
          value={wishText}
          onChange={(e) => onWishChange(e.target.value.slice(0, 30))}
          placeholder="输入祝福文字（最多30字）"
          maxLength={30}
          style={{
            width: '100%',
            padding: '12px 18px',
            paddingRight: 54,
            fontSize: 14,
            fontFamily: '"Poppins", "Montserrat", sans-serif',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 999,
            color: '#fff',
            outline: 'none',
            transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
            caretColor: '#ffd700',
            letterSpacing: 0.5,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 215, 0, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            color: wishText.length >= 30 ? '#ff6b6b' : 'rgba(255,255,255,0.4)',
            fontFamily: '"Poppins", sans-serif',
            pointerEvents: 'none',
          }}
        >
          {wishText.length}/30
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          onClick={onPlayPause}
          disabled={playState === 'complete'}
          title={
            playState === 'idle' ? '开始' :
            playState === 'playing' ? '暂停' :
            playState === 'paused' ? '继续' : '完成'
          }
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: 'none',
            cursor: playState === 'complete' ? 'not-allowed' : 'pointer',
            background: playState === 'complete'
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
            opacity: playState === 'complete' ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (playState !== 'complete') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255,215,0,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = playState === 'complete'
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255,255,255,0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            if (playState !== 'complete') e.currentTarget.style.transform = 'scale(0.94)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {playState === 'idle' || playState === 'paused' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2 }}>
              <path d="M8 5L19 12L8 19V5Z" fill="rgba(255,255,255,0.95)" />
            </svg>
          ) : playState === 'playing' ? (
            <svg width="16" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="rgba(255,255,255,0.95)" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="rgba(255,255,255,0.95)" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="#ffd700" />
            </svg>
          )}
        </button>

        <button
          onClick={onReset}
          title="重置"
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(138, 138, 138, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.94)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V2L8 6L12 10V7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.87 8.13 19 12 19C15.87 19 19 15.87 19 12C19 8.13 15.87 5 12 5Z"
              fill="rgba(255,255,255,0.8)"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
