import { useRef, useEffect, useCallback, useState } from 'react';
import { Page } from '@/data/books';
import {
  SentenceParticleGroup,
  buildPageParticleGroups,
  isPointInGroupBounds,
  updateParticles,
  drawParticles,
} from '@/utils/textParticles';

interface BookCanvasProps {
  page: Page;
  theme: 'dark' | 'parchment';
  onPageChange?: (direction: 'next' | 'prev') => void;
  isTransitioning: boolean;
}

function generatePaperTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
) {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * intensity;
    data[i] = noise;
    data[i + 1] = noise;
    data[i + 2] = noise;
    data[i + 3] = 15 + intensity * 0.5;
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: 'dark' | 'parchment',
  transitionProgress: number
) {
  if (theme === 'dark') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#0f0f1a');
    grad.addColorStop(1, '#0a0a0f');
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f5e6c8');
    grad.addColorStop(0.5, '#eddcb5');
    grad.addColorStop(1, '#d4b896');
    ctx.fillStyle = grad;
  }
  ctx.fillRect(0, 0, w, h);
}

function drawPageCurlEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  theme: 'dark' | 'parchment'
) {
  if (progress <= 0 || progress >= 1) return;

  const eased = 1 - Math.pow(1 - progress, 3);
  const curlX = w * eased;
  const curlWidth = 80 * (1 - eased);

  ctx.save();

  const shadowGrad = ctx.createLinearGradient(
    curlX - 40, 0,
    curlX + curlWidth, 0
  );
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(curlX - 40, 0, curlWidth + 80, h);

  const curlGrad = ctx.createLinearGradient(
    curlX, 0,
    curlX + 30, 0
  );
  if (theme === 'dark') {
    curlGrad.addColorStop(0, 'rgba(30,30,50,0.9)');
    curlGrad.addColorStop(1, 'rgba(15,15,25,0.7)');
  } else {
    curlGrad.addColorStop(0, 'rgba(210,190,150,0.9)');
    curlGrad.addColorStop(1, 'rgba(180,160,120,0.7)');
  }
  ctx.fillStyle = curlGrad;

  ctx.beginPath();
  ctx.moveTo(curlX, 0);
  const cp1x = curlX + 15;
  const cp1y = h / 2;
  const endX = curlX + 8;
  ctx.quadraticCurveTo(cp1x, cp1y, endX, h);
  ctx.lineTo(curlX, h);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, theme: 'dark' | 'parchment') {
  const vignetteColor = theme === 'dark'
    ? 'rgba(0,0,0,0.5)'
    : 'rgba(100,70,30,0.15)';
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.3,
    w / 2, h / 2, Math.max(w, h) * 0.75
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, vignetteColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export default function BookCanvas({
  page,
  theme,
  onPageChange,
  isTransitioning,
}: BookCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupsRef = useRef<SentenceParticleGroup[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const hoveredGroupRef = useRef<number | null>(null);
  const paperTextureRef = useRef<HTMLCanvasElement | null>(null);
  const transitionStartRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const rebuildGroups = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    groupsRef.current = buildPageParticleGroups(page, w, h, theme);
    startTimeRef.current = performance.now();
    hoveredGroupRef.current = null;
  }, [page, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      setCanvasSize({ w: canvas.width, h: canvas.height });

      const texCanvas = document.createElement('canvas');
      texCanvas.width = canvas.width;
      texCanvas.height = canvas.height;
      const texCtx = texCanvas.getContext('2d');
      if (texCtx) {
        generatePaperTexture(texCtx, canvas.width, canvas.height, theme === 'parchment' ? 40 : 18);
      }
      paperTextureRef.current = texCanvas;

      rebuildGroups();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [rebuildGroups, theme]);

  useEffect(() => {
    rebuildGroups();
  }, [rebuildGroups]);

  useEffect(() => {
    if (isTransitioning) {
      transitionStartRef.current = performance.now();
    }
  }, [isTransitioning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const animate = (now: number) => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      const elapsed = now - startTimeRef.current;

      ctx.clearRect(0, 0, w, h);
      drawBackground(ctx, w, h, theme, 1);

      if (paperTextureRef.current) {
        ctx.globalAlpha = theme === 'parchment' ? 0.25 : 0.08;
        ctx.drawImage(paperTextureRef.current, 0, 0);
        ctx.globalAlpha = 1;
      }

      drawVignette(ctx, w, h, theme);

      const mx = mouseRef.current.x * dpr;
      const my = mouseRef.current.y * dpr;

      let newHovered: number | null = null;
      for (let i = groupsRef.current.length - 1; i >= 0; i--) {
        if (isPointInGroupBounds(mx, my, groupsRef.current[i])) {
          newHovered = i;
          break;
        }
      }
      hoveredGroupRef.current = newHovered;

      updateParticles(groupsRef.current, elapsed, mx, my, hoveredGroupRef.current);
      drawParticles(ctx, groupsRef.current, theme);

      if (isTransitioning) {
        const tElapsed = now - transitionStartRef.current;
        const progress = Math.min(1, tElapsed / 800);
        drawPageCurlEffect(ctx, w, h, progress, theme);
        if (progress >= 1 && onPageChange) {
          onPageChange(progress >= 1 ? 'next' : 'prev');
        }
      }

      const bookTitle = page.sentences.length > 0 ? '' : '';
      if (bookTitle) {
        ctx.font = `14px "ZCOOL XiaoWei", serif`;
        ctx.fillStyle = theme === 'dark' ? 'rgba(200,200,220,0.3)' : 'rgba(80,60,30,0.3)';
        ctx.textAlign = 'center';
        ctx.fillText(bookTitle, w / 2, h - 30 * dpr);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [theme, isTransitioning, onPageChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="book-canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: hoveredGroupRef.current !== null ? 'pointer' : 'default',
      }}
    />
  );
}
