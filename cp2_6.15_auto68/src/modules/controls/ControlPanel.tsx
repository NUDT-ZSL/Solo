import React, { useState, useCallback } from 'react';
import {
  useParamStore,
  SHUTTER_SPEEDS,
  APERTURE_MIN,
  APERTURE_MAX,
  FOCAL_MIN,
  FOCAL_MAX,
} from '../../store/paramStore';
import ShutterButton from './ShutterButton';

interface Props {
  onShutterClick: () => void;
  shutterAnimating: boolean;
}

const FOCAL_MARKS = [28, 35, 50, 85, 135, 200];

const ControlPanel: React.FC<Props> = ({ onShutterClick, shutterAnimating }) => {
  const aperture = useParamStore((s) => s.aperture);
  const shutter = useParamStore((s) => s.shutter);
  const focalLength = useParamStore((s) => s.focalLength);
  const setAperture = useParamStore((s) => s.setAperture);
  const setShutter = useParamStore((s) => s.setShutter);
  const setFocalLength = useParamStore((s) => s.setFocalLength);

  const [shuttlePulse, setShuttlePulse] = useState<'left' | 'right' | null>(null);

  const shutterIdx = SHUTTER_SPEEDS.indexOf(shutter);

  const handleShutterLeft = useCallback(() => {
    if (shutterIdx <= 0) return;
    setShutter(SHUTTER_SPEEDS[shutterIdx - 1]);
    setShuttlePulse('left');
    setTimeout(() => setShuttlePulse(null), 110);
  }, [shutterIdx, setShutter]);

  const handleShutterRight = useCallback(() => {
    if (shutterIdx >= SHUTTER_SPEEDS.length - 1) return;
    setShutter(SHUTTER_SPEEDS[shutterIdx + 1]);
    setShuttlePulse('right');
    setTimeout(() => setShuttlePulse(null), 110);
  }, [shutterIdx, setShutter]);

  const aperturePct = ((aperture - APERTURE_MIN) / (APERTURE_MAX - APERTURE_MIN)) * 100;
  const focalPct = ((focalLength - FOCAL_MIN) / (FOCAL_MAX - FOCAL_MIN)) * 100;

  return (
    <div style={styles.container}>
      <div className="control-panel-inner" style={styles.inner}>
        <div style={styles.controlGroup}>
          <div style={styles.labelRow}>
            <span style={styles.label}>光圈</span>
            <span style={styles.valueGold}>F/{aperture.toFixed(1)}</span>
          </div>
          <div style={styles.sliderWrap}>
            <div style={styles.sliderTrack}>
              <div style={{ ...styles.sliderFill, width: `${aperturePct}%` }} />
            </div>
            <input
              type="range"
              min={APERTURE_MIN}
              max={APERTURE_MAX}
              step={0.1}
              value={aperture}
              onChange={(e) => setAperture(parseFloat(e.target.value))}
              style={styles.slider}
            />
          </div>
          <div style={styles.scaleRow}>
            <span style={styles.scaleMark}>1.4</span>
            <span style={styles.scaleMark}>5.6</span>
            <span style={styles.scaleMark}>11</span>
            <span style={styles.scaleMark}>16</span>
            <span style={styles.scaleMark}>22</span>
          </div>
        </div>

        <div style={styles.controlGroup}>
          <div style={styles.labelRow}>
            <span style={styles.label}>快门速度</span>
            <span style={styles.valueWhite}>{shutter}</span>
          </div>
          <div style={styles.dialWrap}>
            <button
              onClick={handleShutterLeft}
              disabled={shutterIdx <= 0}
              className={shuttlePulse === 'left' ? 'click-pulse' : ''}
              style={{
                ...styles.dialBtn,
                ...(shutterIdx <= 0 ? styles.dialBtnDisabled : {}),
              }}
              aria-label="减小快门速度"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div style={styles.dialDisplay}>
              <div style={styles.dialTicks}>
                {SHUTTER_SPEEDS.map((s, i) => (
                  <div
                    key={s}
                    style={{
                      ...styles.dialTick,
                      height: i === shutterIdx ? 18 : i === shutterIdx - 1 || i === shutterIdx + 1 ? 10 : 6,
                      opacity: i === shutterIdx ? 1 : 0.35,
                      background: i === shutterIdx ? '#ffd700' : '#888',
                    }}
                  />
                ))}
              </div>
              <div style={styles.dialValue}>
                {shutter}
              </div>
              <div style={styles.dialProgress}>
                <div
                  style={{
                    ...styles.dialProgressFill,
                    width: `${((shutterIdx + 0.5) / SHUTTER_SPEEDS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleShutterRight}
              disabled={shutterIdx >= SHUTTER_SPEEDS.length - 1}
              className={shuttlePulse === 'right' ? 'click-pulse' : ''}
              style={{
                ...styles.dialBtn,
                ...(shutterIdx >= SHUTTER_SPEEDS.length - 1 ? styles.dialBtnDisabled : {}),
              }}
              aria-label="增大快门速度"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div style={styles.scaleRow}>
            <span style={styles.scaleMark}>快</span>
            <span style={{ ...styles.scaleMark, flex: 1 }} />
            <span style={styles.scaleMark}>慢</span>
          </div>
        </div>

        <div style={styles.controlGroup}>
          <div style={styles.labelRow}>
            <span style={styles.label}>焦距</span>
            <span style={styles.valueGold}>{focalLength}mm</span>
          </div>
          <div style={styles.sliderWrap}>
            <div style={styles.sliderTrack}>
              <div style={{ ...styles.sliderFillFocal, width: `${focalPct}%` }} />
            </div>
            <input
              type="range"
              min={FOCAL_MIN}
              max={FOCAL_MAX}
              step={1}
              value={focalLength}
              onChange={(e) => setFocalLength(parseInt(e.target.value, 10))}
              style={styles.slider}
            />
          </div>
          <div style={styles.focalMarksRow}>
            {FOCAL_MARKS.map((m) => {
              const pos = ((m - FOCAL_MIN) / (FOCAL_MAX - FOCAL_MIN)) * 100;
              const active = Math.abs(focalLength - m) <= 3;
              return (
                <div
                  key={m}
                  style={{
                    ...styles.focalMark,
                    left: `${pos}%`,
                    color: active ? '#ffd700' : '#888',
                    transform: `translateX(-50%) scale(${active ? 1.1 : 1})`,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <div style={{
                    ...styles.focalTick,
                    background: active ? '#ffd700' : '#666',
                  }} />
                  <span>{m}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.shutterGroup}>
          <div style={styles.shutterLabel}>拍摄</div>
          <ShutterButton onClick={onShutterClick} disabled={shutterAnimating} />
          <div style={styles.shutterHint}>SHUTTER</div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: 120,
    background: '#2b2b2b',
    borderRadius: 16,
    padding: '12px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    flexWrap: 'wrap',
  },
  controlGroup: {
    flex: 1,
    minWidth: 180,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 12,
    color: '#90a4ae',
    fontFamily: "'Courier New', monospace",
    letterSpacing: 1,
  },
  valueGold: {
    fontSize: 16,
    color: '#ffd700',
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  valueWhite: {
    fontSize: 16,
    color: '#e0e0e0',
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  sliderWrap: {
    position: 'relative',
    height: 22,
    display: 'flex',
    alignItems: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    background: '#1a1a1a',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #b8860b, #ffd700)',
    borderRadius: 3,
    transition: 'width 0.1s ease-out',
  },
  sliderFillFocal: {
    height: '100%',
    background: 'linear-gradient(90deg, #558b2f, #9ccc65)',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  slider: {
    position: 'relative',
    width: '100%',
    background: 'transparent',
    zIndex: 2,
  },
  scaleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 2px',
  },
  scaleMark: {
    fontSize: 10,
    color: '#757575',
    fontFamily: "'Courier New', monospace",
  },
  dialWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  dialBtn: {
    width: 34,
    height: 42,
    borderRadius: 8,
    background: 'linear-gradient(180deg, #4a4a4a, #2a2a2a)',
    border: '1px solid #555',
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.1s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  dialBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  dialDisplay: {
    flex: 1,
    minWidth: 120,
    height: 42,
    borderRadius: 8,
    background: 'linear-gradient(180deg, #1e1e1e, #0f0f0f)',
    border: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: '4px 8px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
  },
  dialTicks: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 3,
    height: 18,
  },
  dialTick: {
    width: 3,
    borderRadius: 2,
    transition: 'height 0.15s ease, opacity 0.15s ease, background 0.15s ease',
  },
  dialValue: {
    fontSize: 11,
    color: '#ffd700',
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  dialProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    background: 'rgba(255,255,255,0.05)',
  },
  dialProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #666, #ffd700)',
    transition: 'width 0.15s ease-out',
  },
  focalMarksRow: {
    position: 'relative',
    height: 18,
    marginTop: 2,
  },
  focalMark: {
    position: 'absolute',
    top: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    fontSize: 9,
    fontFamily: "'Courier New', monospace",
    transition: 'color 0.25s ease, transform 0.25s ease',
    pointerEvents: 'none',
  },
  focalTick: {
    width: 1,
    height: 5,
    borderRadius: 1,
    transition: 'background 0.25s ease',
  },
  shutterGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    borderLeft: '1px solid #3a3a3a',
    flexShrink: 0,
  },
  shutterLabel: {
    fontSize: 12,
    color: '#90a4ae',
    fontFamily: "'Courier New', monospace",
    letterSpacing: 1,
  },
  shutterHint: {
    fontSize: 9,
    color: '#666',
    fontFamily: "'Courier New', monospace",
    letterSpacing: 2,
  },
};

export default ControlPanel;
