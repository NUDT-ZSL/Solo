import { useEffect, useRef } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  angle: number;
  color: string;
}

const PETAL_COLORS = [
  'rgba(200, 149, 108, ',
  'rgba(212, 165, 116, ',
  'rgba(166, 124, 82, ',
  'rgba(232, 195, 185, ',
  'rgba(250, 248, 245, ',
];

function createPetal(width: number, height: number): Petal {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 4,
    speed: 0.3 + Math.random() * 0.7,
    opacity: 0.2 + Math.random() * 0.3,
    drift: 0.3 + Math.random() * 0.5,
    angle: Math.random() * Math.PI * 2,
    color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
  };
}

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const petalCount = 30 + Math.floor(Math.random() * 11);
    const petals: Petal[] = [];
    for (let i = 0; i < petalCount; i++) {
      petals.push(createPetal(width, height));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (const petal of petals) {
        petal.y += petal.speed;
        petal.x += Math.sin(petal.angle) * petal.drift;
        petal.angle += 0.01;

        if (petal.y > height + 10) {
          petal.y = -10;
          petal.x = Math.random() * width;
        }

        const fillStyle = petal.color + petal.opacity + ')';
        ctx.beginPath();
        ctx.arc(petal.x, petal.y, petal.size, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.shadowBlur = petal.size * 2;
        ctx.shadowColor = fillStyle;
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block fixed inset-0 pointer-events-none z-0"
    />
  );
}
