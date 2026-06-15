import React, { useRef, useEffect, useState, useCallback } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  size?: number;
  centerSnap?: boolean;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  size = 50,
  centerSnap = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(value);

  const range = max - min;
  const percent = (value - min) / range;
  const angle = -135 + percent * 270;

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 4;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2A3A4A';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1A1F3A';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, (Math.PI * -135) / 180, (Math.PI * angle) / 180);
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    const indicatorAngle = (angle - 90) * (Math.PI / 180);
    const indicatorLength = radius - 10;
    const indicatorX = centerX + Math.cos(indicatorAngle) * indicatorLength;
    const indicatorY = centerY + Math.sin(indicatorAngle) * indicatorLength;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(indicatorX, indicatorY);
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4ECDC4';
    ctx.fill();
  }, [size, angle]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startYRef.current - e.clientY;
      const sensitivity = centerSnap ? 0.5 : 0.3;
      let newValue = startValueRef.current + (deltaY * range * sensitivity) / 100;

      if (centerSnap) {
        const center = (min + max) / 2;
        if (Math.abs(newValue - center) < 3) {
          newValue = center;
        }
      }

      newValue = Math.max(min, Math.min(max, newValue));
      newValue = Math.round(newValue / step) * step;

      setDisplayValue(newValue);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, range, step, onChange, centerSnap]);

  return (
    <div className="knob-group">
      {label && <span className="knob-label">{label}</span>}
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          cursor: isDragging ? 'ns-resize' : 'pointer',
          filter: isDragging ? 'brightness(1.1)' : 'none',
          transition: 'filter 0.1s ease',
        }}
        onMouseDown={handleMouseDown}
      />
      <span className="knob-value">{Math.round(displayValue)}</span>
    </div>
  );
};
