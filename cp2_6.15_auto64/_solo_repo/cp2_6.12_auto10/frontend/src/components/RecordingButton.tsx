import React from 'react';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';

interface RecordingButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({
  isRecording,
  isProcessing,
  isSupported,
  onStart,
  onStop,
  disabled = false
}) => {
  if (!isSupported) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '20px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <MicOff size={36} color="#92400E" />
        </div>
        <p style={{ color: '#92400E', fontSize: '0.9rem', fontWeight: 500, textAlign: 'center', maxWidth: '280px' }}>
          您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={disabled || isProcessing}
        className={isRecording ? 'animate-pulse-recording' : ''}
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          border: 'none',
          cursor: (disabled || isProcessing) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: isProcessing
            ? 'linear-gradient(135deg, #93C5FD, #60A5FA)'
            : isRecording
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
          boxShadow: isRecording
            ? '0 8px 32px rgba(239, 68, 68, 0.4)'
            : isProcessing
              ? '0 8px 32px rgba(59, 130, 246, 0.3)'
              : '0 4px 20px rgba(30, 58, 95, 0.1)',
          opacity: (disabled || isProcessing) ? 0.8 : 1,
          transform: (disabled || isProcessing) ? 'scale(0.95)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isProcessing && !isRecording) {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(30, 58, 95, 0.18)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isProcessing && !isRecording) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(30, 58, 95, 0.1)';
          }
        }}
      >
        {isProcessing ? (
          <Loader2 size={34} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />
        ) : isRecording ? (
          <Square size={30} color="#FFFFFF" fill="#FFFFFF" />
        ) : (
          <Mic size={34} color="#1E3A5F" />
        )}
      </button>
      <span style={{
        fontSize: '0.9rem',
        fontWeight: 600,
        color: isProcessing
          ? '#2563EB'
          : isRecording
            ? '#DC2626'
            : '#64748B'
      }}>
        {isProcessing ? '评分计算中...' : isRecording ? '点击停止录音' : disabled ? '等待系统回复...' : '点击开始录音'}
      </span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
