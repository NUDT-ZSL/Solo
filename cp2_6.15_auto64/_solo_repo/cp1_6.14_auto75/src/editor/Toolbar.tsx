import React from 'react';

interface Props {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
}

const Toolbar: React.FC<Props> = ({ isPlaying, onPlay, onStop, onExport }) => {
  return (
    <div style={{
      height: '56px',
      background: '#161b22',
      borderBottom: '1px solid #30363d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#ffffff',
          letterSpacing: '0.5px',
        }}>
          2D 平台关卡编辑器
        </span>
        {isPlaying && (
          <span style={{
            fontSize: '12px',
            color: '#2ecc71',
            background: 'rgba(46, 204, 113, 0.15)',
            padding: '2px 10px',
            borderRadius: '10px',
          }}>
            预览中
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isPlaying ? (
          <button
            onClick={onStop}
            style={{
              width: '120px',
              height: '40px',
              borderRadius: '20px',
              border: 'none',
              background: '#e74c3c',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            ■ 停止
          </button>
        ) : (
          <button
            onClick={onPlay}
            style={{
              width: '120px',
              height: '40px',
              borderRadius: '20px',
              border: 'none',
              background: '#2ecc71',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            ▶ 试玩
          </button>
        )}
        <button
          onClick={onExport}
          style={{
            width: '100px',
            height: '36px',
            borderRadius: '6px',
            border: 'none',
            background: '#8b5cf6',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          导出
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
