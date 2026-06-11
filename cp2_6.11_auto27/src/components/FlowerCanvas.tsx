import { useEffect, useRef, useCallback } from 'react';

interface FlowerCanvasProps {
  petalCount: number;
  baseColor: string;
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
  width: number;
}

const FlowerCanvas = ({
  petalCount,
  baseColor,
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

  const generatePetals = useCallback((count: number, text: string) => {
    const petals: Petal[] = [];
    const chars = text.padEnd(count, ' ').slice(0, count);

    for (let i = 0; i < count; i++) {
      const charCode = chars.charCodeAt(i) || 32;
      const angle = (i / count) * Math.PI * 2;
      const normalized = (charCode % 100) / 100;

      petals.push({
        angle,
        cp1x: 20 + normalized * 30,
        cp1y: -30 - (charCode % 20),
        cp2x: 40 + normalized * 20,
        cp2y: -60 - (charCode % 15),
        length: 60 + (charCode % 40),
        width: 15 + (charCode % 10),
      });
    }
    return petals;
  }, []);

  useEffect(() => {
    if (petalCount > 0) {
      petalsRef.current = generatePetals(petalCount, textDescription);
    }
  }, [petalCount, textDescription, generatePetals]);

  useEffect(() => {
    if (!imageData) {
      imagePatternRef.current = null;
      return;
    }

    const img = new Image();
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
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const fps = 1000 / deltaTime;
      fpsRef.current.push(fps);
      if (fpsRef.current.length > 60) {
        fpsRef.current.shift();
      }
      const avgFps = fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length;
      if (frameCountRef.current % 300 === 0) {
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
      if (petals.length === 0) {
        const closedScale = 0.3 + bloomProgress * 0.7;
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
        const bloomScale = bloomProgress;

        ctx.save();
        ctx.rotate(petal.angle);

        const petalGradient = ctx.createLinearGradient(0, 0, 0, -petal.length * bloomScale);
        petalGradient.addColorStop(0, baseColor);
        petalGradient.addColorStop(1, adjustBrightness(baseColor, 30));

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          -petal.width / 2 * bloomScale, petal.cp1y * bloomScale,
          -petal.width * bloomScale, petal.cp2y * bloomScale,
          0, -petal.length * bloomScale
        );
        ctx.bezierCurveTo(
          petal.width * bloomScale, petal.cp2y * bloomScale,
          petal.width / 2 * bloomScale, petal.cp1y * bloomScale,
          0, 0
        );

        ctx.fillStyle = petalGradient;
        ctx.fill();

        if (imagePatternRef.current) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = imagePatternRef.current;
          ctx.fill();
          ctx.globalAlpha = 1;
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
  }, [baseColor]);

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
