import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExportStatus } from '../controls/ExportController';
import { ParticleInfo } from '../scene/StarField';

export interface UIPanelProps {
  onDensityChange: (value: number) => void;
  onParticleSizeChange: (value: number) => void;
  onRotationSpeedChange: (value: number) => void;
  onColorOffsetChange: (value: number) => void;
  onToggleNetwork: () => boolean;
  onExportScreenshot: () => void;
  onParticleSelect: (cb: (info: ParticleInfo | null) => void) => () => void;
  onExportStatusChange: (cb: (status: ExportStatus) => void) => () => void;
  initialParams: {
    density: number;
    particleSize: number;
    rotationSpeed: number;
    colorOffset: number;
  };
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (v: number) => string;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, step, value, onChange, formatValue, unit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : value.toString();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateValueFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateValueFromEvent(e);
  };

  const updateValueFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    let newValue = min + pct * (max - min);
    newValue = Math.round(newValue / step) * step;
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  };

  return (
    <div
      style={{
        marginBottom: 16,
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 8,
        color: '#e0e0e0',
        fontSize: 13,
        fontWeight: 500
      }}>
        <span>{label}</span>
        <span style={{
          color: '#ffffff',
          fontWeight: 600,
          fontSize: 12,
          padding: '2px 8px',
          background: 'rgba(74, 144, 217, 0.25)',
          borderRadius: 4,
          minWidth: 48,
          textAlign: 'right'
        }}>
          {displayValue}{unit || ''}
        </span>
      </div>

      <div
        ref={trackRef}
        style={{
          width: 200,
          height: 4,
          borderRadius: 2,
          background: '#3a3a4e',
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <div
          ref={sliderRef}
          style={{
            width: `${percentage}%`,
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #4a90d9, #6ba8e8)',
            transition: 'width 0.05s ease-out'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${percentage}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(74, 144, 217, 0.6)',
            cursor: 'grab',
            transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out'
          }}
        />
      </div>

      {isHovered && (
        <div style={{
          position: 'absolute',
          left: `${percentage}%`,
          top: -36,
          transform: 'translateX(-50%)',
          background: '#2a2a3e',
          color: '#ffffff',
          padding: '6px 10px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          opacity: 0.95
        }}>
          {displayValue}{unit || ''}
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: -5,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #2a2a3e'
          }} />
        </div>
      )}
    </div>
  );
};

const ExportOverlay: React.FC<{ status: ExportStatus }> = ({ status }) => {
  if (status === 'idle') return null;

  const isExporting = status === 'exporting';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isExporting && (
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                animation: 'spin 1s linear infinite',
                filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.5))'
              }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2.5"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
          {isSuccess && (
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                filter: 'drop-shadow(0 0 16px rgba(76, 175, 80, 0.8))',
                animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <circle cx="12" cy="12" r="11" fill="#4CAF50" />
              <path
                d="M7.5 12.5l3 3 6-7"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {isError && (
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                filter: 'drop-shadow(0 0 16px rgba(244, 67, 54, 0.8))',
                animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <circle cx="12" cy="12" r="11" fill="#f44336" />
              <path
                d="M8 8l8 8M16 8l-8 8"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <span style={{
          color: '#ffffff',
          fontSize: 24,
          fontWeight: 600,
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          letterSpacing: 1
        }}>
          {isExporting ? '导出中...' : isSuccess ? '导出成功' : '导出失败'}
        </span>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const InfoCard: React.FC<{ info: ParticleInfo | null }> = ({ info }) => {
  if (!info) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 24,
      bottom: 24,
      background: '#2a2a3e',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      color: '#ffffff',
      minWidth: 240,
      zIndex: 100,
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 14,
        color: '#ff6b9d',
        letterSpacing: 0.5
      }}>
        粒子 #{info.index}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontSize: 13
      }}>
        <div>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 4, letterSpacing: 0.5 }}>坐标 (Position)</div>
          <div style={{
            fontFamily: 'monospace',
            background: 'rgba(74,144,217,0.12)',
            padding: '8px 12px',
            borderRadius: 6,
            color: '#6ba8e8'
          }}>
            X: {info.position.x.toFixed(2)} &nbsp;
            Y: {info.position.y.toFixed(2)} &nbsp;
            Z: {info.position.z.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 4, letterSpacing: 0.5 }}>速度向量 (Velocity)</div>
          <div style={{
            fontFamily: 'monospace',
            background: 'rgba(255,107,157,0.12)',
            padding: '8px 12px',
            borderRadius: 6,
            color: '#ff8fb5'
          }}>
            Vx: {info.velocity.x.toFixed(4)}<br />
            Vy: {info.velocity.y.toFixed(4)}<br />
            Vz: {info.velocity.z.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const UIPanel: React.FC<UIPanelProps> = ({
  onDensityChange,
  onParticleSizeChange,
  onRotationSpeedChange,
  onColorOffsetChange,
  onToggleNetwork,
  onExportScreenshot,
  onParticleSelect,
  onExportStatusChange,
  initialParams
}) => {
  const [density, setDensity] = useState(initialParams.density);
  const [particleSize, setParticleSize] = useState(initialParams.particleSize);
  const [rotationSpeed, setRotationSpeed] = useState(initialParams.rotationSpeed);
  const [colorOffset, setColorOffset] = useState(initialParams.colorOffset);
  const [networkActive, setNetworkActive] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [selectedParticle, setSelectedParticle] = useState<ParticleInfo | null>(null);

  useEffect(() => {
    const unsubscribe = onParticleSelect((info) => {
      setSelectedParticle(info);
    });
    return unsubscribe;
  }, [onParticleSelect]);

  useEffect(() => {
    const unsubscribe = onExportStatusChange((status) => {
      setExportStatus(status);
    });
    return unsubscribe;
  }, [onExportStatusChange]);

  const handleDensityChange = useCallback((v: number) => {
    setDensity(v);
    onDensityChange(v);
  }, [onDensityChange]);

  const handleParticleSizeChange = useCallback((v: number) => {
    setParticleSize(v);
    onParticleSizeChange(v);
  }, [onParticleSizeChange]);

  const handleRotationSpeedChange = useCallback((v: number) => {
    setRotationSpeed(v);
    onRotationSpeedChange(v);
  }, [onRotationSpeedChange]);

  const handleColorOffsetChange = useCallback((v: number) => {
    setColorOffset(v);
    onColorOffsetChange(v);
  }, [onColorOffsetChange]);

  const handleToggleNetwork = useCallback(() => {
    const active = onToggleNetwork();
    setNetworkActive(active);
  }, [onToggleNetwork]);

  return (
    <>
      <ExportOverlay status={exportStatus} />
      <InfoCard info={selectedParticle} />

      <div style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 46, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 24,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 220
        }}>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 18,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="6" r="2" fill="#4a90d9" />
              <circle cx="19" cy="8" r="1.5" fill="#ff6b9d" />
              <circle cx="12" cy="18" r="2.5" fill="#6ba8e8" />
              <circle cx="9" cy="11" r="1.2" fill="#ff8fb5" />
              <circle cx="17" cy="15" r="1.8" fill="#4a90d9" />
            </svg>
            NEBULA WEAVER
          </div>
          <Slider
            label="粒子密度"
            min={500}
            max={3000}
            step={50}
            value={density}
            onChange={handleDensityChange}
            unit=" 个"
          />
          <Slider
            label="粒子大小"
            min={1}
            max={10}
            step={0.5}
            value={particleSize}
            onChange={handleParticleSizeChange}
            unit=" px"
          />
          <Slider
            label="旋转速度"
            min={0}
            max={0.1}
            step={0.005}
            value={rotationSpeed}
            onChange={handleRotationSpeedChange}
            formatValue={(v) => v.toFixed(3)}
            unit=" rad/s"
          />
          <Slider
            label="颜色偏移"
            min={0}
            max={1}
            step={0.01}
            value={colorOffset}
            onChange={handleColorOffsetChange}
            formatValue={(v) => v.toFixed(2)}
          />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 28
        }}>
          <button
            onClick={handleToggleNetwork}
            title={networkActive ? '关闭连线网络' : '生成连线网络'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: networkActive
                ? 'linear-gradient(135deg, #4a90d9, #6ba8e8)'
                : 'linear-gradient(135deg, #ff6b9d, #ff8fb5)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
              boxShadow: networkActive
                ? '0 4px 16px rgba(74, 144, 217, 0.5)'
                : '0 4px 16px rgba(255, 107, 157, 0.5)',
              padding: 0
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="12" cy="18" r="2" />
              <circle cx="6" cy="14" r="1.5" />
              <line x1="7.5" y1="7" x2="10.5" y2="16.5" />
              <line x1="16.5" y1="7" x2="13.5" y2="16.5" />
              <line x1="8" y1="6" x2="16" y2="6" />
            </svg>
          </button>

          <button
            onClick={onExportScreenshot}
            disabled={exportStatus === 'exporting'}
            title="导出高清截图"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: exportStatus === 'exporting'
                ? 'rgba(120, 120, 140, 0.6)'
                : 'linear-gradient(135deg, #4a90d9, #a0c4e8)',
              border: 'none',
              cursor: exportStatus === 'exporting' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s',
              boxShadow: '0 4px 16px rgba(74, 144, 217, 0.4)',
              padding: 0,
              opacity: exportStatus === 'exporting' ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (exportStatus !== 'exporting') {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};
