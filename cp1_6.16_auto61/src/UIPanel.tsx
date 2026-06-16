import { useRef, useEffect, useState } from 'react';
import { BuildingStyle, getSkylineProfile, easeInOut } from './CityGenerator';
import type { Building } from './CityGenerator';

interface UIPanelProps {
  style: BuildingStyle;
  onStyleChange: (style: BuildingStyle) => void;
  density: number;
  onDensityChange: (density: number) => void;
  rotationSpeed: number;
  onRotationSpeedChange: (speed: number) => void;
  zoningEnabled: boolean;
  onZoningChange: (enabled: boolean) => void;
  buildings: Building[];
}

export default function UIPanel({
  style,
  onStyleChange,
  density,
  onDensityChange,
  rotationSpeed,
  onRotationSpeedChange,
  zoningEnabled,
  onZoningChange,
  buildings,
}: UIPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [oldProfile, setOldProfile] = useState<number[]>([]);
  const [newProfile, setNewProfile] = useState<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const [selectedButton, setSelectedButton] = useState<BuildingStyle>(style);

  useEffect(() => {
    const profile = getSkylineProfile(buildings, 300);
    setOldProfile(newProfile.length > 0 ? [...newProfile] : profile);
    setNewProfile(profile);
  }, [buildings, style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easedT = easeInOut(t);

      ctx.fillStyle = '#0D1218';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const padding = 10;
      const maxHeight = Math.max(...newProfile, ...oldProfile, 1);
      const scaleY = (canvas.height - padding * 2) / maxHeight;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < oldProfile.length; i++) {
        const x = (i / (oldProfile.length - 1)) * (canvas.width - padding * 2) + padding;
        const y = canvas.height - padding - oldProfile[i] * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < newProfile.length; i++) {
        const oldVal = oldProfile[i] || 0;
        const newVal = newProfile[i] || 0;
        const interpolated = oldVal + (newVal - oldVal) * easedT;
        const x = (i / (newProfile.length - 1)) * (canvas.width - padding * 2) + padding;
        const y = canvas.height - padding - interpolated * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [newProfile, oldProfile]);

  const handleStyleClick = (newStyle: BuildingStyle) => {
    setSelectedButton(newStyle);
    setTimeout(() => onStyleChange(newStyle), 100);
  };

  return (
    <div style={panelStyle}>
      <h2 style={titleStyle}>城市天际线对比</h2>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>建筑风格</h3>
        <div style={buttonGroupStyle}>
          <button
            onClick={() => handleStyleClick('modern')}
            style={{
              ...buttonStyle,
              ...(selectedButton === 'modern'
                ? {
                    backgroundColor: '#FFD54F',
                    color: '#0D1218',
                    transform: 'scale(1.05)',
                  }
                : {}),
            }}
          >
            现代风格
          </button>
          <button
            onClick={() => handleStyleClick('classical')}
            style={{
              ...buttonStyle,
              ...(selectedButton === 'classical'
                ? {
                    backgroundColor: '#FFD54F',
                    color: '#0D1218',
                    transform: 'scale(1.05)',
                  }
                : {}),
            }}
          >
            古典欧洲风格
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>分区模式</h3>
        <button
          onClick={() => onZoningChange(!zoningEnabled)}
          style={{
            ...buttonStyle,
            width: '100%',
            ...(zoningEnabled
              ? {
                  backgroundColor: '#2196F3',
                  color: '#FFFFFF',
                }
              : {}),
          }}
        >
          {zoningEnabled ? '分区模式：开启' : '分区模式：关闭'}
        </button>
        <p style={hintStyle}>
          {zoningEnabled
            ? '中心商业区 | 中轴线高楼区 | 四周住宅区'
            : '完全随机布局'}
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>建筑密度：{density}</h3>
        <input
          type="range"
          min="10"
          max="30"
          step="1"
          value={density}
          onChange={(e) => onDensityChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={sliderLabelsStyle}>
          <span>稀疏</span>
          <span>密集</span>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>旋转速度：{rotationSpeed.toFixed(1)}</h3>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={rotationSpeed}
          onChange={(e) => onRotationSpeedChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={sliderLabelsStyle}>
          <span>静止</span>
          <span>快速</span>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>天际线轮廓</h3>
        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          style={{
            display: 'block',
            borderRadius: '8px',
            backgroundColor: '#0D1218',
          }}
        />
      </div>

      <div style={legendStyle}>
        <div style={legendItemStyle}>
          <div style={{ ...legendColor, backgroundColor: '#1976D2' }} />
          <span>商业区（中心）</span>
        </div>
        <div style={legendItemStyle}>
          <div style={{ ...legendColor, backgroundColor: '#0D47A1' }} />
          <span>高楼区（中轴线）</span>
        </div>
        <div style={legendItemStyle}>
          <div style={{ ...legendColor, backgroundColor: '#FFD54F' }} />
          <span>住宅区（四周）</span>
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: '30%',
  minWidth: '320px',
  height: '100vh',
  backgroundColor: 'rgba(26, 34, 38, 0.9)',
  backdropFilter: 'blur(10px)',
  padding: '20px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  color: '#ECEFF1',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 20px 0',
  fontSize: '24px',
  fontWeight: 600,
  color: '#FFD700',
  textAlign: 'center',
  letterSpacing: '1px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#263238',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '16px',
};

const cardTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: '16px',
  fontWeight: 500,
  color: '#2196F3',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: '#37474F',
  color: '#ECEFF1',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: 'linear-gradient(to right, #455A64, #FFB300)',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
};

const sliderLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '8px',
  fontSize: '12px',
  color: '#90A4AE',
};

const hintStyle: React.CSSProperties = {
  margin: '8px 0 0 0',
  fontSize: '12px',
  color: '#90A4AE',
  textAlign: 'center',
};

const legendStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '16px',
  backgroundColor: '#263238',
  borderRadius: '12px',
};

const legendItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '#B0BEC5',
};

const legendColor: React.CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '4px',
};
