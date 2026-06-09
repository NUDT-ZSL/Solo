import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CoffeeBean } from './api';

interface WheelProps {
  beanList: CoffeeBean[];
  onSpin: (beanId: number) => void;
  selectedBeanId: number | null;
  selectedBeanName: string | null;
}

const COLOR_PALETTE = [
  '#D4A574', '#8B5E3C', '#C49A6C', '#7B4A2A',
  '#B87333', '#6F4E37', '#A0522D', '#5C4033'
];

const OUTER_RADIUS = 300;
const INNER_RADIUS = 120;
const DAMPING = 0.92;
const INERTIA_DURATION = 500;

const Wheel: React.FC<WheelProps> = ({ beanList, onSpin, selectedBeanId, selectedBeanName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const inertiaEndTimeRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setCanvasSize({ width: 300, height: 300 });
      } else if (width < 768) {
        setCanvasSize({ width: 400, height: 400 });
      } else {
        setCanvasSize({ width: 600, height: 600 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getAngleFromPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX);
  }, []);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || beanList.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scale = canvasSize.width / 600;
    const outerR = OUTER_RADIUS * scale;
    const innerR = INNER_RADIUS * scale;
    const labelR = (outerR + innerR) / 2 + 10 * scale;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const segmentAngle = (2 * Math.PI) / beanList.length;

    beanList.forEach((bean, index) => {
      const startAngle = angleRef.current + index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      const isSelected = bean.id === selectedBeanId;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerR, endAngle, startAngle, true);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, innerR, centerX, centerY, outerR);
      const baseColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
      gradient.addColorStop(0, lightenColor(baseColor, 20));
      gradient.addColorStop(1, baseColor);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.stroke();

      const midAngle = startAngle + segmentAngle / 2;
      const labelX = centerX + labelR * Math.cos(midAngle);
      const labelY = centerY + labelR * Math.sin(midAngle);

      ctx.save();
      ctx.translate(labelX, labelY);
      ctx.rotate(midAngle + Math.PI / 2);

      if (isSelected) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        const labelWidth = 90 * scale;
        const labelHeight = 30 * scale;
        roundRect(ctx, -labelWidth / 2, -labelHeight / 2, labelWidth, labelHeight, 5 * scale);
        ctx.fill();
      }

      ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
      ctx.font = `bold ${isSelected ? 20 : 16}px 'Playfair Display', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = isSelected ? 6 : 3;
      ctx.fillText(bean.name, 0, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFF8E7';
    ctx.fill();
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 3;
    ctx.stroke();

    const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerR * 0.8);
    innerGradient.addColorStop(0, 'rgba(212, 165, 116, 0.1)');
    innerGradient.addColorStop(1, 'rgba(212, 165, 116, 0.3)');
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerR * 0.8, 0, 2 * Math.PI);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    ctx.fillStyle = '#5C4033';
    ctx.font = `${22 * scale}px 'Playfair Display', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☕', centerX, centerY - 10 * scale);
    ctx.font = `${14 * scale}px 'Montserrat', sans-serif`;
    ctx.fillStyle = '#8B5E3C';
    ctx.fillText('Coffee Wheel', centerX, centerY + 18 * scale);
  }, [beanList, selectedBeanId, canvasSize]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const animate = useCallback(() => {
    const now = performance.now();
    
    if (isDraggingRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    if (now < inertiaEndTimeRef.current && Math.abs(velocityRef.current) > 0.0001) {
      velocityRef.current *= DAMPING;
      angleRef.current += velocityRef.current;
      drawWheel();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (now >= inertiaEndTimeRef.current) {
      const segmentAngle = (2 * Math.PI) / beanList.length;
      let normalizedAngle = ((angleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const topPointerAngle = (3 * Math.PI / 2 - normalizedAngle + segmentAngle / 2) % (2 * Math.PI);
      const selectedIndex = Math.floor(topPointerAngle / segmentAngle) % beanList.length;
      
      if (beanList[selectedIndex]) {
        onSpin(beanList[selectedIndex].id);
      }
      return;
    }
  }, [beanList, drawWheel, onSpin]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastAngleRef.current = getAngleFromPosition(e.clientX, e.clientY);
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    cancelAnimationFrame(animationFrameRef.current);
  }, [getAngleFromPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const currentAngle = getAngleFromPosition(e.clientX, e.clientY);
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    let deltaAngle = currentAngle - lastAngleRef.current;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    
    angleRef.current += deltaAngle;
    
    if (deltaTime > 0) {
      velocityRef.current = deltaAngle / deltaTime * 16;
    }
    
    lastAngleRef.current = currentAngle;
    lastTimeRef.current = now;
    drawWheel();
  }, [getAngleFromPosition, drawWheel]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    inertiaEndTimeRef.current = performance.now() + INERTIA_DURATION;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      handleMouseUp();
    }
  }, [handleMouseUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    isDraggingRef.current = true;
    lastAngleRef.current = getAngleFromPosition(touch.clientX, touch.clientY);
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    cancelAnimationFrame(animationFrameRef.current);
  }, [getAngleFromPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const currentAngle = getAngleFromPosition(touch.clientX, touch.clientY);
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    let deltaAngle = currentAngle - lastAngleRef.current;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    
    angleRef.current += deltaAngle;
    
    if (deltaTime > 0) {
      velocityRef.current = deltaAngle / deltaTime * 16;
    }
    
    lastAngleRef.current = currentAngle;
    lastTimeRef.current = now;
    drawWheel();
  }, [getAngleFromPosition, drawWheel]);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    inertiaEndTimeRef.current = performance.now() + INERTIA_DURATION;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="wheel-container" ref={containerRef}>
      <div className="pointer" />
      <canvas
        ref={canvasRef}
        className="wheel-canvas"
        style={{ width: canvasSize.width / 2, height: canvasSize.height / 2 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {selectedBeanName && (
        <div className="selected-bean-name">
          {selectedBeanName}
        </div>
      )}
    </div>
  );
};

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export default Wheel;
