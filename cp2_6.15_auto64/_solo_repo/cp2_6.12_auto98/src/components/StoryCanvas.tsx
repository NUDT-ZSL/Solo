import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';

const KEYWORD_COLORS: Record<string, { bg: string; shapes: string }> = {
  '森林': { bg: '#0a2e0a', shapes: 'tree' },
  '迷雾': { bg: '#1a1a2e', shapes: 'fog' },
  '巨树': { bg: '#1a3a0a', shapes: 'tree' },
  '海洋': { bg: '#0a1a3e', shapes: 'wave' },
  '星球': { bg: '#1a0a2e', shapes: 'circle' },
  '门': { bg: '#2e1a0a', shapes: 'door' },
  '城市': { bg: '#1a1a2e', shapes: 'building' },
  '黑暗': { bg: '#0a0a1e', shapes: 'shadow' },
  '光明': { bg: '#2e2e1a', shapes: 'light' },
  '龙': { bg: '#2e0a0a', shapes: 'wing' },
  '魔法': { bg: '#1a0a2e', shapes: 'spark' },
  '山': { bg: '#1a2e1a', shapes: 'mountain' },
  '河': { bg: '#0a1a2e', shapes: 'wave' },
  '钥匙': { bg: '#2e2a0a', shapes: 'key' },
  '镜子': { bg: '#1e1e2e', shapes: 'mirror' },
  '城堡': { bg: '#1a1a2e', shapes: 'building' },
  '书': { bg: '#2e1a1a', shapes: 'book' },
  '影': { bg: '#0e0e1e', shapes: 'shadow' },
  '时间': { bg: '#1a1a2e', shapes: 'circle' },
};

const ALL_KEYWORDS = Object.keys(KEYWORD_COLORS);

function extractKeywords(text: string): string[] {
  const found: string[] = [];
  for (const kw of ALL_KEYWORDS) {
    if (text.includes(kw)) {
      found.push(kw);
    }
  }
  return found;
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#1a5a1a';
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.lineTo(-30, 0);
  ctx.lineTo(30, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-5, 0, 10, 30);
  ctx.restore();
}

function drawFog(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, w);
  gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - w, y - h, w * 2, h * 2);
  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, 'rgba(180,120,255,0.4)');
  gradient.addColorStop(1, 'rgba(180,120,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWave(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(100,180,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < w; i += 4) {
    ctx.lineTo(x + i, y + Math.sin(i * 0.05) * 10);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(100,100,140,0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,220,100,0.6)';
  const windowSize = 3;
  for (let wy = y + 5; wy < y + h - 5; wy += 10) {
    for (let wx = x + 4; wx < x + w - 4; wx += 8) {
      ctx.fillRect(wx, wy, windowSize, windowSize);
    }
  }
  ctx.restore();
}

function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
  gradient.addColorStop(0, 'rgba(255,200,100,0.8)');
  gradient.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
  gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLight(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
  gradient.addColorStop(0, 'rgba(255,255,200,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(80,80,100,0.5)';
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.lineTo(0, -80);
  ctx.lineTo(60, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(255,215,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 5, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x, y + 20);
  ctx.moveTo(x, y + 15);
  ctx.lineTo(x + 6, y + 15);
  ctx.stroke();
  ctx.restore();
}

function drawMirror(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(200,200,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
  gradient.addColorStop(0, 'rgba(200,200,255,0.2)');
  gradient.addColorStop(1, 'rgba(200,200,255,0)');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawWing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(200,50,50,0.3)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-40, -30, -60, 10);
  ctx.quadraticCurveTo(-30, 0, 0, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(40, -30, 60, 10);
  ctx.quadraticCurveTo(30, 0, 0, 0);
  ctx.fill();
  ctx.restore();
}

function drawBook(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(139,90,43,0.4)';
  ctx.fillRect(x - 15, y - 10, 30, 20);
  ctx.strokeStyle = 'rgba(200,170,100,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(120,80,40,0.4)';
  ctx.fillRect(x - 15, y - 30, 30, 50);
  ctx.fillStyle = 'rgba(255,220,100,0.6)';
  ctx.beginPath();
  ctx.arc(x + 8, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, keywords: string[]) {
  const particles: { x: number; y: number; r: number; speed: number }[] = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2,
    });
  }

  const isFoggy = keywords.some(k => ['迷雾', '海洋', '河'].includes(k));
  if (!isFoggy) return particles;

  let animId: number;
  const animate = () => {
    for (const p of particles) {
      p.y -= p.speed;
      if (p.y < -5) p.y = canvas.height + 5;
    }
    animId = requestAnimationFrame(animate);
  };
  animate();
  return particles;
}

function renderScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, keywords: string[]) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const primaryKw = keywords[0] || '星球';
  const colors = KEYWORD_COLORS[primaryKw] || { bg: '#1a1a2e', shapes: 'circle' };
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const seed = keywords.join('').length;
  const rng = (i: number) => ((seed * 9301 + 49297 + i * 1327) % 233280) / 233280;

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const shapeType = KEYWORD_COLORS[kw]?.shapes || 'circle';
    const count = 3 + Math.floor(rng(i * 7) * 4);

    for (let j = 0; j < count; j++) {
      const x = rng(i * 31 + j * 17) * canvas.width;
      const y = rng(i * 37 + j * 23) * canvas.height;
      const alpha = 0.3 + rng(i * 41 + j * 29) * 0.4;
      const scale = 0.5 + rng(i * 43 + j * 31) * 1.0;

      switch (shapeType) {
        case 'tree': drawTree(ctx, x, y, scale, alpha); break;
        case 'fog': drawFog(ctx, x, y, 40 + scale * 30, 30 + scale * 20, alpha); break;
        case 'circle': drawCircle(ctx, x, y, 20 + scale * 30, alpha); break;
        case 'wave': drawWave(ctx, x, y - canvas.height / 2, canvas.width, alpha); break;
        case 'building': drawBuilding(ctx, x, y, 20 + scale * 15, 40 + scale * 30, alpha); break;
        case 'spark': drawSpark(ctx, x, y, alpha); break;
        case 'shadow': drawShadow(ctx, x, y, alpha); break;
        case 'light': drawLight(ctx, x, y, alpha); break;
        case 'mountain': drawMountain(ctx, x, y, scale, alpha); break;
        case 'key': drawKey(ctx, x, y, alpha); break;
        case 'mirror': drawMirror(ctx, x, y, alpha); break;
        case 'wing': drawWing(ctx, x, y, scale, alpha); break;
        case 'book': drawBook(ctx, x, y, alpha); break;
        case 'door': drawDoor(ctx, x, y, alpha); break;
      }
    }
  }

  const particles = drawParticles(ctx, canvas, keywords);
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function StoryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { paragraphs } = useStore();
  const [transitioning, setTransitioning] = useState(false);
  const prevLenRef = useRef(paragraphs.length);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const last3 = paragraphs.slice(-3);
    const allText = last3.map(p => p.content).join(' ');
    const keywords = extractKeywords(allText);
    const effectiveKeywords = keywords.length > 0 ? keywords.slice(0, 3) : ['星球', '魔法', '光明'];

    const isNewParagraph = paragraphs.length > prevLenRef.current;
    prevLenRef.current = paragraphs.length;

    if (isNewParagraph && paragraphs.length > 1) {
      setTransitioning(true);
      let progress = 0;
      const duration = 600;
      const startTime = performance.now();

      const animate = (time: number) => {
        progress = Math.min(1, (time - startTime) / duration);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        const oldScale = 1 - progress;
        ctx.globalAlpha = oldScale;
        ctx.translate(-canvas.width * progress * 0.5, -canvas.height * progress * 0.5);
        ctx.scale(oldScale, oldScale);
        ctx.restore();

        ctx.save();
        const newScale = progress;
        ctx.globalAlpha = newScale;
        ctx.translate(canvas.width * (1 - progress) * 0.5, canvas.height * (1 - progress) * 0.5);
        ctx.scale(newScale, newScale);
        renderScene(ctx, canvas, effectiveKeywords);
        ctx.restore();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTransitioning(false);
          renderScene(ctx, canvas, effectiveKeywords);
        }
      };

      requestAnimationFrame(animate);
    } else {
      renderScene(ctx, canvas, effectiveKeywords);
    }
  }, [paragraphs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const last3 = paragraphs.slice(-3);
    const allText = last3.map(p => p.content).join(' ');
    const keywords = extractKeywords(allText);
    const effectiveKeywords = keywords.length > 0 ? keywords.slice(0, 3) : ['星球', '魔法', '光明'];
    renderScene(ctx, canvas, effectiveKeywords);
  }, []);

  return (
    <div className="story-canvas-wrapper">
      <h3 className="canvas-title">故事画板</h3>
      <canvas
        ref={canvasRef}
        className={`story-canvas ${transitioning ? 'canvas-transitioning' : ''}`}
        style={{ width: '100%', height: '200px' }}
      />
    </div>
  );
}
