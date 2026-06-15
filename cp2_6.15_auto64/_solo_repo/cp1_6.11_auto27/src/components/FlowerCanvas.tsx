import { useEffect, useRef, useMemo } from 'react';
import type { ScentType } from '../types';
import { SCENT_COLORS } from '../types';

interface FlowerCanvasProps {
  petalCount: number;
  baseColor: ScentType;
  textDescription: string;
  imageData?: string;
  size?: number;
  isBloomed?: boolean;
  bloomProgress?: number;
}

interface PetalShape {
  width: number;
  length: number;
  curve1: number;
  curve2: number;
  tipCurve: number;
}

const MAX_PETALS = 20;
const ROTATION_PERIOD = 15000;
const BREATH_PERIOD = 200;

const generatePetalShape = (charCode: number): PetalShape => {
  const normalized = (charCode % 100) / 100;
  return {
    width: 15 + normalized * 20,
    length: 50 + (charCode % 50),
    curve1: 0.2 + (charCode % 30) / 100,
    curve2: 0.5 + (charCode % 40) / 100,
    tipCurve: 0.3 + (charCode % 50) / 100,
  };
};

const textToPetalShapes = (text: string, count: number): PetalShape[] => {
  const shapes: PetalShape[] = [];
  for (let i = 0; i < count; i++) {
    const charCode = text.charCodeAt(i % text.length) || 97;
    shapes.push(generatePetalShape(charCode + i * 7));
  }
  return shapes;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 182, b: 193 };
};

const FlowerCanvas = ({
  petalCount,
  baseColor,
  textDescription,
  imageData,
  size = 300,
  isBloomed = true,
  bloomProgress = 1,
}: FlowerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const imageTextureRef = useRef<HTMLImageElement | null>(null);

  const color = SCENT_COLORS[baseColor];
  const rgbColor = useMemo(() => hexToRgb(color), [color]);

  const petalShapes = useMemo(() => {
    const count = Math.min(petalCount, MAX_PETALS);
    if (count === 0) return [];
    const text = textDescription || '花香四溢';
    return textToPetalShapes(text, count);
  }, [petalCount, textDescription]);

  useEffect(() => {
    if (imageData) {
      const img = new Image();
      img.onload = () => {
        imageTextureRef.current = img;
      };
      img.src = imageData;
    } else {
      imageTextureRef.current = null;
    }
  }, [imageData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;

    const drawPetal = (
      x: number,
      y: number,
      angle: number,
      shape: PetalShape,
      scale: number,
      breathScale: number,
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const petalLength = shape.length * scale * breathScale;
      const petalWidth = shape.width * scale * breathScale;

      const gradient = ctx.createLinearGradient(0, 0, 0, -petalLength);
      gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.9)`);
      gradient.addColorStop(0.5, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.7)`);
      gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.4)`);

      ctx.beginPath();
      ctx.moveTo(0, 0);

      const cp1x = -petalWidth * shape.curve1;
      const cp1y = -petalLength * 0.3;
      const cp2x = -petalWidth * shape.curve2;
      const cp2y = -petalLength * 0.7;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, 0, -petalLength);

      const cp3x = petalWidth * shape.curve2;
      const cp3y = -petalLength * 0.7;
      const cp4x = petalWidth * shape.curve1;
      const cp4y = -petalLength * 0.3;

      ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, 0, 0);

      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      if (imageTextureRef.current) {
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(
          imageTextureRef.current,
          -petalWidth,
          -petalLength,
          petalWidth * 2,
          petalLength,
        );
        ctx.restore();
      }

      ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    const drawCenter = (radius: number) => {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#FFFACD');
      gradient.addColorStop(0.5, '#FFD700');
      gradient.addColorStop(1, '#FFA500');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      for (let i = 0; i < 12; i++) {
        const dotAngle = (i / 12) * Math.PI * 2;
        const dotDist = radius * 0.5;
        const dotX = centerX + Math.cos(dotAngle) * dotDist;
        const dotY = centerY + Math.sin(dotAngle) * dotDist;

        ctx.beginPath();
        ctx.arc(dotX, dotY, radius * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 69, 19, 0.6)';
        ctx.fill();
      }
    };

    const draw = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      const rotationAngle = (elapsed / ROTATION_PERIOD) * Math.PI * 2;
      const breathPhase = (elapsed % BREATH_PERIOD) / BREATH_PERIOD;
      const breathScale = 1 + Math.sin(breathPhase * Math.PI * 2) * 0.03;

      ctx.clearRect(0, 0, size, size);

      const bloomScale = isBloomed ? bloomProgress : 0.2;

      if (petalShapes.length > 0 && bloomScale > 0.1) {
        for (let i = 0; i < petalShapes.length; i++) {
          const petalAngle = (i / petalShapes.length) * Math.PI * 2 + rotationAngle;
          const petalBloomDelay = i / petalShapes.length * 0.3;
          const petalScale = Math.max(0, Math.min(1, (bloomScale - petalBloomDelay) / (1 - petalBloomDelay)));
          
          if (petalScale > 0) {
            drawPetal(
              centerX,
              centerY,
              petalAngle,
              petalShapes[i],
              petalScale,
              breathScale,
            );
          }
        }
      }

      const centerRadius = 18 * bloomScale + 8;
      drawCenter(centerRadius);

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [size, petalShapes, rgbColor, isBloomed, bloomProgress]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
      }}
    />
  );
};

export default FlowerCanvas;
