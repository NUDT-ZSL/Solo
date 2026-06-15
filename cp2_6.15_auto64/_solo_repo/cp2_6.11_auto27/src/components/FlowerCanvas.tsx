import { useEffect, useRef, useCallback } from 'react';

interface FlowerCanvasProps {
  petalCount: number;
  scentType?: 'flower' | 'food' | 'nature' | 'city';
  textDescription: string;
  imageData?: string;
  bloomProgress?: number;
}

interface Petal {
  angle: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  cp3x: number;
  cp3y: number;
  cp4x: number;
  cp4y: number;
  length: number;
  width: number;
  tipRoundness: number;
}

const SCENT_COLORS: Record<string, string> = {
  flower: '#FFB6C1',
  food: '#FFBF00',
  nature: '#7CCD7C',
  city: '#6B7B8D',
};

const FlowerCanvas = ({
  petalCount,
  scentType,
  textDescription,
  imageData,
  bloomProgress = 1,
}: FlowerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const petalsRef = useRef<Petal[]>([]);
  const imagePatternRef = useRef<CanvasPattern | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const fpsRef = useRef<number[]>([]);
  const propsRef = useRef({ petalCount, scentType, textDescription, imageData, bloomProgress });

  useEffect(() => {
    propsRef.current = { petalCount, scentType, textDescription, imageData, bloomProgress };
  }, [petalCount, scentType, textDescription, imageData, bloomProgress]);

  const generatePetals = useCallback((count: number, text: string) => {
    const actualCount = Math.min(count, 20);
    const petals: Petal[] = [];
    const chars = text.slice(0, actualCount).padEnd(actualCount, ' ');

    for (let i = 0; i < actualCount; i++) {
      const charCode = chars.charCodeAt(i) || 32;
      const angle = (i / actualCount) * Math.PI * 2;

      const length = 50 + (charCode % 50);
      const width = 20 + ((charCode * 7) % 25);
      const tipRoundness = 0.3 + ((charCode * 3) % 50) / 100;

      const cp1x = width * 0.4 + (charCode % 8);
      const cp1y = -length * 0.15 - ((charCode * 2) % 10);
      const cp2x = width * 0.9 + ((charCode * 5) % 10);
      const cp2y = -length * 0.5 - ((charCode * 3) % 15);
      const cp3x = width * 0.7 + ((charCode * 4) % 8);
      const cp3y = -length * 0.85 - ((charCode * 2) % 10);
      const cp4x = width * 0.2 + (charCode % 6);
      const cp4y = -length + (charCode % 8);

      petals.push({
        angle,
        cp1x,
        cp1y,
        cp2x,
        cp2y,
        cp3x,
        cp3y,
        cp4x,
        cp4y,
        length,
        width,
        tipRoundness,
      });
    }
    return petals;
  }, []);

  useEffect(() => {
    petalsRef.current = generatePetals(petalCount, textDescription);
  }, [petalCount, textDescription, generatePetals]);

  useEffect(() => {
    if (!imageData) {
      imagePatternRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      imagePatternRef.current = ctx.createPattern(img, 'repeat');
    };
    img.src = imageData;
  }, [imageData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 400;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const drawPetalPath = (petal: Petal, time: number, bloom: number) => {
      const breathScale = 1 + Math.sin(time / 200 * Math.PI * 2 + petal.angle) * 0.05;
      const b = bloom;

      ctx.beginPath();
      ctx.moveTo(0, 0);

      ctx.bezierCurveTo(
        petal.cp1x * b * breathScale, petal.cp1y * b,
        petal.cp2x * b * breathScale, petal.cp2y * b,
        petal.cp3x * b * breathScale, petal.cp3y * b
      );

      ctx.bezierCurveTo(
        petal.cp4x * b * breathScale, petal.cp4y * b,
        -petal.cp4x * b * breathScale, petal.cp4y * b,
        -petal.cp3x * b * breathScale, petal.cp3y * b
      );

      ctx.bezierCurveTo(
        -petal.cp2x * b * breathScale, petal.cp2y * b,
        -petal.cp1x * b * breathScale, petal.cp1y * b,
        0, 0
      );

      ctx.closePath();
    };

    const drawFlower = (time: number) => {
      const { petalCount, scentType, bloomProgress } = propsRef.current;
      const baseColor = scentType ? SCENT_COLORS[scentType] : '#90EE90';

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const fps = 1000 / deltaTime;
      fpsRef.current.push(fps);
      if (fpsRef.current.length > 300) {
        fpsRef.current.shift();
      }
      frameCountRef.current++;
      if (frameCountRef.current % 300 === 0 && frameCountRef.current > 0) {
        const avgFps = fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length;
        console.log(`平均帧率: ${avgFps.toFixed(1)}fps`);
      }

      const centerX = size / 2;
      const centerY = size / 2;

      ctx.clearRect(0, 0, size, size);

      const bgGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, size / 2
      );
      bgGradient.addColorStop(0, '#FFF8DC');
      bgGradient.addColorStop(1, '#F5DEB3');
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 2 - 10, 0, Math.PI * 2);
      ctx.fill();

      const rotation = (time / 15000) * Math.PI * 2;

      const petals = petalsRef.current;
      const hasScent = scentType && petalCount > 0 && petals.length > 0;

      ctx.save();
      ctx.translate(centerX, centerY);

      if (!hasScent) {
        const budScale = 1 - bloomProgress * 0.3;

        ctx.save();
        ctx.scale(budScale, budScale);

        const budGradient = ctx.createRadialGradient(0, -10, 0, 0, -10, 50);
        budGradient.addColorStop(0, '#90EE90');
        budGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = budGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.quadraticCurveTo(8, -20, 5, 0);
        ctx.quadraticCurveTo(8, 20, 0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.quadraticCurveTo(-8, -20, -5, 0);
        ctx.quadraticCurveTo(-8, 20, 0, 35);
        ctx.stroke();

        ctx.restore();
      } else {
        ctx.rotate(rotation);

        for (let i = 0; i < petals.length; i++) {
          const petal = petals[i];
          const delay = (i / petals.length) * 0.3;
          const adjustedBloom = Math.max(0, Math.min(1, (bloomProgress - delay) / (1 - delay)));

          if (adjustedBloom <= 0) continue;

          ctx.save();
          ctx.rotate(petal.angle);

          drawPetalPath(petal, time, adjustedBloom);

          const petalGradient = ctx.createRadialGradient(
            0, 0, 0,
            0, -petal.length * adjustedBloom * 0.5, petal.length * adjustedBloom
          );
          petalGradient.addColorStop(0, adjustBrightness(baseColor, 20));
          petalGradient.addColorStop(0.5, baseColor);
          petalGradient.addColorStop(1, adjustBrightness(baseColor, -15));

          ctx.fillStyle = petalGradient;
          ctx.fill();

          if (imagePatternRef.current) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = imagePatternRef.current;
            ctx.fill();
            ctx.restore();
          }

          ctx.strokeStyle = adjustBrightness(baseColor, -25);
          ctx.lineWidth = 0.8;
          ctx.stroke();

          ctx.restore();
        }

        const centerScale = 0.5 + bloomProgress * 0.5;
        ctx.save();
        ctx.scale(centerScale, centerScale);

        const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
        centerGradient.addColorStop(0, '#FFD700');
        centerGradient.addColorStop(0.5, '#FFA500');
        centerGradient.addColorStop(1, '#CD853F');

        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 8; i++) {
          const dotAngle = (i / 8) * Math.PI * 2 + rotation * 0.5;
          const dotX = Math.cos(dotAngle) * 12;
          const dotY = Math.sin(dotAngle) * 12;
          ctx.fillStyle = '#FFF8DC';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();

      animationRef.current = requestAnimationFrame(drawFlower);
    };

    animationRef.current = requestAnimationFrame(drawFlower);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        margin: '0 auto',
        borderRadius: '50%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      }}
    />
  );
};

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export default FlowerCanvas;
