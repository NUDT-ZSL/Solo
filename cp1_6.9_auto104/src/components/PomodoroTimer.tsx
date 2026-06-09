import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface PomodoroTimerProps {
  duration: number;
  remaining: number;
  isRunning: boolean;
  mode: 'work' | 'break' | 'idle';
}

export interface PomodoroTimerHandle {
  playSound: () => void;
}

const PomodoroTimer = forwardRef<PomodoroTimerHandle, PomodoroTimerProps>(
  ({ duration, remaining, isRunning, mode }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const animationRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    useImperativeHandle(ref, () => ({
      playSound: () => {
        playCompletionSound();
      },
    }));

    const playCompletionSound = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        const now = ctx.currentTime;
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.setValueAtTime(640, now + 0.3);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        oscillator.start(now);
        oscillator.stop(now + 0.8);
      } catch (e) {
        console.error('播放声音失败:', e);
      }
    };

    const interpolateColor = (progress: number): string => {
      const colors = [
        { r: 74, g: 144, b: 217 },
        { r: 255, g: 165, b: 0 },
        { r: 239, g: 68, b: 68 },
      ];
      if (progress <= 0.5) {
        const t = progress * 2;
        const r = Math.round(colors[0].r + (colors[1].r - colors[0].r) * t);
        const g = Math.round(colors[0].g + (colors[1].g - colors[0].g) * t);
        const b = Math.round(colors[0].b + (colors[1].b - colors[0].b) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (progress - 0.5) * 2;
        const r = Math.round(colors[1].r + (colors[2].r - colors[1].r) * t);
        const g = Math.round(colors[1].g + (colors[2].g - colors[1].g) * t);
        const b = Math.round(colors[1].b + (colors[2].b - colors[1].b) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = 320;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);

      const draw = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const pulseProgress = (elapsed % 2000) / 2000;
        const pulseScale = 1 + 0.025 * Math.sin(pulseProgress * Math.PI * 2);

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        const centerX = size / 2;
        const centerY = size / 2;
        const scale = isRunning ? pulseScale : 1;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        const radius = 120;
        const lineWidth = 16;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (mode !== 'idle') {
          const progress = 1 - remaining / duration;
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + progress * Math.PI * 2;
          const ringColor = interpolateColor(progress);

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, startAngle, endAngle);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.shadowColor = ringColor;
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.restore();

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeStr, size / 2, size / 2 - 10);

        let statusText = '';
        if (mode === 'work') statusText = '专注中';
        else if (mode === 'break') statusText = '休息中';
        else statusText = '准备开始';

        ctx.fillStyle = mode === 'break' ? '#52c41a' : '#4a90d9';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(statusText, size / 2, size / 2 + 40);

        animationRef.current = requestAnimationFrame(draw);
      };

      animationRef.current = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(animationRef.current);
      };
    }, [duration, remaining, isRunning, mode]);

    return (
      <div className="timer-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

PomodoroTimer.displayName = 'PomodoroTimer';

export default PomodoroTimer;
