import React, { useRef } from 'react';

interface ToolbarProps {
  isPlaying: boolean;
  hasAudio: boolean;
  hasMarkers: boolean;
  onLoadAudio: () => void;
  onPlayPause: () => void;
  onSave: () => void;
  onLoad: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isPlaying,
  hasAudio,
  hasMarkers,
  onLoadAudio,
  onPlayPause,
  onSave,
  onLoad,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadAudio();
    }
  };

  const handleLoadSequenceClick = () => {
    loadInputRef.current?.click();
  };

  const handleSequenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad();
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const buttonHoverStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  };

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
        onClick={handleLoadClick}
        style={buttonStyle}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>📁</span>
        加载音频
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button
        onClick={onPlayPause}
        disabled={!hasAudio}
        style={{
          ...buttonStyle,
          backgroundColor: hasAudio ? '#e94560' : 'rgba(255, 255, 255, 0.05)',
          borderColor: hasAudio ? '#e94560' : 'rgba(255, 255, 255, 0.1)',
          cursor: hasAudio ? 'pointer' : 'not-allowed',
          opacity: hasAudio ? 1 : 0.5,
        }}
        onMouseEnter={(e) => {
          if (hasAudio) {
            e.currentTarget.style.backgroundColor = '#ff6b8a';
          }
        }}
        onMouseLeave={(e) => {
          if (hasAudio) {
            e.currentTarget.style.backgroundColor = '#e94560';
          }
        }}
      >
        <span style={{ fontSize: '18px' }}>{isPlaying ? '⏸' : '▶'}</span>
        {isPlaying ? '暂停' : '播放'}
      </button>

      <button
        onClick={onSave}
        disabled={!hasMarkers}
        style={{
          ...buttonStyle,
          cursor: hasMarkers ? 'pointer' : 'not-allowed',
          opacity: hasMarkers ? 1 : 0.5,
        }}
        onMouseEnter={(e) => {
          if (hasMarkers) Object.assign(e.currentTarget.style, buttonHoverStyle);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>💾</span>
        保存方案
      </button>

      <button
        onClick={handleLoadSequenceClick}
        style={buttonStyle}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>📂</span>
        加载方案
      </button>
      <input
        ref={loadInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleSequenceFileChange}
      />

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
