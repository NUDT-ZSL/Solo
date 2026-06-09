import React, { useEffect, useState } from 'react';
import { Track, INSTRUMENTS } from '../types';
import { audioEngine } from '../audioEngine';
import { Knob } from './Knob';

interface MixerProps {
  tracks: Track[];
  onParamChange: (trackId: number, param: 'volume' | 'pan' | 'reverb' | 'delay' | 'distortion', value: number) => void;
}

export const Mixer: React.FC<MixerProps> = ({ tracks, onParamChange }) => {
  const [hoveredSlider, setHoveredSlider] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSliderChange = (
    trackId: number,
    param: 'volume' | 'pan' | 'reverb' | 'delay' | 'distortion',
    value: number
  ) => {
    audioEngine.updateTrackParam(trackId, param, value);
    onParamChange(trackId, param, value);
  };

  const defaultColors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
    '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
  ];

  return (
    <div className="mixer-panel">
      <div className="mixer-title">MIXER</div>
      <div className="mixer-panel-inner" style={{ display: isMobile ? 'flex' : 'block' }}>
        {tracks.map((track, idx) => (
          <div key={track.id} className="mixer-track">
            <div className="mixer-track-header">
              <div
                className="mixer-track-color"
                style={{ backgroundColor: track.color || defaultColors[idx % defaultColors.length] }}
              />
              <span className="mixer-track-name">
                {INSTRUMENTS[idx]?.name || `Track ${track.id + 1}`}
              </span>
            </div>
            <div className="mixer-controls">
              <div className="control-group">
                <span className="control-label">VOL</span>
                <div
                  className="slider-wrapper"
                  onMouseEnter={() => setHoveredSlider(`vol-${track.id}`)}
                  onMouseLeave={() => setHoveredSlider(null)}
                >
                  {hoveredSlider === `vol-${track.id}` && (
                    <span className="slider-value">{track.volume}</span>
                  )}
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={100}
                    step={1}
                    value={track.volume}
                    onChange={(e) => handleSliderChange(track.id, 'volume', Number(e.target.value))}
                  />
                </div>
              </div>

              {isMobile ? (
                <>
                  <div className="control-group">
                    <span className="control-label">PAN</span>
                    <div
                      className="slider-wrapper"
                      onMouseEnter={() => setHoveredSlider(`pan-${track.id}`)}
                      onMouseLeave={() => setHoveredSlider(null)}
                    >
                      {hoveredSlider === `pan-${track.id}` && (
                        <span className="slider-value">{track.pan}</span>
                      )}
                      <input
                        type="range"
                        className="slider"
                        min={-50}
                        max={50}
                        step={1}
                        value={track.pan}
                        onChange={(e) => handleSliderChange(track.id, 'pan', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <span className="control-label">REV</span>
                    <div
                      className="slider-wrapper"
                      onMouseEnter={() => setHoveredSlider(`rev-${track.id}`)}
                      onMouseLeave={() => setHoveredSlider(null)}
                    >
                      {hoveredSlider === `rev-${track.id}` && (
                        <span className="slider-value">{track.reverb}</span>
                      )}
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={100}
                        step={1}
                        value={track.reverb}
                        onChange={(e) => handleSliderChange(track.id, 'reverb', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <span className="control-label">DLY</span>
                    <div
                      className="slider-wrapper"
                      onMouseEnter={() => setHoveredSlider(`dly-${track.id}`)}
                      onMouseLeave={() => setHoveredSlider(null)}
                    >
                      {hoveredSlider === `dly-${track.id}` && (
                        <span className="slider-value">{track.delay}</span>
                      )}
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={100}
                        step={1}
                        value={track.delay}
                        onChange={(e) => handleSliderChange(track.id, 'delay', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <span className="control-label">DST</span>
                    <div
                      className="slider-wrapper"
                      onMouseEnter={() => setHoveredSlider(`dst-${track.id}`)}
                      onMouseLeave={() => setHoveredSlider(null)}
                    >
                      {hoveredSlider === `dst-${track.id}` && (
                        <span className="slider-value">{track.distortion}</span>
                      )}
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={100}
                        step={1}
                        value={track.distortion}
                        onChange={(e) => handleSliderChange(track.id, 'distortion', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="control-group">
                    <span className="control-label">PAN</span>
                    <div className="slider-wrapper">
                      <Knob
                        value={track.pan}
                        min={-50}
                        max={50}
                        step={1}
                        centerSnap
                        size={36}
                        onChange={(v) => handleSliderChange(track.id, 'pan', v)}
                      />
                    </div>
                  </div>
                  <div className="knobs-row">
                    <Knob
                      value={track.reverb}
                      min={0}
                      max={100}
                      step={1}
                      label="REV"
                      size={36}
                      onChange={(v) => handleSliderChange(track.id, 'reverb', v)}
                    />
                    <Knob
                      value={track.delay}
                      min={0}
                      max={100}
                      step={1}
                      label="DLY"
                      size={36}
                      onChange={(v) => handleSliderChange(track.id, 'delay', v)}
                    />
                    <Knob
                      value={track.distortion}
                      min={0}
                      max={100}
                      step={1}
                      label="DST"
                      size={36}
                      onChange={(v) => handleSliderChange(track.id, 'distortion', v)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
