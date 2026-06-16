import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AudioTrack } from '../audio/AudioEngine';

interface MixerChannelProps {
  track: AudioTrack;
  onTogglePlay: (id: string) => void;
  onVolumeChange: (id: string, value: number) => void;
  onPanChange: (id: string, value: number) => void;
  onMuteToggle: (id: string) => void;
  onSoloToggle: (id: string) => void;
  onEffectToggle: (id: string) => void;
}

const CANVAS_WIDTH = 216;
const CANVAS_HEIGHT = 80;
const KNOB_SIZE = 60;

export const MixerChannel: React.FC<MixerChannelProps> = ({
  track,
  onTogglePlay,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onEffectToggle
}) => {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const knobCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [knobAngle, setKnobAngle] = useState(0);
  const [playAnimating, setPlayAnimating] = useState(false);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const angle = (track.state.pan + 1) * 135 - 135;
    setKnobAngle(angle);
  }, [track.state.pan]);

  const drawWaveform = useCallback((showPlayhead: boolean) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !track.buffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const width = CANVAS_WIDTH;
    const height = CANVAS_HEIGHT;

    ctx.clearRect(0, 0, width, height);

    const data = track.buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#6c63ff');
    gradient.addColorStop(1, '#8b5cf6');

    ctx.beginPath();
    ctx.moveTo(0, amp);

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const idx = (i * step) + j;
        if (idx < data.length) {
          const datum = data[idx];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }

      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;

      ctx.lineTo(i, y1);
      ctx.lineTo(i, y2);
    }

    ctx.lineTo(width, amp);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (showPlayhead && track.state.playing) {
      const audioCtx = track.sourceNode?.context;
      if (audioCtx && track.buffer) {
        const elapsed = (audioCtx.currentTime - track.startTime) % track.buffer.duration;
        const progress = Math.max(0, Math.min(1, elapsed / track.buffer.duration));
        const playheadX = Math.floor(width * progress);

        ctx.fillStyle = 'rgba(226, 183, 20, 0.9)';
        ctx.fillRect(playheadX - 1, 0, 2, height);
      }
    }
  }, [track.buffer, track.sourceNode, track.startTime, track.state.playing]);

  useEffect(() => {
    drawWaveform(true);

    if (track.state.playing) {
      const animate = () => {
        drawWaveform(true);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [track.state.playing, track.buffer, drawWaveform]);

  useEffect(() => {
    const canvas = knobCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = KNOB_SIZE * dpr;
    canvas.height = KNOB_SIZE * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = KNOB_SIZE / 2;
    const cy = KNOB_SIZE / 2;
    const radius = 28;

    ctx.clearRect(0, 0, KNOB_SIZE, KNOB_SIZE);

    if (isDragging) {
      ctx.shadowColor = '#6c63ff';
      ctx.shadowBlur = 18;
    }

    const bgGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    bgGradient.addColorStop(0, '#3a3a5e');
    bgGradient.addColorStop(1, '#202032');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = bgGradient;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#3e4a6e';
    ctx.lineWidth = 2;
    ctx.stroke();

    const tickRadius = radius - 6;
    for (let i = 0; i <= 40; i++) {
      const angle = (i / 40) * Math.PI * 1.5 - Math.PI * 1.25;
      const isMajor = i % 10 === 0;
      const tickLength = isMajor ? 8 : 4;
      const tickWidth = isMajor ? 2 : 1;

      const x1 = cx + Math.cos(angle) * (tickRadius - tickLength);
      const y1 = cy + Math.sin(angle) * (tickRadius - tickLength);
      const x2 = cx + Math.cos(angle) * tickRadius;
      const y2 = cy + Math.sin(angle) * tickRadius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isMajor ? '#8b5cf6' : '#4a4a5e';
      ctx.lineWidth = tickWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    const pointerAngle = (knobAngle * Math.PI) / 180 - Math.PI / 2;
    const pointerLength = 18;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(pointerAngle) * pointerLength,
      cy + Math.sin(pointerAngle) * pointerLength
    );
    ctx.strokeStyle = '#e2b714';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e2b714';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
  }, [knobAngle, isDragging]);

  const handleKnobMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);

    const canvas = knobCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      moveEvent.preventDefault();

      const dx = moveEvent.clientX - cx;
      const dy = moveEvent.clientY - cy;

      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      angle = Math.max(-135, Math.min(135, angle));

      setKnobAngle(angle);
      const panValue = (angle + 135) / 270 * 2 - 1;
      onPanChange(track.state.id, panValue);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('mousemove', handleMouseMove, false);
      document.removeEventListener('mouseup', handleMouseUp, false);
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
  }, [track.state.id, onPanChange]);

  const handlePlayClick = () => {
    setPlayAnimating(true);
    setTimeout(() => setPlayAnimating(false), 200);
    onTogglePlay(track.state.id);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(track.state.id, parseFloat(e.target.value));
  };

  return (
    <div
      className="mixer-channel"
      style={{
        width: '240px',
        height: '340px',
        borderRadius: '12px',
        background: 'linear-gradient(180deg, #1e1e2e 0%, #2a2a3e 100%)',
        padding: '12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
          width: '100%'
        }}
      >
        {track.state.name}
      </div>

      <canvas
        ref={waveformCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          borderRadius: '6px',
          background: '#121212',
          display: 'block'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <div
          style={{
            height: '100px',
            width: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.state.volume}
            onChange={handleVolumeChange}
            style={{
              width: '100px',
              height: '8px',
              borderRadius: '4px',
              background: '#3e4a6e',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
              cursor: 'pointer',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center center',
              margin: '0'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <canvas
            ref={knobCanvasRef}
            width={KNOB_SIZE}
            height={KNOB_SIZE}
            onMouseDown={handleKnobMouseDown}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none'
            }}
          />
          <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', fontWeight: 500 }}>
            {track.state.pan < -0.1 ? `L${Math.round(Math.abs(track.state.pan) * 100)}` :
             track.state.pan > 0.1 ? `R${Math.round(track.state.pan * 100)}` : 'CENTER'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => onMuteToggle(track.state.id)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: track.state.muted ? '#ff4d4d' : '#4a4a5e',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out'
            }}
          >
            M
          </button>
          <button
            onClick={() => onSoloToggle(track.state.id)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: track.state.solo ? '#ffd700' : '#4a4a5e',
              color: track.state.solo ? '#1a1a1a' : '#fff',
              fontWeight: 700,
              fontSize: '12px',
              transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out'
            }}
          >
            S
          </button>
          <button
            onClick={() => onEffectToggle(track.state.id)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: track.state.effectEnabled ? '#6c63ff' : '#4a4a5e',
              color: '#fff',
              fontWeight: 600,
              fontSize: '10px',
              transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out'
            }}
          >
            FX
          </button>
        </div>
      </div>

      <button
        onClick={handlePlayClick}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: track.state.playing ? '#6c63ff' : '#3e4a6e',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          transform: playAnimating ? 'scale(0.95)' : 'scale(1)',
          boxShadow: track.state.playing ? '0 0 12px rgba(108, 99, 255, 0.5)' : 'none',
          marginTop: 'auto',
          marginBottom: '4px'
        }}
      >
        {track.state.playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1" width="3" height="10" rx="1" />
            <rect x="7" y="1" width="3" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="2,1 11,6 2,11" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default MixerChannel;
