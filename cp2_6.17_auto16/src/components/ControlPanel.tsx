import React, { useRef, useState, useEffect } from 'react';
import { useLightSimulation } from '../hooks/useLightSimulation';

interface ControlPanelProps {
  simulation: ReturnType<typeof useLightSimulation>;
  onDragStart: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  left: '20px',
  top: '20px',
  width: '240px',
  padding: '20px',
  borderRadius: '10px',
  background: 'rgba(30, 41, 59, 0.7)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  zIndex: 10,
  userSelect: 'none'
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '16px',
  color: '#e2e8f0',
  letterSpacing: '0.5px'
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '20px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '8px',
  display: 'block'
};

const valueDisplayStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  padding: '8px 12px',
  borderRadius: '6px',
  marginBottom: '8px',
  fontFamily: 'monospace',
  fontSize: '13px',
  display: 'flex',
  justifyContent: 'space-between'
};

const sliderContainerStyle: React.CSSProperties = {
  position: 'relative',
  padding: '4px 0'
};

const getSliderTrackStyle = (isHovered: boolean, isActive: boolean): React.CSSProperties => ({
  width: '160px',
  height: '6px',
  background: 'linear-gradient(90deg, #6366f1, #818cf8)',
  borderRadius: '3px',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  transform: isHovered && !isActive ? 'translateY(-2px)' : 'none',
  boxShadow: isHovered ? '0 0 8px #6366f1' : 'none'
});

const getSliderHandleStyle = (
  isHovered: boolean,
  isActive: boolean,
  positionPercent: number
): React.CSSProperties => ({
  position: 'absolute',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
  top: '50%',
  left: `calc(${positionPercent}% - 10px)`,
  transform: `translateY(-50%) ${isHovered || isActive ? 'scale(1.1)' : 'scale(1)'}`,
  boxShadow: isHovered || isActive ? '0 0 8px #6366f1, 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)',
  cursor: isActive ? 'grabbing' : 'grab',
  transition: 'all 0.15s ease',
  border: '2px solid rgba(255,255,255,0.3)'
});

const getButtonStyle = (isHovered: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 16px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: isHovered ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(99, 102, 241, 0.2)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
  boxShadow: isHovered ? '0 0 8px #6366f1, 0 4px 12px rgba(99,102,241,0.3)' : 'none',
  fontFamily: 'inherit'
});

const lightIconContainerStyle = (isDragging: boolean, isHovered: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px',
  borderRadius: '8px',
  background: isDragging ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
  cursor: 'grab',
  transition: 'all 0.25s ease',
  transform: isHovered && !isDragging ? 'translateY(-4px)' : 'none',
  boxShadow: isHovered ? '0 0 8px #6366f1' : 'none',
  border: '1px solid rgba(255,255,255,0.05)'
});

const lightIconStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, #ffffff 0%, #ffffff 40%, rgba(255,255,255,0.3) 60%, transparent 100%)',
  boxShadow: '0 0 10px #ffffff, 0 0 20px rgba(255,255,255,0.5)',
  flexShrink: 0
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ simulation, onDragStart }) => {
  const { lightSource, angles, setIncidentAngle, resetLight } = simulation;

  const [sliderHovered, setSliderHovered] = useState(false);
  const [sliderActive, setSliderActive] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [iconHovered, setIconHovered] = useState(false);
  const [iconDragging, setIconDragging] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const sliderPositionPercent = (lightSource.incidentAngle / 90) * 100;

  useEffect(() => {
    if (!sliderActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const angle = Math.round((percent * 90) * 2) / 2;
      setIncidentAngle(angle);
    };

    const handleMouseUp = () => {
      setSliderActive(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sliderActive, setIncidentAngle]);

  useEffect(() => {
    if (!iconDragging) return;
    onDragStart();

    const handleMouseUp = () => {
      setIconDragging(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [iconDragging, onDragStart]);

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>🔬 光学模拟器控制</div>

      <div style={sectionStyle}>
        <span style={labelStyle}>光源 (拖放到场景)</span>
        <div
          ref={iconRef}
          style={lightIconContainerStyle(iconDragging, iconHovered)}
          onMouseEnter={() => setIconHovered(true)}
          onMouseLeave={() => setIconHovered(false)}
          onMouseDown={(e) => {
            e.preventDefault();
            setIconDragging(true);
          }}
          draggable
        >
          <div style={lightIconStyle} />
          <span style={{ fontSize: '13px', color: '#cbd5e1' }}>白色光源</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>入射角 (0° - 90°)</span>
        <div style={sliderContainerStyle}>
          <div
            ref={sliderRef}
            style={getSliderTrackStyle(sliderHovered, sliderActive)}
            onMouseEnter={() => setSliderHovered(true)}
            onMouseLeave={() => setSliderHovered(false)}
            onMouseDown={(e) => {
              e.preventDefault();
              setSliderActive(true);
              if (!sliderRef.current) return;
              const rect = sliderRef.current.getBoundingClientRect();
              let percent = (e.clientX - rect.left) / rect.width;
              percent = Math.max(0, Math.min(1, percent));
              const angle = Math.round((percent * 90) * 2) / 2;
              setIncidentAngle(angle);
            }}
          >
            <div style={getSliderHandleStyle(sliderHovered, sliderActive, sliderPositionPercent)} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', width: '160px' }}>
            <span>0°</span>
            <span style={{ color: '#ef4444' }}>48.75°</span>
            <span>90°</span>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>当前状态</span>
        <div style={valueDisplayStyle}>
          <span style={{ color: '#94a3b8' }}>入射角</span>
          <span>{lightSource.incidentAngle.toFixed(1)}°</span>
        </div>
        <div style={valueDisplayStyle}>
          <span style={{ color: '#94a3b8' }}>折射角</span>
          <span style={{ color: angles.isTotalReflection ? '#ef4444' : '#22c55e' }}>
            {angles.isTotalReflection ? '全反射' : `${angles.refractedAngle.toFixed(1)}°`}
          </span>
        </div>
        <div style={valueDisplayStyle}>
          <span style={{ color: '#94a3b8' }}>临界角</span>
          <span>{angles.criticalAngle.toFixed(2)}°</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <button
          style={getButtonStyle(buttonHovered)}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          onClick={resetLight}
        >
          🔄 重置光源
        </button>
      </div>

      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
        <div>提示：</div>
        <div>• 拖动场景中的白球移动光源</div>
        <div>• 滑块调整入射角</div>
        <div>• 超过临界角(48.75°)触发全反射</div>
      </div>
    </div>
  );
};
