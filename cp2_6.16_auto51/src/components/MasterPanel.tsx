import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MasterPanelProps {
  masterVolume: number;
  onMasterVolumeChange: (value: number) => void;
  onMixdown: () => void;
  analyser: AnalyserNode | null;
  isExporting: boolean;
}

const VU_WIDTH = 180;
const VU_HEIGHT = 20;
const BAR_COUNT = 32;

export const MasterPanel: React.FC<MasterPanelProps> = ({
  masterVolume,
  onMasterVolumeChange,
  onMixdown,
  analyser,
  isExporting
}) => {
  const vuCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const animationIdRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const drawVUMeter = useCallback(() => {
    if (!analyser || !vuCanvasRef.current) return;

    const canvas = vuCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = VU_WIDTH * dpr;
    canvas.height = VU_HEIGHT * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const width = VU_WIDTH;
    const height = VU_HEIGHT;
    const barWidth = (width - (BAR_COUNT - 1) * 1) / BAR_COUNT;

    analyser.getByteTimeDomainData(dataArrayRef.current);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, width, height);

    const step = Math.floor(dataArrayRef.current.length / BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      let peak = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < dataArrayRef.current.length) {
          const v = (dataArrayRef.current[idx] - 128) / 128;
          const abs = Math.abs(v);
          sum += abs;
          if (abs > peak) peak = abs;
        }
      }
      const avg = sum / step;
      const level = Math.max(avg * 1.5, peak * 0.7);
      const normalizedValue = Math.max(0.05, Math.min(1, level));
      const barHeight = Math.max(2, normalizedValue * height);
      const y = height - barHeight;

      const colorT = i / (BAR_COUNT - 1);
      const r = Math.round(0 + colorT * 255);
      let g: number;
      if (colorT < 0.5) {
        g = Math.round(230 - colorT * 2 * (230 - 235));
      } else {
        g = Math.round(235 - (colorT - 0.5) * 2 * (235 - 82));
      }
      const b = Math.round(118 - colorT * 66);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(i * (barWidth + 1), y, barWidth, barHeight);

      if (normalizedValue > 0.15) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(i * (barWidth + 1), y, barWidth, Math.min(3, barHeight));
      }

      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(i * (barWidth + 1), height - 1, barWidth, 1);
    }
  }, [analyser]);

  useEffect(() => {
    if (!analyser) {
      return;
    }

    drawVUMeter();

    const animate = () => {
      drawVUMeter();
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [analyser, drawVUMeter]);

  const handleMixdownClick = useCallback(() => {
    onMixdown();
  }, [onMixdown]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMasterVolumeChange(parseFloat(e.target.value));
  };

  const vuPercent = Math.round(masterVolume * 100);

  return (
    <div
      className="master-panel"
      style={{
        width: '200px',
        height: '340px',
        borderRadius: '12px',
        background: '#1a1a2e',
        padding: '16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
          width: '100%'
        }}
      >
        主控 MASTER
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#888', fontSize: '11px', textAlign: 'left', fontWeight: 500 }}>
          总音量 MASTER VOL
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterVolume}
          onChange={handleVolumeChange}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: `linear-gradient(90deg, #6c63ff 0%, #8b5cf6 ${vuPercent}%, #3e4a6e ${vuPercent}%)`,
            outline: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            cursor: 'pointer'
          }}
        />
        <div style={{ color: '#6c63ff', fontSize: '10px', textAlign: 'right', fontWeight: 700 }}>
          {vuPercent}%
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#888', fontSize: '11px', textAlign: 'left', fontWeight: 500 }}>
          输出电平 OUTPUT LEVEL
        </div>
        <canvas
          ref={vuCanvasRef}
          width={VU_WIDTH}
          height={VU_HEIGHT}
          style={{
            width: `${VU_WIDTH}px`,
            height: `${VU_HEIGHT}px`,
            borderRadius: '4px',
            background: '#0a0a14',
            display: 'block'
          }}
        />
      </div>

      <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #2a2a3e, transparent)' }} />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '10px' }}>
          <span>44.1kHz</span>
          <span>16-bit</span>
          <span>STEREO</span>
        </div>
      </div>

      <button
        onClick={handleMixdownClick}
        disabled={isExporting}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          width: '160px',
          height: '44px',
          borderRadius: '22px',
          border: 'none',
          cursor: isExporting ? 'progress' : 'pointer',
          background: 'linear-gradient(90deg, #6c63ff 0%, #8b5cf6 100%)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, filter 0.2s ease-in-out',
          transform: isHovering && !isExporting ? 'scale(1.05)' : 'scale(1)',
          filter: isExporting ? 'brightness(0.7)' : 'brightness(1)',
          boxShadow: isHovering && !isExporting
            ? '0 8px 25px rgba(108, 99, 255, 0.45), 0 0 0 1px rgba(255,255,255,0.1) inset'
            : '0 4px 15px rgba(108, 99, 255, 0.25)',
          marginTop: 'auto'
        }}
      >
        {isExporting ? (
          <>
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <span>渲染中...</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 7L8 10L11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 13H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>一键混音</span>
          </>
        )}
      </button>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px #6c63ff;
          transition: transform 0.15s ease-in-out;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #6c63ff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
};

export default MasterPanel;
