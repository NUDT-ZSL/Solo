import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ColorWheelProps {
  color: string;
  onChange: (color: string) => void;
  size?: number;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ color, onChange, size = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 180, s: 1, v: 1 });
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = size;
    const h = size;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2 - 2;

    ctx.clearRect(0, 0, w, h);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 2) * Math.PI / 180;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const v = hsv.v;
    if (v < 1) {
      ctx.globalCompositeOperation = 'source-atop';
      const vGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      vGradient.addColorStop(0, `rgba(0, 0, 0, ${1 - v})`);
      vGradient.addColorStop(1, `rgba(0, 0, 0, ${1 - v})`);
      ctx.fillStyle = vGradient;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [size, hsv.v]);

  const hsvToHex = useCallback((h: number, s: number, v: number): string => {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    const hex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }, []);

  const hexToHsv = useCallback((hex: string): { h: number; s: number; v: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 180, s: 1, v: 1 };
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s, v };
  }, []);

  useEffect(() => {
    const newHsv = hexToHsv(color);
    setHsv(newHsv);
  }, [color, hexToHsv]);

  const updateColorFromWheel = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;
    const radius = size / 2 - 2;
    const dist = Math.sqrt(x * x + y * y);
    const s = Math.min(1, dist / radius);
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const newHsv = { h: angle, s, v: hsv.v };
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    onChange(hex);
  }, [size, hsv.v, hsvToHex, onChange]);

  const handleWheelMouseDown = (e: React.MouseEvent) => {
    setIsDraggingWheel(true);
    updateColorFromWheel(e.clientX, e.clientY);
  };

  const handleWheelMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingWheel) return;
    updateColorFromWheel(e.clientX, e.clientY);
  };

  const handleWheelMouseUp = () => {
    setIsDraggingWheel(false);
  };

  useEffect(() => {
    if (isDraggingWheel || isDraggingSlider) {
      const handleMove = (e: MouseEvent) => {
        if (isDraggingWheel) {
          updateColorFromWheel(e.clientX, e.clientY);
        }
      };
      const handleUp = () => {
        setIsDraggingWheel(false);
        setIsDraggingSlider(false);
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDraggingWheel, isDraggingSlider, updateColorFromWheel]);

  const selectorX = size / 2 + Math.cos(hsv.h * Math.PI / 180) * (hsv.s * (size / 2 - 2));
  const selectorY = size / 2 + Math.sin(hsv.h * Math.PI / 180) * (hsv.s * (size / 2 - 2));

  const presets = [
    '#00f5ff', '#ff00ff', '#a855f7', '#ec4899',
    '#22c55e', '#eab308', '#f97316', '#ef4444',
    '#3b82f6', '#ffffff', '#94a3b8', '#1e293b'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{ position: 'relative', width: size, height: size, cursor: 'crosshair' }}
        onMouseDown={handleWheelMouseDown}
        onMouseMove={handleWheelMouseMove}
        onMouseUp={handleWheelMouseUp}
        onMouseLeave={handleWheelMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{
            display: 'block',
            borderRadius: '50%',
            boxShadow: '0 0 15px rgba(0, 245, 255, 0.3)',
            border: '2px solid rgba(0, 245, 255, 0.4)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: selectorX - 6,
            top: selectorY - 6,
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(255, 255, 255, 0.5)',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div style={{ width: '100%' }}>
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: 600
        }}>
          亮度
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            const newHsv = { ...hsv, v };
            setHsv(newHsv);
            onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
          }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        background: 'rgba(0, 245, 255, 0.06)',
        border: '1px solid rgba(0, 245, 255, 0.2)',
        borderRadius: 6,
      }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: color,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: `0 0 10px ${color}80`
          }}
        />
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#00f5ff',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}
        >
          {color}
        </span>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: 600
        }}>
          预设颜色
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {presets.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              title={c}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 4,
                border: color.toLowerCase() === c.toLowerCase()
                  ? '2px solid #00f5ff'
                  : '1px solid rgba(255, 255, 255, 0.15)',
                background: c,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: color.toLowerCase() === c.toLowerCase()
                  ? '0 0 8px rgba(0, 245, 255, 0.5)'
                  : 'none',
                padding: 0
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorWheel;
