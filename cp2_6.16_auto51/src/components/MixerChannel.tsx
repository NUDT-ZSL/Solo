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
  const [isDragging, setIsDragging] = useState(false);
  const [knobAngle, setKnobAngle] = useState(0);
  const [playAnimating, setPlayAnimating] = useState(false);

  useEffect(() => {
    const angle = (track.state.pan + 1) * 135 - 135;
    setKnobAngle(angle);
  }, [track.state.pan]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !track.buffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

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
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;

      ctx.lineTo(i, y1);
      ctx.lineTo(i, y2);
    }

    ctx.lineTo(width, amp);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (track.state.playing && track.buffer) {
      const audioCtx = track.sourceNode?.context;
      if (audioCtx) {
        const elapsed = (audioCtx.currentTime - track.startTime) % track.buffer.duration;
        const progress = elapsed / track.buffer.duration;
        const playheadX = width * progress;

        ctx.fillStyle = '#e2b714';
        ctx.fillRect(playheadX - 1, 0, 2, height);
      }
    }
  }, [track.buffer, track.state.playing, track.sourceNode, track.startTime]);

  useEffect(() => {
    if (track.state.playing) {
      let animationId: number;
      const animate = () => {
        const canvas = waveformCanvasRef.current;
        if (!canvas || !track.buffer) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const audioCtx = track.sourceNode?.context;
        if (!audioCtx) return;

        const elapsed = (audioCtx.currentTime - track.startTime) % track.buffer.duration;
        const progress = elapsed / track.buffer.duration;
        const playheadX = width * progress;

        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#6c63ff');
        gradient.addColorStop(1, '#8b5cf6');

        const data = track.buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.beginPath();
        ctx.moveTo(0, amp);

        for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;

          for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }

          const y1 = (1 + min) * amp;
          const y2 = (1 + max) * amp;

          ctx.lineTo(i, y1);
          ctx.lineTo(i, y2);
        }

        ctx.lineTo(width, amp);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2b714';
        ctx.fillRect(playheadX - 1, 0, 2, height);

        animationId = requestAnimationFrame(animate);
      };

      animationId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationId);
      };
    }
  }, [track.state.playing, track.buffer, track.sourceNode, track.startTime]);

  useEffect(() => {
    const canvas = knobCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 60 * dpr;
    canvas.height = 60 * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = 30;
    const cy = 30;
    const radius = 28;

    ctx.clearRect(0, 0, 60, 60);

    if (isDragging) {
      ctx.shadowColor = '#6c63ff';
      ctx.shadowBlur = 15;
    }

    const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    bgGradient.addColorStop(0, '#3a3a5e');
    bgGradient.addColorStop(1, '#2a2a3e');

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
      ctx.stroke();
    }

    const pointerAngle = (knobAngle * Math.PI) / 180;
    const pointerLength = 18;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(pointerAngle - Math.PI / 2) * pointerLength,
      cy + Math.sin(pointerAngle - Math.PI / 2) * pointerLength
    );
    ctx.strokeStyle = '#e2b714';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e2b714';
    ctx.fill();
  }, [knobAngle, isDragging]);

  const handleKnobMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);

    const canvas = knobCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - cx;
      const dy = moveEvent.clientY - cy;

      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      angle = Math.max(-135, Math.min(135, angle));

      setKnobAngle(angle);
      const panValue = (angle + 135) / 270 * 2 - 1;
      onPanChange(track.state.id, panValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
          width: '100%',
          marginTop: '0'
        }}
      >
        {track.state.name}
      </div>

      <canvas
        ref={waveformCanvasRef}
        style={{
          width: '100%',
          height: '80px',
          borderRadius: '6px',
          background: '#121212'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <div
          style={{
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px'
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
              transformOrigin: 'center'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <canvas
            ref={knobCanvasRef}
            width={60}
            height={60}
            onMouseDown={handleKnobMouseDown}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: 'box-shadow 0.2s ease-in-out'
            }}
          />
          <div style={{ fontSize: '10px', color: '#888', textAlign: 'center' }}>
            {track.state.pan < -0.1 ? 'L' : track.state.pan > 0.1 ? 'R' : 'C'}
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
              fontWeight: 600,
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
              color: track.state.solo ? '#000' : '#fff',
              fontWeight: 600,
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
              transition: 'background-color 0.2s ease-in-out'
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
          transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out',
          transform: playAnimating ? 'scale(0.95)' : 'scale(1)',
          marginTop: 'auto',
          marginBottom: '4px'
        }}
      >
        {track.state.playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1" width="3" height="10" />
            <rect x="7" y="1" width="3" height="10" />
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
