import React, { useState, useCallback, useEffect } from 'react';
import { ClusterInfo, EngineParams } from './StarDustEngine';

interface InterstellarUIProps {
  onParamsChange: (params: EngineParams) => void;
  onResetCamera: () => void;
  clusterInfo: ClusterInfo | null;
  onDismissCluster: () => void;
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(10, 15, 30, 0.55)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(100, 160, 255, 0.15)',
  borderRadius: '16px',
  color: '#c8daf0',
  fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
};

const sliderTrackStyle: React.CSSProperties = {
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  background: 'rgba(100, 160, 255, 0.2)',
  outline: 'none',
};

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
        <span>{label}</span>
        <span style={{ color: '#7eb8ff', fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={sliderTrackStyle}
      />
    </div>
  );
}

export function ControlPanel({ onParamsChange, onResetCamera }: { onParamsChange: (p: EngineParams) => void; onResetCamera: () => void }) {
  const [flowSpeed, setFlowSpeed] = useState(1.0);
  const [density, setDensity] = useState(1.0);
  const [glowIntensity, setGlowIntensity] = useState(1.0);

  useEffect(() => {
    onParamsChange({ flowSpeed, density, glowIntensity });
  }, [flowSpeed, density, glowIntensity, onParamsChange]);

  return (
    <div
      style={{
        ...glassStyle,
        padding: '20px 22px',
        width: '240px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(100, 160, 255, 0.08)',
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px', letterSpacing: '1px', color: '#a0c8ff' }}>
        控制面板
      </div>
      <SliderInput label="流速" value={flowSpeed} min={0.1} max={3.0} step={0.05} onChange={setFlowSpeed} />
      <SliderInput label="密度" value={density} min={0.3} max={2.0} step={0.05} onChange={setDensity} />
      <SliderInput label="光晕强度" value={glowIntensity} min={0.2} max={3.0} step={0.05} onChange={setGlowIntensity} />
      <button
        onClick={onResetCamera}
        style={{
          width: '100%',
          padding: '9px 0',
          marginTop: '6px',
          border: '1px solid rgba(100, 160, 255, 0.25)',
          borderRadius: '8px',
          background: 'rgba(60, 100, 180, 0.15)',
          color: '#a0c8ff',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'background 0.2s',
          letterSpacing: '1px',
        }}
        onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(60, 100, 180, 0.3)'); }}
        onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(60, 100, 180, 0.15)'); }}
      >
        重置视角
      </button>
    </div>
  );
}

export function ClusterCard({ cluster, onDismiss }: { cluster: ClusterInfo; onDismiss: () => void }) {
  return (
    <div
      style={{
        ...glassStyle,
        padding: '18px 20px',
        width: '220px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(80, 140, 255, 0.08), inset 0 1px 0 rgba(100, 160, 255, 0.08)',
        animation: 'fadeSlideIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#a0c8ff', letterSpacing: '0.5px' }}>
          星尘团 #{cluster.id}
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(160, 200, 255, 0.5)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: '13px', lineHeight: '1.9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(160, 200, 255, 0.6)' }}>亮度</span>
          <span style={{ color: '#7eb8ff', fontVariantNumeric: 'tabular-nums' }}>{cluster.brightness.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(160, 200, 255, 0.6)' }}>密度</span>
          <span style={{ color: '#7eb8ff', fontVariantNumeric: 'tabular-nums' }}>{cluster.density.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(160, 200, 255, 0.6)' }}>温度</span>
          <span style={{ color: '#7eb8ff', fontVariantNumeric: 'tabular-nums' }}>{Math.round(cluster.temperature)} K</span>
        </div>
      </div>
    </div>
  );
}

export function InterstellarUI({ onParamsChange, onResetCamera, clusterInfo, onDismissCluster }: InterstellarUIProps) {
  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7eb8ff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(126, 184, 255, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7eb8ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(126, 184, 255, 0.5);
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '16px',
          zIndex: 100,
          pointerEvents: 'auto',
        }}
      >
        {clusterInfo && <ClusterCard cluster={clusterInfo} onDismiss={onDismissCluster} />}
        <ControlPanel onParamsChange={onParamsChange} onResetCamera={onResetCamera} />
      </div>
    </>
  );
}
