import React, { useState, useEffect } from 'react';

interface UIOverlayProps {
  fps: number;
  particleCount: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ fps, particleCount }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1400);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
    fontFamily: 'monospace',
  };

  const topLeftStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    color: '#C5C6C7',
    fontSize: isSmallScreen ? '12px' : '14px',
    textShadow: '0 0 10px rgba(0,0,0,0.8)',
    lineHeight: 1.6,
    letterSpacing: '0.5px',
  };

  const bottomRightStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    color: '#C5C6C7',
    fontSize: isSmallScreen ? '12px' : '14px',
    textShadow: '0 0 10px rgba(0,0,0,0.8)',
    textAlign: 'right',
    lineHeight: 1.6,
    letterSpacing: '0.5px',
  };

  const fpsColor = fps >= 50 ? '#66FCF1' : fps >= 30 ? '#FFD700' : '#FF6B6B';

  return (
    <div style={overlayStyle}>
      {!isSmallScreen && (
        <div style={topLeftStyle}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#66FCF1' }}>
            光影流沙 / Light & Shadow Sand
          </div>
          <div>━━━━━━━━━━━━━━━━━</div>
          <div>粒子总数 / Particles</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#66FCF1', marginTop: '4px' }}>
            {particleCount.toLocaleString()}
          </div>
        </div>
      )}

      {isSmallScreen && (
        <div style={{ ...topLeftStyle, top: '12px', left: '12px' }}>
          <div style={{ fontWeight: 'bold', color: '#66FCF1' }}>沙粒 {particleCount.toLocaleString()}</div>
        </div>
      )}

      {!isSmallScreen && (
        <div style={bottomRightStyle}>
          <div>━━━━━━━━━━━━━━━━━</div>
          <div>帧率 / FPS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: fpsColor, marginTop: '4px' }}>
            {fps}
            <span style={{ fontSize: '12px', color: '#C5C6C7', fontWeight: 'normal' }}> / 60</span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', opacity: 0.7 }}>
            拖拽旋转视角 · 滚轮缩放 · 点击产生涟漪
          </div>
        </div>
      )}

      {isSmallScreen && (
        <div style={{ ...bottomRightStyle, bottom: '12px', right: '12px' }}>
          <div style={{ fontWeight: 'bold', color: fpsColor }}>FPS {fps}</div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
