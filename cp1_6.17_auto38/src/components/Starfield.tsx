import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface StarfieldHandle {
  start: () => void;
  stop: () => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

const Starfield = forwardRef<StarfieldHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const runningRef = useRef(false);
  const startTimeRef = useRef(0);

  useImperativeHandle(ref, () => ({
    start: () => {
      if (!runningRef.current && canvasRef.current) {
        runningRef.current = true;
        startTimeRef.current = performance.now();
        initStars();
        animate();
      }
    },
    stop: () => {
      runningRef.current = false;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }));

  const initStars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const count = Math.floor((canvas.width * canvas.height) / 3000);
    const stars: Star[] = [];

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 3,
        baseAlpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        period: 2000 + Math.random() * 2000
      });
    }

    starsRef.current = stars;
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  const animate = () => {
    if (!runningRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now() - startTimeRef.current;
    const w = canvas.width;
    const h = canvas.height;

    drawBackground(ctx, w, h);

    const stars = starsRef.current;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin((now / star.period) * Math.PI * 2 + star.phase));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (runningRef.current) {
      initStars();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', handleResize);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawBackground(ctx, canvas.width, canvas.height);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      runningRef.current = false;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        display: 'block'
      }}
    />
  );
});

Starfield.displayName = 'Starfield';

export default Starfield;
