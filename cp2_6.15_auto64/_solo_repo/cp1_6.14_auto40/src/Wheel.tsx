import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Prize, randomRange, FrameRateMonitor, FrameMetrics } from './utils';

interface WheelProps {
  prizes: Prize[];
  onSpinComplete: (winnerIndex: number) => void;
  disabled?: boolean;
  diameter?: number;
}

export interface WheelHandle {
  startSpin: () => void;
}

const Wheel = forwardRef<WheelHandle, WheelProps>(({ prizes, onSpinComplete, disabled = false, diameter }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const bulbPhaseRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsMonitorRef = useRef<FrameRateMonitor | null>(null);
  const bulbTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fpsMonitorRef.current = new FrameRateMonitor((metrics: FrameMetrics) => {
      if (isSpinningRef.current) {
        console.debug(`[Perf] 转盘动画帧率: ${metrics.fps}fps, 每帧: ${metrics.frameTime.toFixed(2)}ms`);
      }
    });

    return () => {
      fpsMonitorRef.current?.stop();
    };
  }, []);

  const getDiameter = useCallback(() => {
    if (diameter) return diameter;
    const screenHeight = window.innerHeight;
    return screenHeight * 0.6;
  }, [diameter]);

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const d = getDiameter();
    const dpr = window.devicePixelRatio || 1;
    const centerX = d / 2;
    const centerY = d / 2;
    const radius = d / 2 - 20;

    canvas.width = d * dpr;
    canvas.height = d * dpr;
    canvas.style.width = `${d}px`;
    canvas.style.height = `${d}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, d, d);

    const segmentAngle = (Math.PI * 2) / prizes.length;

    for (let i = 0; i < prizes.length; i++) {
      const startAngle = rotation + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const prize = prizes[i];

      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
      gradient.addColorStop(0, prize.color);
      gradient.addColorStop(1, adjustBrightness(prize.color, -20));

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle - Math.PI / 2, endAngle - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const textAngle = startAngle + segmentAngle / 2 - Math.PI / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(14, d * 0.04)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(prize.name, 0, -8);
      ctx.font = `${Math.max(12, d * 0.03)}px sans-serif`;
      ctx.fillText(`${prize.count}人`, 0, 12);
      ctx.restore();
    }

    const bulbRadius = radius + 10;
    const bulbDiameter = 8;
    const bulbInterval = 3;
    const bulbCount = Math.floor((Math.PI * 2 * bulbRadius) / (bulbDiameter + bulbInterval));
    const bulbAngleStep = (Math.PI * 2) / bulbCount;

    for (let i = 0; i < bulbCount; i++) {
      const angle = i * bulbAngleStep;
      const x = centerX + Math.cos(angle) * bulbRadius;
      const y = centerY + Math.sin(angle) * bulbRadius;

      const phase = (bulbPhaseRef.current + i * 0.1) % 1;
      const brightness = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      const color = brightness > 0.5 
        ? `rgba(255, 215, 0, ${0.8 + brightness * 0.2})`
        : `rgba(255, 255, 255, ${0.6 + brightness * 0.4})`;

      ctx.beginPath();
      ctx.arc(x, y, bulbDiameter / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      const gradient2 = ctx.createRadialGradient(x, y, 0, x, y, bulbDiameter);
      gradient2.addColorStop(0, `rgba(255, 215, 0, ${0.4 * brightness})`);
      gradient2.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.beginPath();
      ctx.arc(x, y, bulbDiameter, 0, Math.PI * 2);
      ctx.fillStyle = gradient2;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.8)';
    ctx.lineWidth = 4;
    ctx.stroke();

    const indicatorY = centerY - radius - 30;
    ctx.beginPath();
    ctx.moveTo(centerX - 15, indicatorY - 10);
    ctx.lineTo(centerX + 15, indicatorY - 10);
    ctx.lineTo(centerX, indicatorY + 15);
    ctx.closePath();
    ctx.fillStyle = '#e94560';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [prizes, getDiameter]);

  const startSpin = useCallback(() => {
    if (isSpinningRef.current || disabled || prizes.length === 0) return;

    const start = performance.now();
    isSpinningRef.current = true;
    fpsMonitorRef.current?.start();

    const targetIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;

    const initialVelocity = randomRange(300, 500);
    const extraSpins = randomRange(5, 8);
    const targetAngle = 360 * extraSpins + (targetIndex * segmentAngle + segmentAngle / 2);
    const currentRotation = rotationRef.current % 360;
    const totalRotation = targetAngle - currentRotation;

    const requiredDeceleration = (initialVelocity * initialVelocity) / (2 * totalRotation);

    let currentVelocity = initialVelocity;
    let accumulatedRotation = 0;
    lastFrameTimeRef.current = performance.now();

    const animate = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const deltaSeconds = Math.min(deltaTime / 1000, 0.033);

      const remainingRotation = totalRotation - accumulatedRotation;

      let dynamicDeceleration = requiredDeceleration;
      if (remainingRotation < totalRotation * 0.3) {
        const slowdownFactor = 1 + (1 - remainingRotation / (totalRotation * 0.3)) * 2;
        dynamicDeceleration = requiredDeceleration * slowdownFactor;
      }

      currentVelocity -= dynamicDeceleration * deltaSeconds;

      if (currentVelocity < 20 && remainingRotation < 10) {
        currentVelocity = Math.max(5, remainingRotation / 0.5);
      }

      if (currentVelocity < 0) {
        currentVelocity = 0;
      }

      const deltaAngle = currentVelocity * deltaSeconds;
      accumulatedRotation += deltaAngle;

      console.debug(
        `[Wheel] 速度: ${currentVelocity.toFixed(1)}deg/s, ` +
        `已转: ${accumulatedRotation.toFixed(1)}deg, ` +
        `剩余: ${remainingRotation.toFixed(1)}deg, ` +
        `减速度: ${dynamicDeceleration.toFixed(2)}deg/s²`
      );

      if (accumulatedRotation >= totalRotation || currentVelocity <= 0) {
        rotationRef.current = targetAngle;
        drawWheel((rotationRef.current * Math.PI) / 180);

        isSpinningRef.current = false;
        fpsMonitorRef.current?.stop();

        const totalDuration = performance.now() - start;
        console.debug(
          `[Perf] 转盘动画总耗时: ${totalDuration.toFixed(2)}ms, ` +
          `总旋转: ${totalRotation.toFixed(0)}deg, ` +
          `初始速度: ${initialVelocity.toFixed(0)}deg/s`
        );

        onSpinComplete(targetIndex);
        return;
      }

      rotationRef.current += deltaAngle;
      drawWheel((rotationRef.current * Math.PI) / 180);

      fpsMonitorRef.current?.tick();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [prizes, disabled, drawWheel, onSpinComplete]);

  useImperativeHandle(ref, () => ({
    startSpin
  }), [startSpin]);

  useEffect(() => {
    if (!isSpinningRef.current) {
      drawWheel((rotationRef.current * Math.PI) / 180);
    }
  }, [prizes, drawWheel]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      bulbPhaseRef.current = (bulbPhaseRef.current + 0.5) % 1;
      if (!isSpinningRef.current) {
        drawWheel((rotationRef.current * Math.PI) / 180);
      }
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [drawWheel]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (bulbTimerRef.current) {
        cancelAnimationFrame(bulbTimerRef.current);
      }
    };
  }, []);

  const d = getDiameter();

  return (
    <canvas
      ref={canvasRef}
      className="wheel-canvas"
      width={d}
      height={d}
      style={{ width: d, height: d }}
    />
  );
});

Wheel.displayName = 'Wheel';

export default React.memo(Wheel);

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
