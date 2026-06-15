import React from 'react';

interface GlobalSettingsProps {
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ paused, onTogglePause, onReset }) => {
  return (
    <div style={{
      width: '240px',
      background: '#1e293b',
      borderRadius: '12px',
      padding: '16px',
      position: 'fixed',
      right: '20px',
      top: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 100
    }}>
      <h3 style={{ color: '#fff', fontSize: '16px', margin: '0 0 4px 0', fontWeight: 600 }}>全局设置</h3>
      <button
        onClick={onTogglePause}
        style={{
          width: '100%',
          height: '40px',
          background: '#3b82f6',
          color: '#fff',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease-out',
          fontWeight: 500
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
      >
        {paused ? '继续' : '暂停'}
      </button>
      <button
        onClick={onReset}
        style={{
          width: '100%',
          height: '40px',
          background: '#ef4444',
          color: '#fff',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease-out',
          fontWeight: 500
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
      >
        重置
      </button>
    </div>
  );
};
