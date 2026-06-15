import { useState, useRef, useMemo } from 'react';
import { SpeedMarker } from './App';

interface UIPanelProps {
  timeSpeed: number;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  elapsedTime: number;
  speedMarkers: SpeedMarker[];
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 10,
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
};

const uiBaseStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(11, 14, 42, 0.5)',
  border: '1px solid rgba(0, 206, 209, 0.4)',
  borderRadius: '12px',
  transition: 'all 0.2s ease',
  boxShadow: '0 0 8px rgba(0, 206, 209, 0.2)',
};

function getInteractiveStyle(isHovered: boolean): React.CSSProperties {
  return {
    transform: isHovered ? 'scale(1.05)' : 'scale(1.0)',
    boxShadow: isHovered
      ? '0 0 12px rgba(127, 255, 212, 0.6), 0 0 3px rgba(127, 255, 212, 0.8)'
      : '0 0 8px rgba(0, 206, 209, 0.2)',
    borderColor: isHovered
      ? 'rgba(127, 255, 212, 0.7)'
      : 'rgba(0, 206, 209, 0.4)',
  };
}

function UIPanel({ timeSpeed, onSpeedChange, onReset, elapsedTime, speedMarkers }: UIPanelProps) {
  const [sliderHover, setSliderHover] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; marker: SpeedMarker } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const sliderContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '24px',
    bottom: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    ...uiBaseStyle,
    ...getInteractiveStyle(sliderHover),
  };

  const speedDisplayStyle: React.CSSProperties = {
    color: '#00CED1',
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textShadow: '0 0 10px rgba(0, 206, 209, 0.6)',
    letterSpacing: '1px',
    fontFamily: 'monospace',
  };

  const sliderStyle: React.CSSProperties = {
    writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
    direction: 'rtl',
    WebkitAppearance: 'none' as React.CSSProperties['WebkitAppearance'],
    appearance: 'none' as React.CSSProperties['appearance'],
    width: '6px',
    height: '200px',
    background: 'transparent',
    cursor: 'pointer',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '24px',
    right: '24px',
    padding: '12px 28px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#00CED1',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    ...uiBaseStyle,
    ...getInteractiveStyle(buttonHover),
    letterSpacing: '1px',
  };

  const timelineContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 120px)',
    maxWidth: '900px',
    padding: '16px 24px',
    ...uiBaseStyle,
  };

  const timeLabelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '12px',
    color: 'rgba(127, 255, 212, 0.7)',
    fontFamily: 'monospace',
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    height: '4px',
    background: 'linear-gradient(90deg, rgba(0, 206, 209, 0.2), rgba(127, 255, 212, 0.3))',
    borderRadius: '2px',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    padding: '8px 12px',
    background: 'rgba(11, 14, 42, 0.95)',
    border: '1px solid rgba(0, 206, 209, 0.6)',
    borderRadius: '8px',
    color: '#7FFFD4',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 100,
    transform: 'translate(-50%, -120%)',
    boxShadow: '0 0 12px rgba(0, 206, 209, 0.4)',
    whiteSpace: 'nowrap',
  };

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 5; i++) {
      arr.push(i);
    }
    return arr;
  }, []);

  const maxTime = Math.max(10, elapsedTime);

  return (
    <div style={panelStyle}>
      <button
        style={buttonStyle}
        onClick={onReset}
        onMouseEnter={() => setButtonHover(true)}
        onMouseLeave={() => setButtonHover(false)}
      >
        ⟲ 重置
      </button>

      <div
        style={sliderContainerStyle}
        onMouseEnter={() => setSliderHover(true)}
        onMouseLeave={() => setSliderHover(false)}
      >
        <div style={speedDisplayStyle}>
          {timeSpeed.toFixed(1)}x
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '200px',
            background: 'linear-gradient(180deg, #FF4500 0%, #1E90FF 100%)',
            opacity: 0.6,
            borderRadius: '1px',
          }} />
          {[3, 2.5, 2, 1.5, 1, 0.5].map((val, idx) => (
            <div
              key={val}
              style={{
                position: 'absolute',
                left: idx % 2 === 0 ? '22px' : '-28px',
                top: `${(1 - (val - 0.5) / 2.5) * 200}px`,
                transform: 'translateY(-50%)',
                fontSize: '10px',
                color: 'rgba(127, 255, 212, 0.5)',
                fontFamily: 'monospace',
              }}
            >
              {val.toFixed(1)}
            </div>
          ))}
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={timeSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={sliderStyle}
            className="hourglass-slider"
          />
        </div>
        <div style={{
          marginTop: '12px',
          fontSize: '11px',
          color: 'rgba(127, 255, 212, 0.5)',
          letterSpacing: '0.5px',
        }}>
          时间流速
        </div>
      </div>

      <div style={timelineContainerStyle}>
        <div style={timeLabelStyle}>
          <span>0s</span>
          <span style={{ color: '#7FFFD4', fontWeight: 'bold' }}>
            已运行: {elapsedTime.toFixed(1)}s
          </span>
          <span>{maxTime.toFixed(0)}s</span>
        </div>
        <div
          ref={timelineRef}
          style={trackStyle}
          onMouseLeave={() => setTooltip(null)}
        >
          {ticks.map((i) => {
            const pos = (i / 5) * 100;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${pos}%`,
                  top: '-3px',
                  width: '1px',
                  height: '10px',
                  background: 'rgba(127, 255, 212, 0.4)',
                }}
              />
            );
          })}

          {speedMarkers.map((marker, idx) => {
            const pos = (marker.time / maxTime) * 100;
            if (pos > 100) return null;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${pos}%`,
                  top: '-6px',
                  transform: 'translateX(-50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: marker.color,
                  border: '2px solid rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  boxShadow: `0 0 8px ${marker.color}`,
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  const rect = timelineRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      marker,
                    });
                  }
                }}
              />
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: `${Math.min(100, (elapsedTime / maxTime) * 100)}%`,
              top: '-8px',
              transform: 'translateX(-50%)',
              width: '2px',
              height: '20px',
              background: '#7FFFD4',
              borderRadius: '1px',
              boxShadow: '0 0 8px rgba(127, 255, 212, 0.8)',
            }}
          />
        </div>

        <div style={{
          marginTop: '10px',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          fontSize: '10px',
          color: 'rgba(127, 255, 212, 0.5)',
          fontFamily: 'monospace',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#1E90FF',
              boxShadow: '0 0 4px #1E90FF',
            }} />
            慢速 (0.5x)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#FF4500',
              boxShadow: '0 0 4px #FF4500',
            }} />
            快速 (3.0x)
          </span>
        </div>
      </div>

      {tooltip && (
        <div style={{ ...tooltipStyle, left: tooltip.x, top: tooltip.y }}>
          <div style={{ marginBottom: '4px', color: '#00CED1', fontWeight: 'bold' }}>
            流速切换点
          </div>
          <div>速度: {tooltip.marker.speed.toFixed(1)}x</div>
          <div>时刻: {tooltip.marker.time.toFixed(1)}s</div>
        </div>
      )}

      <style>{`
        .hourglass-slider::-webkit-slider-runnable-track {
          width: 6px;
          background: transparent;
        }
        .hourglass-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00CED1, #7FFFD4);
          border: 2px solid rgba(255, 255, 255, 0.8);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(127, 255, 212, 0.8);
          margin-left: -7px;
          transition: all 0.2s ease;
        }
        .hourglass-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 15px rgba(127, 255, 212, 1);
        }
        .hourglass-slider::-moz-range-track {
          width: 6px;
          background: transparent;
        }
        .hourglass-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00CED1, #7FFFD4);
          border: 2px solid rgba(255, 255, 255, 0.8);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(127, 255, 212, 0.8);
        }
      `}</style>
    </div>
  );
}

export default UIPanel;
