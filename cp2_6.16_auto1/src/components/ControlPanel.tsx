import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { SoundSource as SoundSourceType, DEFAULT_COLORS, DEFAULT_POSITIONS, DEFAULT_FREQUENCY, DEFAULT_AMPLITUDE } from '@/types';

interface ControlPanelProps {
  sources: SoundSourceType[];
  onSourceUpdate: (id: number, updates: Partial<SoundSourceType>) => void;
  onReset: () => void;
}

export function ControlPanel({ sources, onSourceUpdate, onReset }: ControlPanelProps) {
  const [resetAnim, setResetAnim] = useState(false);
  const resetTimeoutRef = useRef<number | null>(null);

  const handleReset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    setResetAnim(true);
    resetTimeoutRef.current = window.setTimeout(() => {
      onReset();
      setResetAnim(false);
      resetTimeoutRef.current = null;
    }, 120);
  }, [onReset]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="control-panel">
      <div className="control-panel-header">
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>声源控制</span>
      </div>

      {sources.map((source, idx) => (
        <div key={source.id} className="source-control">
          <div className="source-control-header">
            <div
              className="source-color-dot"
              style={{ backgroundColor: source.color }}
            />
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
              声源 {idx + 1}
            </span>
            <input
              type="color"
              value={source.color}
              onChange={(e) => onSourceUpdate(source.id, { color: e.target.value })}
              className="color-picker"
            />
          </div>

          <div className="slider-row">
            <label style={{ color: '#e2e8f0', fontSize: '12px', minWidth: '48px' }}>
              频率
            </label>
            <input
              type="range"
              min={50}
              max={1000}
              step={10}
              value={source.frequency}
              onChange={(e) =>
                onSourceUpdate(source.id, { frequency: Number(e.target.value) })
              }
              className="slider"
            />
            <span className="slider-value" style={{ color: source.color }}>
              {source.frequency}Hz
            </span>
          </div>

          <div className="slider-row">
            <label style={{ color: '#e2e8f0', fontSize: '12px', minWidth: '48px' }}>
              振幅
            </label>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.1}
              value={source.amplitude}
              onChange={(e) =>
                onSourceUpdate(source.id, { amplitude: Number(e.target.value) })
              }
              className="slider"
            />
            <span className="slider-value" style={{ color: source.color }}>
              {source.amplitude.toFixed(1)}
            </span>
          </div>
        </div>
      ))}

      <button
        className={`reset-button ${resetAnim ? 'reset-button-anim' : ''}`}
        onClick={handleReset}
        title="重置场景"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
}
