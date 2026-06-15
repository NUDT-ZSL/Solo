import React from 'react';

interface ToolbarProps {
  isPlaying: boolean;
  hasAudio: boolean;
  hasMarkers: boolean;
  onLoadAudio: () => void;
  onPlayPause: () => void;
  onSave: () => void;
  onLoad: () => void;
}

const buttonBase: React.CSSProperties = {
  padding: '10px 20px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  outline: 'none',
};

export const Toolbar: React.FC<ToolbarProps> = ({
  isPlaying,
  hasAudio,
  hasMarkers,
  onLoadAudio,
  onPlayPause,
  onSave,
  onLoad,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        backgroundColor: '#16213e',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={onLoadAudio}
        style={buttonBase}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ fontSize: '18px' }}>📁</span>
        加载音频
      </button>

      <button
        onClick={onPlayPause}
        disabled={!hasAudio}
        style={{
          ...buttonBase,
          backgroundColor: hasAudio ? '#e94560' : 'rgba(255, 255, 255, 0.05)',
          borderColor: hasAudio ? '#e94560' : 'rgba(255, 255, 255, 0.1)',
          cursor: hasAudio ? 'pointer' : 'not-allowed',
          opacity: hasAudio ? 1 : 0.5,
        }}
        onMouseEnter={(e) => { if (hasAudio) e.currentTarget.style.backgroundColor = '#ff6b8a'; }}
        onMouseLeave={(e) => { if (hasAudio) e.currentTarget.style.backgroundColor = '#e94560'; }}
      >
        <span style={{ fontSize: '18px' }}>{isPlaying ? '⏸' : '▶'}</span>
        {isPlaying ? '暂停' : '播放'}
      </button>

      <button
        onClick={onSave}
        disabled={!hasMarkers}
        style={{
          ...buttonBase,
          cursor: hasMarkers ? 'pointer' : 'not-allowed',
          opacity: hasMarkers ? 1 : 0.5,
        }}
        onMouseEnter={(e) => { if (hasMarkers) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ fontSize: '18px' }}>💾</span>
        保存方案
      </button>

      <button
        onClick={onLoad}
        style={buttonBase}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ fontSize: '18px' }}>📂</span>
        加载方案
      </button>

      <div
        style={{
          marginLeft: 'auto',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '13px',
          fontStyle: 'italic',
        }}
      >
        点击波形区域添加节奏标记点，拖拽可调整位置
      </div>
    </div>
  );
};

export default Toolbar;
