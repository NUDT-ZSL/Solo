import React from 'react';
import type { CameraSettings } from '../types';
import { RotateCw, Camera, Maximize2, Zap } from 'lucide-react';

interface ViewportSettingsProps {
  settings: CameraSettings;
  onSettingsChange: (settings: CameraSettings) => void;
  onExportScreenshot: () => void;
}

const ViewportSettings: React.FC<ViewportSettingsProps> = ({
  settings,
  onSettingsChange,
  onExportScreenshot,
}) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.panel}>
        <div style={styles.leftGroup}>
          <div style={styles.logoBadge}>
            <Zap size={14} color="#e94560" />
            <span style={styles.logoText}>FRACTAL · 3D</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.middleGroup}>
          <div style={styles.toggleSection}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(settings.autoRotate ? styles.toggleBtnActive : {}),
              }}
              onClick={() =>
                onSettingsChange({ ...settings, autoRotate: !settings.autoRotate })
              }
            >
              <RotateCw size={15} style={{ marginRight: 7 }} />
              <span>自动旋转</span>
            </button>
            {settings.autoRotate && (
              <div style={styles.speedControl}>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={settings.autoRotateSpeed}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      autoRotateSpeed: parseFloat(e.target.value),
                    })
                  }
                  style={styles.speedSlider}
                />
                <span style={styles.speedValue}>
                  {settings.autoRotateSpeed.toFixed(1)}°/s
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.rightGroup}>
          <button style={styles.actionBtn} onClick={onExportScreenshot} title="导出截图 1920x1080">
            <Camera size={15} />
            <span>截图</span>
          </button>
          <button style={styles.actionBtn} title="全屏" onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }}>
            <Maximize2 size={15} />
            <span>全屏</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 18px',
    background: 'rgba(26,26,46,0.6)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px 4px 8px',
    background: 'linear-gradient(135deg, rgba(233,69,96,0.25), rgba(233,69,96,0.08))',
    borderRadius: 8,
    border: '1px solid rgba(233,69,96,0.3)',
  },
  logoText: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#fff',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 26,
    background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)',
  },
  middleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  toggleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 13px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  toggleBtnActive: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.7), rgba(99,102,241,0.45))',
    border: '1px solid rgba(99,102,241,0.4)',
    color: '#fff',
    boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
    transform: 'scale(1.03)',
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    borderLeft: '1px solid rgba(255,255,255,0.08)',
  },
  speedSlider: {
    width: 120,
  },
  speedValue: {
    fontSize: 11,
    color: '#e94560',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    minWidth: 52,
    textAlign: 'right',
    padding: '2px 7px',
    background: 'rgba(233,69,96,0.1)',
    borderRadius: 5,
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default ViewportSettings;
