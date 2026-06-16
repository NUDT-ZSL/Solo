import { useEffect, useRef } from 'react';

interface SmellWaveCanvasProps {
  width?: number;
  height?: number;
}

export function SmellWaveCanvas({ width = 280, height = 120 }: SmellWaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseXRef = useRef(width / 2);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = e.clientX - rect.left;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, width, height);

      timeRef.current += 0.02;
      const mouseX = mouseXRef.current;
      const frequency = 0.02 + (mouseX / width) * 0.08;
      const amplitude = 15 + (mouseX / width) * 25;

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(1, '#d97706');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const offset = wave * 0.8;
        const waveOpacity = 1 - wave * 0.3;
        ctx.globalAlpha = waveOpacity;

        for (let x = 0; x <= width; x += 2) {
          const y =
            height / 2 +
            Math.sin(x * frequency + timeRef.current + offset) * amplitude +
            Math.sin(x * frequency * 2.5 + timeRef.current * 1.5 + offset) * (amplitude * 0.3);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        borderRadius: '8px',
        backgroundColor: 'rgba(253, 230, 138, 0.15)',
      }}
    />
  );
}
