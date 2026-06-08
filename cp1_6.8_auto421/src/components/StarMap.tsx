import { useRef, useEffect, useCallback } from 'react';
import { type StarData, colorTempToRgb } from '../utils/starGenerator';

interface StarMapProps {
  stars: StarData[];
  starCount: number;
  flickerSpeed: number;
  onStarClick: (star: StarData | null) => void;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
  vx: number;
  vy: number;
}

interface ClickEffect {
  x: number;
  y: number;
  startTime: number;
  rgb: [number, number, number];
}

let audioCtx: AudioContext | null = null;

function playPixelSound() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  const ctx = audioCtx;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'square';
  osc2.type = 'square';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
  osc2.frequency.setValueAtTime(1320, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.1);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.05);
  osc1.stop(now + 0.1);
  osc2.stop(now + 0.15);
}

function drawPixelStar(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  r: number,
  g: number,
  b: number,
  alpha: number,
) {
  const half = size / 2;

  ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.15).toFixed(3)})`;
  ctx.fillRect(sx - half - 2, sy - half - 2, size + 4, size + 4);

  ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.3).toFixed(3)})`;
  ctx.fillRect(sx - half - 1, sy - half - 1, size + 2, size + 2);

  ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  ctx.fillRect(sx - half, sy - half, size, size);
}

export default function StarMap({ stars, starCount, flickerSpeed, onStarClick }: StarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1, vx: 0, vy: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(0);
  const clickEffectsRef = useRef<ClickEffect[]>([]);
  const visibleStarsRef = useRef<StarData[]>([]);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pinchDistRef = useRef(0);
  const starsRef = useRef(stars);
  const starCountRef = useRef(starCount);
  const flickerSpeedRef = useRef(flickerSpeed);
  const onStarClickRef = useRef(onStarClick);

  starsRef.current = stars;
  starCountRef.current = starCount;
  flickerSpeedRef.current = flickerSpeed;
  onStarClickRef.current = onStarClick;

  const screenToWorld = useCallback((sx: number, sy: number, cam: Camera, w: number, h: number) => {
    return {
      x: (sx - w / 2) / cam.zoom + cam.x,
      y: (sy - h / 2) / cam.zoom + cam.y,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      timeRef.current += dt;

      const cam = cameraRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const fs = flickerSpeedRef.current;
      const count = starCountRef.current;
      const starList = starsRef.current;
      const t = timeRef.current;

      if (!isDraggingRef.current) {
        cam.x += cam.vx * dt;
        cam.y += cam.vy * dt;
        cam.vx *= Math.pow(0.92, dt * 60);
        cam.vy *= Math.pow(0.92, dt * 60);
        if (Math.abs(cam.vx) < 0.1) cam.vx = 0;
        if (Math.abs(cam.vy) < 0.1) cam.vy = 0;
      }

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0a0a2e');
      gradient.addColorStop(0.5, '#0d0828');
      gradient.addColorStop(1, '#120a1e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      const viewLeft = cam.x - w / 2 / cam.zoom;
      const viewRight = cam.x + w / 2 / cam.zoom;
      const viewTop = cam.y - h / 2 / cam.zoom;
      const viewBottom = cam.y + h / 2 / cam.zoom;

      const activeStars = starList.slice(0, count);
      visibleStarsRef.current = [];

      ctx.imageSmoothingEnabled = false;

      for (let i = 0; i < activeStars.length; i++) {
        const star = activeStars[i];
        if (star.x < viewLeft - 20 || star.x > viewRight + 20 ||
            star.y < viewTop - 20 || star.y > viewBottom + 20) continue;

        const sx = (star.x - cam.x) * cam.zoom + w / 2;
        const sy = (star.y - cam.y) * cam.zoom + h / 2;
        const renderSize = Math.max(2, star.size * cam.zoom);

        const flicker = 0.6 + 0.4 * Math.sin(t * fs * 2 + star.phase);
        const alpha = star.brightness * flicker;

        const [r, g, b] = colorTempToRgb(star.colorTemp);
        drawPixelStar(ctx, sx, sy, renderSize, r, g, b, alpha);

        visibleStarsRef.current.push(star);
      }

      const effects = clickEffectsRef.current;
      for (let i = effects.length - 1; i >= 0; i--) {
        const eff = effects[i];
        const elapsed = (timestamp - eff.startTime) / 1000;
        if (elapsed > 0.6) {
          effects.splice(i, 1);
          continue;
        }
        const progress = elapsed / 0.6;
        const radius = progress * 40;
        const alpha2 = (1 - progress) * 0.6;

        const esx = (eff.x - cam.x) * cam.zoom + w / 2;
        const esy = (eff.y - cam.y) * cam.zoom + h / 2;

        ctx.strokeStyle = `rgba(${eff.rgb[0]},${eff.rgb[1]},${eff.rgb[2]},${alpha2.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(esx - radius, esy - radius, radius * 2, radius * 2);
        ctx.stroke();

        if (progress < 0.3) {
          const innerAlpha = (1 - progress / 0.3) * 0.4;
          const innerR = progress * 20;
          ctx.fillStyle = `rgba(${eff.rgb[0]},${eff.rgb[1]},${eff.rgb[2]},${innerAlpha.toFixed(3)})`;
          ctx.fillRect(esx - innerR, esy - innerR, innerR * 2, innerR * 2);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      cameraRef.current.vx = 0;
      cameraRef.current.vy = 0;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      const cam = cameraRef.current;
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      cam.vx = -dx / cam.zoom;
      cam.vy = -dy / cam.zoom;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.2, Math.min(5, cam.zoom * factor));

      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const worldBefore = screenToWorld(mouseX, mouseY, cam, w, h);

      cam.zoom = newZoom;

      const worldAfter = screenToWorld(mouseX, mouseY, cam, w, h);
      cam.x += worldBefore.x - worldAfter.x;
      cam.y += worldBefore.y - worldAfter.y;
    };

    const handleClick = (e: MouseEvent) => {
      const cam = cameraRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const worldPos = screenToWorld(e.clientX, e.clientY, cam, w, h);
      const count = starCountRef.current;
      const activeStars = starsRef.current.slice(0, count);
      const hitRadius = 12 / cam.zoom;

      let closestStar: StarData | null = null;
      let closestDist = Infinity;

      for (const star of activeStars) {
        const dx = star.x - worldPos.x;
        const dy = star.y - worldPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitRadius && dist < closestDist) {
          closestDist = dist;
          closestStar = star;
        }
      }

      if (closestStar) {
        playPixelSound();
        clickEffectsRef.current.push({
          x: closestStar.x,
          y: closestStar.y,
          startTime: performance.now(),
          rgb: colorTempToRgb(closestStar.colorTemp),
        });
        onStarClickRef.current(closestStar);
      } else {
        onStarClickRef.current(null);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        cameraRef.current.vx = 0;
        cameraRef.current.vy = 0;
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        const cam = cameraRef.current;
        cam.x -= dx / cam.zoom;
        cam.y -= dy / cam.zoom;
        cam.vx = -dx / cam.zoom;
        cam.vy = -dy / cam.zoom;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = dist / pinchDistRef.current;
        cameraRef.current.zoom = Math.max(0.2, Math.min(5, cameraRef.current.zoom * factor));
        pinchDistRef.current = dist;
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [screenToWorld]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    />
  );
}
