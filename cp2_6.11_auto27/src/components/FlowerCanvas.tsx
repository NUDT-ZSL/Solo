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
  length: number;
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
      const normalized = (charCode % 100) / 100;

      petals.push({
        angle,
        cp1x: -30 - (charCode % 20),
        cp1y: -30 - normalized * 30,
        cp2x: -50 - (charCode % 15),
        cp2y: -60 - normalized * 20,
        length: 60 + (charCode % 40),
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

    const drawFlower = (time: number) => {
      const { petalCount, scentType, bloomProgress } = propsRef.current;
      const baseColor = scentType ? SCENT_COLORS[scentType] : '#90EE90';

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const fps = 1000 / deltaTime;
      fpsRef.current.push(fps);
      if (fpsRef.current.length > 60) {
        fpsRef.current.shift();
      }
      const avgFps = fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length;
      if (frameCountRef.current % 300 === 0 && frameCountRef.current > 0) {
        console.log(`平均帧率: ${avgFps.toFixed(1)}fps`);
      }

      frameCountRef.current++;
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
      const breathScale = 1 + Math.sin(time / 200 * Math.PI * 2) * 0.05;

      const petals = petalsRef.current;
      if (petalCount === 0 || petals.length === 0) {
        const closedScale = bloomProgress;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(closedScale, closedScale);

        const budGradient = ctx.createRadialGradient(0, -10, 0, 0, -10, 50);
        budGradient.addColorStop(0, '#90EE90');
        budGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = budGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        animationRef.current = requestAnimationFrame(drawFlower);
        return;
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(breathScale, breathScale);

      for (let i = 0; i < petals.length; i++) {
        const petal = petals[i];
        const currentBloom = bloomProgress;

        ctx.save();
        ctx.rotate(petal.angle);

        const petalGradient = ctx.createLinearGradient(0, 0, 0, -petal.length * currentBloom);
        petalGradient.addColorStop(0, baseColor);
        petalGradient.addColorStop(1, adjustBrightness(baseColor, 30));

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          petal.cp1x * currentBloom, petal.cp1y * currentBloom,
          petal.cp2x * currentBloom, petal.cp2y * currentBloom,
          0, -petal.length * currentBloom
        );
        ctx.bezierCurveTo(
          -petal.cp2x * currentBloom, petal.cp2y * currentBloom,
          -petal.cp1x * currentBloom, petal.cp1y * currentBloom,
          0, 0
        );

        ctx.fillStyle = petalGradient;
        ctx.fill();

        if (imagePatternRef.current) {
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = imagePatternRef.current;
          ctx.fill();
          ctx.restore();
        }

        ctx.strokeStyle = adjustBrightness(baseColor, -20);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
      centerGradient.addColorStop(0, '#FFD700');
      centerGradient.addColorStop(0.5, '#FFA500');
      centerGradient.addColorStop(1, '#CD853F');

      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 8; i++) {
        const dotAngle = (i / 8) * Math.PI * 2;
        const dotX = Math.cos(dotAngle) * 12;
        const dotY = Math.sin(dotAngle) * 12;
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fill();
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
