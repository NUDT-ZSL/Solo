import React, { useState, useRef, useCallback } from 'react';
import type { Track, LevelData, EffectType, Effect } from './types';
import { INSTRUMENT_COLORS } from './types';

interface MixerPanelProps {
  tracks: Track[];
  levels: LevelData[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPanChange: (trackId: string, pan: number) => void;
  onEffectAdd: (trackId: string, slotIndex: number, effectType: EffectType) => void;
  onEffectRemove: (trackId: string, slotIndex: number) => void;
  onEffectParamChange: (trackId: string, slotIndex: number, param: string, value: number) => void;
  onEffectToggle: (trackId: string, slotIndex: number) => void;
}

const EFFECT_TYPES: { type: EffectType; label: string; icon: string }[] = [
  { type: 'reverb', label: '混响', icon: '🌊' },
  { type: 'delay', label: '延迟', icon: '⏱️' },
  { type: 'chorus', label: '合唱', icon: '🎵' },
];

const EFFECT_PARAMS: Record<EffectType, { key: string; label: string; min: number; max: number; step: number; default: number }[]> = {
  reverb: [
    { key: 'wet', label: '干湿比', min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
  delay: [
    { key: 'time', label: '时间', min: 0.05, max: 1, step: 0.01, default: 0.3 },
    { key: 'feedback', label: '反馈', min: 0, max: 0.9, step: 0.01, default: 0.4 },
    { key: 'wet', label: '干湿比', min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
  chorus: [
    { key: 'delay', label: '延迟', min: 0.005, max: 0.03, step: 0.001, default: 0.015 },
    { key: 'wet', label: '干湿比', min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
};

const PanKnob: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const angle = value * 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = startY.current - e.clientY;
      const newValue = Math.max(-1, Math.min(1, startValue.current + deltaY / 100));
      onChange(Math.round(newValue * 100) / 100);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onChange]);

  return (
    <div style={styles.knobContainer}>
      <div
        ref={knobRef}
        style={{
          ...styles.knob,
          transform: `rotate(${angle}deg)`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={styles.knobIndicator} />
      </div>
      <span style={styles.knobValue}>
        {value === 0 ? 'C' : value < 0 ? `L${Math.round(Math.abs(value) * 100)}` : `R${Math.round(value * 100)}`}
      </span>
    </div>
  );
};

const LevelMeter: React.FC<{ level: number }> = ({ level }) => {
  const clampedLevel = Math.max(0, Math.min(1, level));

  return (
    <div style={styles.levelMeterContainer}>
      <div style={styles.levelMeterBg}>
        <div
          style={{
            ...styles.levelMeterFill,
            height: `${clampedLevel * 100}%`,
            background: `linear-gradient(to top, #66bb6a 0%, #66bb6a 50%, #ffee58 75%, #ff5252 100%)`,
          }}
        />
      </div>
    </div>
  );
};

const EffectSlot: React.FC<{
  effect: Effect | null;
  slotIndex: number;
  trackId: string;
  onAdd: (type: EffectType) => void;
  onRemove: () => void;
  onParamChange: (param: string, value: number) => void;
  onToggle: () => void;
}> = ({ effect, slotIndex, trackId, onAdd, onRemove, onParamChange, onToggle }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, type: EffectType) => {
    e.dataTransfer.setData('effectType', type);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const type = e.dataTransfer.getData('effectType') as EffectType;
    if (type) {
      onAdd(type);
    }
  };

  if (!effect) {
    return (
      <div style={{ position: 'relative' }}>
        <div
          style={{
            ...styles.effectSlotEmpty,
            borderColor: dragOver ? '#667eea' : '#2a2a45',
            backgroundColor: dragOver ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
          }}
          onClick={() => setShowMenu(!showMenu)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span style={styles.effectSlotPlus}>+</span>
          <span style={styles.effectSlotLabel}>效果{slotIndex + 1}</span>
        </div>
        {showMenu && (
          <div style={styles.effectMenu} onMouseLeave={() => setShowMenu(false)}>
            {EFFECT_TYPES.map((ef) => (
              <div
                key={ef.type}
                style={styles.effectMenuItem}
                draggable
                onDragStart={(e) => handleDragStart(e, ef.type)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  onAdd(ef.type);
                  setShowMenu(false);
                }}
              >
                <span>{ef.icon}</span>
                <span>{ef.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const effectInfo = EFFECT_TYPES.find((e) => e.type === effect.type)!;
  const params = EFFECT_PARAMS[effect.type];

  return (
    <div
      style={{
        ...styles.effectSlotFilled,
        opacity: effect.enabled ? 1 : 0.5,
        borderColor: effect.enabled ? '#667eea' : '#2a2a45',
      }}
    >
      <div style={styles.effectHeader}>
        <button
          style={{
            ...styles.effectPowerBtn,
            backgroundColor: effect.enabled ? '#667eea' : '#3a3a4e',
          }}
          onClick={onToggle}
        >
          ⏻
        </button>
        <span style={styles.effectName}>
          {effectInfo.icon} {effectInfo.label}
        </span>
        <button style={styles.effectRemoveBtn} onClick={onRemove}>
          ✕
        </button>
      </div>
      <div style={styles.effectParams}>
        {params.map((p) => (
          <div key={p.key} style={styles.paramRow}>
            <span style={styles.paramLabel}>{p.label}</span>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={effect.params[p.key] ?? p.default}
              onChange={(e) => onParamChange(p.key, parseFloat(e.target.value))}
              style={styles.paramSlider}
            />
            <span style={styles.paramValue}>
              {Math.round((effect.params[p.key] ?? p.default) * 100) / 100}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MixerPanel: React.FC<MixerPanelProps> = ({
  tracks,
  levels,
  collapsed,
  onToggleCollapse,
  onPanChange,
  onEffectAdd,
  onEffectRemove,
  onEffectParamChange,
  onEffectToggle,
}) => {
  const getLevelForTrack = (trackId: string): number => {
    const data = levels.find((l) => l.trackId === trackId);
    return data ? data.level : 0;
  };

  return (
    <div
      style={{
        ...styles.container,
        height: collapsed ? '32px' : '200px',
      }}
    >
      <div style={styles.collapseHeader} onClick={onToggleCollapse}>
        <span style={styles.collapseText}>混音面板</span>
        <span style={{ ...styles.collapseArrow, transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>

      {!collapsed && (
        <div style={styles.content}>
          <div style={styles.effectPalette}>
            <div style={styles.paletteTitle}>效果器库（拖拽到插槽）</div>
            <div style={styles.paletteItems}>
              {EFFECT_TYPES.map((ef) => (
                <div
                  key={ef.type}
                  style={styles.paletteItem}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('effectType', ef.type);
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{ef.icon}</span>
                  <span style={styles.paletteItemLabel}>{ef.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.tracksContainer}>
            {tracks.map((track) => (
              <div
                key={track.id}
                style={{
                  ...styles.trackStrip,
                  borderLeft: `3px solid ${INSTRUMENT_COLORS[track.instrument]}`,
                }}
              >
                <div style={styles.trackStripHeader}>
                  <span style={styles.trackStripName}>{track.name}</span>
                </div>

                <div style={styles.meterAndKnob}>
                  <LevelMeter level={getLevelForTrack(track.id)} />
                  <PanKnob
                    value={track.mixer.pan}
                    onChange={(pan) => onPanChange(track.id, pan)}
                  />
                </div>

                <div style={styles.effectSlots}>
                  {[0, 1, 2].map((slotIndex) => (
                    <EffectSlot
                      key={slotIndex}
                      slotIndex={slotIndex}
                      trackId={track.id}
                      effect={track.effects[slotIndex] || null}
                      onAdd={(type) => onEffectAdd(track.id, slotIndex, type)}
                      onRemove={() => onEffectRemove(track.id, slotIndex)}
                      onParamChange={(param, value) =>
                        onEffectParamChange(track.id, slotIndex, param, value)
                      }
                      onToggle={() => onEffectToggle(track.id, slotIndex)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: #2a2a3e;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a2e',
    borderTop: '1px solid #2a2a45',
    transition: 'height 0.3s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  collapseHeader: {
    height: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    cursor: 'pointer',
    backgroundColor: '#0b0b1a',
    borderBottom: '1px solid #2a2a45',
    transition: 'background-color 0.2s ease',
  },
  collapseText: {
    color: '#e0e0e0',
    fontSize: '12px',
    fontWeight: 600,
  },
  collapseArrow: {
    color: '#888899',
    fontSize: '10px',
    transition: 'transform 0.3s ease',
  },
  content: {
    flex: 1,
    display: 'flex',
    padding: '12px',
    gap: '16px',
    overflow: 'hidden',
  },
  effectPalette: {
    width: '160px',
    flexShrink: 0,
    backgroundColor: '#12122a',
    borderRadius: '6px',
    padding: '10px',
    border: '1px solid #2a2a45',
  },
  paletteTitle: {
    color: '#888899',
    fontSize: '10px',
    fontWeight: 600,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  paletteItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  paletteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: '#1a1a2e',
    borderRadius: '4px',
    cursor: 'grab',
    border: '1px solid #2a2a45',
    transition: 'all 0.2s ease',
  },
  paletteItemLabel: {
    color: '#e0e0e0',
    fontSize: '12px',
  },
  tracksContainer: {
    flex: 1,
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  trackStrip: {
    width: '220px',
    flexShrink: 0,
    backgroundColor: '#12122a',
    borderRadius: '6px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  trackStripHeader: {
    paddingBottom: '6px',
    borderBottom: '1px solid #2a2a45',
  },
  trackStripName: {
    color: '#e0e0e0',
    fontSize: '12px',
    fontWeight: 600,
  },
  meterAndKnob: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#0b0b1a',
    borderRadius: '4px',
  },
  levelMeterContainer: {
    height: '120px',
    display: 'flex',
    alignItems: 'flex-end',
  },
  levelMeterBg: {
    width: '8px',
    height: '120px',
    backgroundColor: '#0b0b1a',
    borderRadius: '2px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    border: '1px solid #2a2a45',
  },
  levelMeterFill: {
    width: '100%',
    transition: 'height 0.05s ease-out',
    borderRadius: '2px',
  },
  knobContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  knob: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #2a2a4e 0%, #1a1a2e 100%)',
    border: '2px solid #3a3a5e',
    cursor: 'grab',
    position: 'relative',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
    transition: 'box-shadow 0.2s ease',
  },
  knobIndicator: {
    position: 'absolute',
    top: '6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '2px',
    height: '8px',
    backgroundColor: '#667eea',
    borderRadius: '1px',
  },
  knobValue: {
    color: '#888899',
    fontSize: '10px',
  },
  effectSlots: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  effectSlotEmpty: {
    border: '1px dashed #2a2a45',
    borderRadius: '4px',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
  },
  effectSlotPlus: {
    color: '#667eea',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  effectSlotLabel: {
    color: '#666677',
    fontSize: '10px',
  },
  effectMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: '4px',
    padding: '4px',
    zIndex: 100,
    minWidth: '100px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  effectMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
    color: '#e0e0e0',
    fontSize: '11px',
    transition: 'background-color 0.15s ease',
  },
  effectSlotFilled: {
    border: '1px solid #2a2a45',
    borderRadius: '4px',
    padding: '6px',
    transition: 'all 0.2s ease',
  },
  effectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  effectPowerBtn: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: 'none',
    color: '#fff',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'all 0.2s ease',
  },
  effectName: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '10px',
    fontWeight: 600,
  },
  effectRemoveBtn: {
    background: 'none',
    border: 'none',
    color: '#666677',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '3px',
    transition: 'all 0.2s ease',
  },
  effectParams: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  paramRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  paramLabel: {
    color: '#888899',
    fontSize: '9px',
    width: '32px',
    flexShrink: 0,
  },
  paramSlider: {
    flex: 1,
    minWidth: 0,
  },
  paramValue: {
    color: '#666677',
    fontSize: '9px',
    width: '28px',
    textAlign: 'right',
    flexShrink: 0,
  },
};
