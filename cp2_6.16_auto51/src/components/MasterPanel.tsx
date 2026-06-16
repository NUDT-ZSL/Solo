import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MasterPanelProps {
  masterVolume: number;
  onMasterVolumeChange: (value: number) => void;
  onMixdown: () => void;
  analyser: AnalyserNode | null;
  isExporting: boolean;
}

export const MasterPanel: React.FC<MasterPanelProps> = ({
  masterVolume,
  onMasterVolumeChange,
  onMixdown,
  analyser,
  isExporting
}) => {
  const vuCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!analyser || !vuCanvasRef.current) return;

    const canvas = vuCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 180 * dpr;
    canvas.height = 20 * dpr;
    ctx.scale(dpr, dpr);

    const width = 180;
    const height = 20;
    const barCount = 32;
    const barWidth = (width - (barCount - 1) * 1) / barCount;

    let animationId: number;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#00e676');
      gradient.addColorStop(0.5, '#ffeb3b');
      gradient.addColorStop(1, '#ff5252');

      const step = Math.floor(dataArray.length / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        const average = sum / step;
        const normalizedValue = average / 255;
        const barHeight = Math.max(2, normalizedValue * height);

        const y = height - barHeight;

        const colorStop = i / barCount;
        let barColor: string;
        if (colorStop < 0.5) {
          barColor = `rgb(${Math.floor(0 + colorStop * 2 * 255)}, ${Math.floor(230 - colorStop * 2 * (230 - 235))}, ${Math.floor(118 - colorStop * 2 * 118)})`;
        } else {
          barColor = `rgb(255, ${Math.floor(235 - (colorStop - 0.5) * 2 * (235 - 82))}, ${Math.floor(59 + (colorStop - 0.5) * 2 * (82 - 59))})`;
        }

        ctx.fillStyle = barColor;
        ctx.fillRect(i * (barWidth + 1), y, barWidth, barHeight);

        if (normalizedValue > 0.1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(i * (barWidth + 1), y, barWidth, 2);
        }
      }

      ctx.fillStyle = '#2a2a3e';
      for (let i = 0; i < barCount; i++) {
        ctx.fillRect(i * (barWidth + 1), 0, barWidth, 1);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser]);

  const handleMixdownClick = useCallback(() => {
    onMixdown();
  }, [onMixdown]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMasterVolumeChange(parseFloat(e.target.value));
  };

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
        主控
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#888', fontSize: '11px', textAlign: 'left' }}>
          总音量
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
            background: 'linear-gradient(90deg, #6c63ff, #8b5cf6)',
            outline: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            cursor: 'pointer'
          }}
        />
        <div style={{ color: '#666', fontSize: '10px', textAlign: 'right' }}>
          {Math.round(masterVolume * 100)}%
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#888', fontSize: '11px', textAlign: 'left' }}>
          输出电平
        </div>
        <canvas
          ref={vuCanvasRef}
          style={{
            width: '100%',
            height: '20px',
            borderRadius: '4px',
            background: '#121212'
          }}
        />
      </div>

      <div style={{ width: '100%', height: '2px', background: '#2a2a3e' }} />

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
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          transform: isHovering && !isExporting ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isHovering && !isExporting
            ? '0 8px 25px rgba(108, 99, 255, 0.4)'
            : '0 4px 15px rgba(108, 99, 255, 0.2)',
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
                animation: 'spin 1s linear infinite'
              }}
            />
            <span>导出中...</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1L8 10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 14L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default MasterPanel;
