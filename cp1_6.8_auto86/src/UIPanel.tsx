import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CelestialBodyData, AudioSynth } from './AudioSynth';

const glassStyle: React.CSSProperties = {
  background: 'rgba(10, 10, 30, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(100, 120, 255, 0.2)',
  borderRadius: '12px',
  color: '#c8d0f0',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const typeLabels: Record<string, string> = {
  star: '⭐ 恒星',
  planet: '🪐 行星',
  nebula: '🌌 星云',
};

const typeColors: Record<string, string> = {
  star: '#aaccff',
  planet: '#88ddcc',
  nebula: '#cc99ff',
};

interface SliderConfig {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SliderControl({ label, value, min, max, step, onChange }: SliderConfig) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
        <span>{label}</span>
        <span style={{ color: '#8899cc' }}>{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          appearance: 'none',
          background: `linear-gradient(to right, #4466aa ${((value - min) / (max - min)) * 100}%, rgba(68,102,170,0.3) ${((value - min) / (max - min)) * 100}%)`,
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

interface UIPanelProps {
  onRoamSpeedChange: (v: number) => void;
  onSignalStrengthChange: (v: number) => void;
  onStarDensityChange: (v: number) => void;
  onResetView: () => void;
  selectedBody: CelestialBodyData | null;
  onCloseCard: () => void;
}

function UIPanel({
  onRoamSpeedChange,
  onSignalStrengthChange,
  onStarDensityChange,
  onResetView,
  selectedBody,
  onCloseCard,
}: UIPanelProps) {
  const [roamSpeed, setRoamSpeed] = useState(1.0);
  const [signalStrength, setSignalStrength] = useState(1.0);
  const [starDensity, setStarDensity] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<AudioSynth | null>(null);

  useEffect(() => {
    audioRef.current = new AudioSynth();
  }, []);

  useEffect(() => {
    if (selectedBody && audioRef.current) {
      audioRef.current.play(selectedBody);
      setIsPlaying(true);
    }
  }, [selectedBody]);

  const handlePlay = useCallback(() => {
    if (selectedBody && audioRef.current) {
      if (isPlaying) {
        audioRef.current.stop();
        setIsPlaying(false);
      } else {
        audioRef.current.play(selectedBody);
        setIsPlaying(true);
      }
    }
  }, [selectedBody, isPlaying]);

  const handleStop = useCallback(() => {
    audioRef.current?.stop();
    setIsPlaying(false);
  }, []);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '220px',
          padding: '18px',
          ...glassStyle,
          zIndex: 100,
        }}
      >
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#aabbee', letterSpacing: '1px' }}>
          控制面板
        </h3>
        <SliderControl
          label="漫游速度"
          value={roamSpeed}
          min={0.1}
          max={3.0}
          step={0.1}
          onChange={(v) => { setRoamSpeed(v); onRoamSpeedChange(v); }}
        />
        <SliderControl
          label="信号强度"
          value={signalStrength}
          min={0.1}
          max={3.0}
          step={0.1}
          onChange={(v) => { setSignalStrength(v); onSignalStrengthChange(v); }}
        />
        <SliderControl
          label="星域密度"
          value={starDensity}
          min={0.3}
          max={2.0}
          step={0.1}
          onChange={(v) => { setStarDensity(v); onStarDensityChange(v); }}
        />
        <button
          onClick={onResetView}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(68, 102, 170, 0.4)',
            border: '1px solid rgba(100, 120, 255, 0.3)',
            borderRadius: '6px',
            color: '#aabbee',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(68, 102, 170, 0.7)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(68, 102, 170, 0.4)'; }}
        >
          重置视角
        </button>
      </div>

      {selectedBody && (
        <div
          style={{
            position: 'fixed',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '360px',
            maxWidth: '90vw',
            padding: '20px',
            ...glassStyle,
            zIndex: 100,
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: typeColors[selectedBody.type], marginRight: '8px' }}>
                {typeLabels[selectedBody.type]}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e0e8ff' }}>
                {selectedBody.name}
              </span>
            </div>
            <button
              onClick={() => { handleStop(); onCloseCard(); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#6677aa',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: '1',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '14px' }}>
            <div>
              <span style={{ color: '#6677aa' }}>光谱类型</span>
              <div style={{ color: '#c0c8e8' }}>{selectedBody.spectralType}</div>
            </div>
            <div>
              <span style={{ color: '#6677aa' }}>质量</span>
              <div style={{ color: '#c0c8e8' }}>{selectedBody.mass} M☉</div>
            </div>
            <div>
              <span style={{ color: '#6677aa' }}>温度</span>
              <div style={{ color: '#c0c8e8' }}>{selectedBody.temperature.toLocaleString()} K</div>
            </div>
            <div>
              <span style={{ color: '#6677aa' }}>类型</span>
              <div style={{ color: typeColors[selectedBody.type] }}>{typeLabels[selectedBody.type]}</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#8899bb', marginBottom: '12px' }}>
            {selectedBody.description}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePlay}
              style={{
                flex: 1,
                padding: '8px',
                background: isPlaying ? 'rgba(170, 80, 80, 0.4)' : 'rgba(68, 170, 102, 0.4)',
                border: `1px solid ${isPlaying ? 'rgba(255, 100, 100, 0.3)' : 'rgba(100, 255, 150, 0.3)'}`,
                borderRadius: '6px',
                color: isPlaying ? '#ff9999' : '#99ffbb',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background 0.2s',
              }}
            >
              {isPlaying ? '⏹ 停止音频' : '▶ 播放音频'}
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          padding: '12px 16px',
          ...glassStyle,
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#aabbee', letterSpacing: '2px', marginBottom: '4px' }}>
          深空回响
        </div>
        <div style={{ fontSize: '11px', color: '#6677aa' }}>
          DEEP SPACE ECHO
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          padding: '10px 14px',
          ...glassStyle,
          fontSize: '11px',
          color: '#5566aa',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        拖拽旋转 · 滚轮缩放 · 点击天体查看详情
      </div>
    </>
  );
}

export function mountUI(container: HTMLElement, callbacks: {
  onRoamSpeedChange: (v: number) => void;
  onSignalStrengthChange: (v: number) => void;
  onStarDensityChange: (v: number) => void;
  onResetView: () => void;
}) {
  let setSelectedBody: React.Dispatch<React.SetStateAction<CelestialBodyData | null>>;

  function App() {
    const [selectedBody, setSelectedBodyLocal] = useState<CelestialBodyData | null>(null);
    setSelectedBody = setSelectedBodyLocal;

    return (
      <UIPanel
        {...callbacks}
        selectedBody={selectedBody}
        onCloseCard={() => setSelectedBodyLocal(null)}
      />
    );
  }

  const root = createRoot(container);
  root.render(<App />);

  return {
    selectBody: (data: CelestialBodyData) => setSelectedBody(data),
    clearSelection: () => setSelectedBody(null),
  };
}
