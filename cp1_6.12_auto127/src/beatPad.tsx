import React, { useState, useEffect, useRef } from 'react';
import type { BeatPad as BeatPadType, Sample, SampleCategory } from './types';
import { CATEGORY_COLORS, CATEGORY_NAMES } from './types';
import audioEngine from './audioEngine';

interface BeatPadProps {
  beatPads: BeatPadType[];
  samples: Sample[];
  selectedPadId: number | null;
  onPadSelect: (padId: number) => void;
  onPadAssign: (padId: number, sampleId: string) => void;
  isResponsive: boolean;
}

interface PadAnimationState {
  pressed: boolean;
  glowing: boolean;
}

const BeatPadComponent: React.FC<BeatPadProps> = ({
  beatPads,
  samples,
  selectedPadId,
  onPadSelect,
  onPadAssign,
  isResponsive
}) => {
  const [animations, setAnimations] = useState<Map<number, PadAnimationState>>(new Map());
  const timeoutsRef = useRef<Map<number, { press: NodeJS.Timeout; glow: NodeJS.Timeout }>>(new Map());

  const getSampleById = (sampleId: string | null): Sample | undefined => {
    if (!sampleId) return undefined;
    return samples.find(s => s.id === sampleId);
  };

  const getPadColor = (pad: BeatPadType): string => {
    const sample = getSampleById(pad.sampleId);
    if (!sample) return '#2a2a4a';
    return CATEGORY_COLORS[sample.category];
  };

  const handlePadClick = (pad: BeatPadType) => {
    onPadSelect(pad.id);

    if (pad.sampleId) {
      audioEngine.triggerSample(pad.sampleId, 80);
    }

    setAnimations(prev => {
      const next = new Map(prev);
      next.set(pad.id, { pressed: true, glowing: true });
      return next;
    });

    const existingTimeouts = timeoutsRef.current.get(pad.id);
    if (existingTimeouts) {
      clearTimeout(existingTimeouts.press);
      clearTimeout(existingTimeouts.glow);
    }

    const pressTimeout = setTimeout(() => {
      setAnimations(prev => {
        const next = new Map(prev);
        const current = next.get(pad.id);
        if (current) {
          next.set(pad.id, { ...current, pressed: false });
        }
        return next;
      });
    }, 80);

    const glowTimeout = setTimeout(() => {
      setAnimations(prev => {
        const next = new Map(prev);
        const current = next.get(pad.id);
        if (current) {
          next.set(pad.id, { ...current, glowing: false });
        }
        return next;
      });
    }, 200);

    timeoutsRef.current.set(pad.id, { press: pressTimeout, glow: glowTimeout });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, padId: number) => {
    e.preventDefault();
    const sampleId = e.dataTransfer.getData('sampleId');
    if (sampleId) {
      onPadAssign(padId, sampleId);
    }
  };

  const padSize = isResponsive ? 48 : 60;
  const cols = isResponsive ? 3 : 4;

  return (
    <div className="beatpad-container">
      <div className="beatpad-title">打击垫</div>
      <div
        className="beatpad-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${padSize}px)`,
          gap: '12px'
        }}
      >
        {beatPads.map(pad => {
          const anim = animations.get(pad.id) || { pressed: false, glowing: false };
          const sample = getSampleById(pad.sampleId);
          const color = getPadColor(pad);
          const isSelected = selectedPadId === pad.id;

          return (
            <div
              key={pad.id}
              className={`beatpad-pad ${anim.pressed ? 'pressed' : ''} ${anim.glowing ? 'glowing' : ''} ${isSelected ? 'selected' : ''}`}
              style={{
                width: `${padSize}px`,
                height: `${padSize}px`,
                borderRadius: '8px',
                backgroundColor: pad.sampleId ? color : '#2a2a4a',
                boxShadow: anim.glowing && pad.sampleId
                  ? `0 0 20px ${color}, 0 0 40px ${color}80`
                  : isSelected
                    ? `0 0 0 2px ${color}`
                    : '0 2px 8px rgba(0,0,0,0.3)',
                transform: anim.pressed ? 'scale(0.9)' : 'scale(1)',
                transition: 'transform 0.08s ease-out, box-shadow 0.2s ease-out, background-color 0.2s ease-out'
              }}
              onClick={() => handlePadClick(pad)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, pad.id)}
              title={sample ? `${sample.name} (${CATEGORY_NAMES[sample.category]})` : `Pad ${pad.id + 1} - 点击或拖拽采样`}
            >
              {sample ? (
                <div className="pad-label">
                  <span style={{ fontSize: isResponsive ? '10px' : '11px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {sample.name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <div className="pad-placeholder" style={{ color: '#6a6a8a', fontSize: isResponsive ? '14px' : '18px' }}>
                  {pad.id + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .beatpad-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          gap: 16px;
        }
        .beatpad-title {
          color: #c0c0d0;
          font-size: 16px;
          font-weight: 600;
          align-self: flex-start;
          margin-bottom: 8px;
        }
        .beatpad-grid {
          display: grid;
          justify-content: center;
        }
        .beatpad-pad {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          border: none;
          outline: none;
          position: relative;
          overflow: hidden;
        }
        .beatpad-pad:hover {
          filter: brightness(1.15);
        }
        .beatpad-pad.selected::after {
          content: '';
          position: absolute;
          inset: 0;
          border: 2px solid #fff;
          border-radius: 8px;
          pointer-events: none;
        }
        .pad-label {
          text-align: center;
          padding: 2px;
          word-break: break-all;
          line-height: 1.1;
        }
        .pad-placeholder {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default BeatPadComponent;
