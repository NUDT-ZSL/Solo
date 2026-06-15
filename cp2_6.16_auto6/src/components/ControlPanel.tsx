import React, { useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useStore';

interface ControlPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ videoRef }) => {
  const {
    terrainScale,
    bumpDecay,
    colorBlendIntensity,
    setTerrainScale,
    setBumpDecay,
    setColorBlendIntensity,
    gesture,
  } = useAppStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [videoRef]);

  const sliderStyle = {
    width: '100%',
    height: '6px',
    borderRadius: '4px',
    background: '#333',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  } as React.CSSProperties;

  const sliderThumbStyle = `
    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #00e5ff;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
      transition: transform 0.2s ease;
    }
    .custom-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .custom-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #00e5ff;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
    }
  `;

  const gestureLabels: Record<string, string> = {
    open_palm: '✋ 张开手掌 - 隆起地形',
    fist: '✊ 握拳 - 凹陷地形',
    pointing: '☝️ 食指指向 - 放置标记',
    pinch: '🤏 捏合手势',
    none: '✋ 等待手势...',
  };

  return (
    <>
      <style>{sliderThumbStyle}</style>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: '240px',
            height: '180px',
            borderRadius: '12px',
            border: '2px solid #00bcd4',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 188, 212, 0.3)',
            background: '#000',
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: 'none',
            }}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={240}
            height={180}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>
        <div
          style={{
            marginTop: '10px',
            padding: '10px 14px',
            background: 'rgba(20, 20, 20, 0.8)',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#00e5ff',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {gestureLabels[gesture || 'none'] || gestureLabels.none}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '260px',
          background: 'rgba(20, 20, 20, 0.8)',
          borderRadius: '16px',
          padding: '18px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3
          style={{
            color: '#00e5ff',
            fontSize: '16px',
            marginBottom: '18px',
            fontWeight: 600,
            textAlign: 'center',
            letterSpacing: '1px',
          }}
        >
          ⚙️ 控制面板
        </h3>

        <div
          className="control-item"
          style={{
            marginBottom: '20px',
            padding: '12px',
            borderRadius: '10px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a2a3e';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <label
            style={{
              display: 'block',
              color: '#e0e0e0',
              fontSize: '13px',
              marginBottom: '10px',
              fontWeight: 500,
            }}
          >
            地形缩放
          </label>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={terrainScale}
            onChange={(e) => setTerrainScale(parseFloat(e.target.value))}
            className="custom-slider"
            style={sliderStyle}
          />
          <div
            style={{
              color: '#b2ebf2',
              fontSize: '14px',
              fontFamily: 'monospace',
              marginTop: '6px',
              textAlign: 'right',
            }}
          >
            {terrainScale.toFixed(1)}x
          </div>
        </div>

        <div
          className="control-item"
          style={{
            marginBottom: '20px',
            padding: '12px',
            borderRadius: '10px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a2a3e';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <label
            style={{
              display: 'block',
              color: '#e0e0e0',
              fontSize: '13px',
              marginBottom: '10px',
              fontWeight: 500,
            }}
          >
            隆起衰减系数
          </label>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={bumpDecay}
            onChange={(e) => setBumpDecay(parseFloat(e.target.value))}
            className="custom-slider"
            style={sliderStyle}
          />
          <div
            style={{
              color: '#b2ebf2',
              fontSize: '14px',
              fontFamily: 'monospace',
              marginTop: '6px',
              textAlign: 'right',
            }}
          >
            {bumpDecay.toFixed(2)}
          </div>
        </div>

        <div
          className="control-item"
          style={{
            marginBottom: '20px',
            padding: '12px',
            borderRadius: '10px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a2a3e';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <label
            style={{
              display: 'block',
              color: '#e0e0e0',
              fontSize: '13px',
              marginBottom: '10px',
              fontWeight: 500,
            }}
          >
            颜色混合强度
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={colorBlendIntensity}
            onChange={(e) => setColorBlendIntensity(parseInt(e.target.value))}
            className="custom-slider"
            style={sliderStyle}
          />
          <div
            style={{
              color: '#b2ebf2',
              fontSize: '14px',
              fontFamily: 'monospace',
              marginTop: '6px',
              textAlign: 'right',
            }}
          >
            {colorBlendIntensity}%
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '14px',
            marginTop: '14px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#888',
              lineHeight: '1.6',
            }}
          >
            <p style={{ marginBottom: '6px' }}>💡 操作提示：</p>
            <p>• 张开手掌 → 地形隆起</p>
            <p>• 握拳 → 地形凹陷</p>
            <p>• 另一只手食指 → 放置标记</p>
            <p>• 鼠标拖拽 → 旋转视角</p>
            <p>• 鼠标滚轮 → 缩放场景</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ControlPanel;
