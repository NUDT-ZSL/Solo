import React, { useRef, useEffect, useState } from 'react';
import { Track, INSTRUMENTS } from '../types';
import { audioEngine } from '../audioEngine';

interface SequencerProps {
  tracks: Track[];
  onCellClick: (trackId: number, stepIndex: number, active: boolean) => void;
  onTrackColorChange: (trackId: number, color: string) => void;
  isPlaying: boolean;
  playheadPosition: number;
  bpm: number;
}

export const Sequencer: React.FC<SequencerProps> = ({
  tracks,
  onCellClick,
  onTrackColorChange,
  isPlaying,
  playheadPosition,
  bpm,
}) => {
  const [pulsingCells, setPulsingCells] = useState<Set<string>>(new Set());
  const [playingStep, setPlayingStep] = useState<number>(-1);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setPlayingStep(-1);
      return;
    }

    const updatePlayhead = () => {
      const pos = audioEngine.getPlayheadPosition();
      setPlayingStep(Math.floor(pos));
      rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    rafRef.current = requestAnimationFrame(updatePlayhead);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying]);

  const handleCellClick = (trackId: number, stepIndex: number, currentActive: boolean) => {
    const newActive = !currentActive;
    const cellKey = `${trackId}-${stepIndex}`;

    setPulsingCells(prev => {
      const next = new Set(prev);
      if (newActive) {
        next.add(cellKey);
        setTimeout(() => {
          setPulsingCells(p => {
            const np = new Set(p);
            np.delete(cellKey);
            return np;
          });
        }, 200);
      }
      return next;
    });

    if (newActive) {
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        audioEngine.playInstrument(track.instrument, trackId);
      }
    }

    onCellClick(trackId, stepIndex, newActive);
  };

  const stepDuration = 60 / bpm / 4;
  const cellWidth = 53;
  const playheadLeft = playheadPosition * cellWidth + 112;

  const defaultColors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
    '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
  ];

  return (
    <div className="sequencer">
      {isPlaying && (
        <div
          className="playhead"
          style={{
            left: `${playheadLeft}px`,
          }}
        />
      )}
      <div className="sequencer-grid">
        {tracks.map((track, trackIdx) => (
          <div key={track.id} className="track-row">
            <div className="track-label">
              <input
                type="color"
                className="track-color-picker"
                value={track.color || defaultColors[trackIdx % defaultColors.length]}
                onChange={(e) => onTrackColorChange(track.id, e.target.value)}
              />
              <span className="track-name">
                {INSTRUMENTS[trackIdx]?.name || `Track ${track.id + 1}`}
              </span>
            </div>
            <div className="steps-container" ref={trackIdx === 0 ? stepsContainerRef : undefined}>
              {track.steps.map((active, stepIndex) => {
                const cellKey = `${track.id}-${stepIndex}`;
                const isPulsing = pulsingCells.has(cellKey);
                const isPlayingThis = isPlaying && playingStep === stepIndex;
                const color = track.color || defaultColors[trackIdx % defaultColors.length];

                return (
                  <div
                    key={stepIndex}
                    className={`step-cell ${active ? 'active' : ''} ${isPulsing ? 'pulse' : ''} ${isPlayingThis && active ? 'playing' : ''} ${stepIndex % 4 === 0 ? 'beat-start' : ''}`}
                    style={{
                      backgroundColor: active ? color : undefined,
                      color: color,
                    }}
                    onClick={() => handleCellClick(track.id, stepIndex, active)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
