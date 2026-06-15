import React, { useEffect, useRef, useMemo } from 'react';
import {
  AnimationType,
  GrowthStage,
  getStageSize,
  ParticleShape,
} from '../utils/petAi';
import type { Particle, PetFullState, GameTime, GameEndState } from '../hooks/useGameLoop';

export interface PetCanvasProps {
  pet: PetFullState;
  particles: Particle[];
  gameTime: GameTime;
  animationProgress: number;
  animationElapsed: number;
  endangeredFlash: number;
  endState: GameEndState;
  onPetCenter: (x: number, y: number) => void;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface FlowerPos {
  x: number;
  y: number;
  color: string;
}

const PetCanvas: React.FC<PetCanvasProps> = ({
  pet,
  particles,
  gameTime,
  animationProgress,
  animationElapsed,
  endangeredFlash,
  endState,
  onPetCenter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 800, h: 600 });
  const bgCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cloudsRef = useRef<Cloud[]>([]);
  const flowersRef = useRef<FlowerPos[]>([]);
  const seedRef = useRef(false);
  const frameRef = useRef(0);

  const flowerColors = useMemo(() => ['#ff6b6b', '#ffd93d', '#6bc5ff'], []);

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      sizeRef.current = { w, h };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildBackground(w, h);
      buildDecorations(w, h);
      const cx = w / 2;
      const cy = h * 0.55;
      onPetCenter(cx, cy);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [onPetCenter]);

  function buildBackground(w: number, h: number) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const c = off.getContext('2d')!;
    const grad = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#fff0e0');
    grad.addColorStop(1, '#ffe4e1');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    const step = 16;
    for (let gy = Math.floor(h * 0.68); gy < h; gy += step) {
      for (let gx = 0; gx < w; gx += step) {
        const ox = (Math.sin(gx * 0.13 + gy * 0.07) * 1.5) | 0;
        const oy = (Math.cos(gx * 0.11 + gy * 0.09) * 1.5) | 0;
        c.fillStyle = '#a3d977';
        c.fillRect(gx + ox, gy + oy, 3, 3);
      }
    }
    bgCacheRef.current = off;
  }

  function buildDecorations(w: number, h: number) {
    if (!seedRef.current) {
      seedRef.current = true;
      const count = 12;
      const arr: FlowerPos[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          x: (i + 0.5) * (w / count) + (Math.sin(i * 2.3) * 10),
          y: h * 0.72 + (Math.cos(i * 1.7) * 20),
          color: flowerColors[i % flowerColors.length],
        });
      }
      flowersRef.current = arr;

      const cloudCount = 4;
      const clouds: Cloud[] = [];
      for (let i = 0; i < cloudCount; i++) {
        const sw = 50 + Math.random() * 30;
        clouds.push({
          x: (i / cloudCount) * w + Math.random() * 100,
          y: 40 + Math.random() * 120,
          w: sw,
          h: sw * 0.5,
          speed: 0.3 + Math.random() * 0.4,
        });
      }
      cloudsRef.current = clouds;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = sizeRef.current;

    // 背景
    if (bgCacheRef.current) {
      ctx.drawImage(bgCacheRef.current, 0, 0, w, h);
    }

    // 濒危闪烁覆盖
    if (pet.isEndangered) {
      const phase = Math.floor(endangeredFlash * 2) % 2;
      if (phase === 0) {
        ctx.fillStyle = 'rgba(180,180,180,0.35)';
        ctx.fillRect(0, 0, w, h);
      }
    }

    // 花朵
    for (const f of flowersRef.current) {
      drawPixelFlower(ctx, f.x, f.y, f.color);
    }

    // 云朵
    for (const cloud of cloudsRef.current) {
      cloud.x += cloud.speed;
      if (cloud.x - cloud.w > w) cloud.x = -cloud.w;
      drawCloud(ctx, cloud.x, cloud.y, cloud.w, cloud.h);
    }

    // 宠物
    const cx = w / 2;
    const cy = h * 0.55;
    drawPet(ctx, cx, cy, pet, animationElapsed, animationProgress);

    // 粒子
    for (const p of particles) {
      drawParticle(ctx, p);
    }

    // 游戏时间（右上角）
    drawGameTime(ctx, w, gameTime);

    // 宠物表情图标
    drawEmoji(ctx, cx, cy - getStageSize(pet.stage) * 0.9 - 10, pet.emoji, animationElapsed);

    // 结束画面
    if (endState.ended) {
      const alpha = clamp01(1 - endState.timeLeft / 3);
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, w, h);
      const textAlpha = clamp01((endState.timeLeft <= 2 ? (2 - endState.timeLeft) / 2 : 0));
      if (textAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${textAlpha})`;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('小乖永远睡着了 💫', w / 2, h / 2);
      }
    }

    frameRef.current++;
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default PetCanvas;

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function drawGameTime(ctx: CanvasRenderingContext2D, w: number, t: { day: number; hour: number; minute: number }) {
  const text = `第${t.day}天 ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'white';
  ctx.fillText(text, w - 20, 20);
  ctx.restore();
}

function drawPixelFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 6, 3, 3);
  ctx.fillRect(x, y - 6, 3, 3);
  ctx.fillRect(x - 6, y - 3, 3, 3);
  ctx.fillRect(x + 3, y - 3, 3, 3);
  ctx.fillStyle = '#ffea00';
  ctx.fillRect(x - 1, y - 4, 3, 3);
  ctx.fillStyle = '#4a8c3a';
  ctx.fillRect(x, y, 2, 6);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const r = h / 2;
  ctx.beginPath();
  ctx.arc(x, y + r, r, 0, Math.PI * 2);
  ctx.arc(x + r, y + r * 0.6, r * 0.9, 0, Math.PI * 2);
  ctx.arc(x + 2 * r, y + r, r, 0, Math.PI * 2);
  ctx.arc(x + r, y + r * 1.2, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  void w;
}

function drawEmoji(ctx: CanvasRenderingContext2D, x: number, y: number, emoji: string, t: number) {
  const bob = Math.sin(t * 4) * 2;
  ctx.save();
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y + bob);
  ctx.restore();
}

// -------- 宠物渲染 --------
function drawPet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pet: PetFullState,
  t: number,
  progress: number,
) {
  const size = getStageSize(pet.stage);
  const scale = size / 32;

  let bobY = 0;
  let rot = 0;
  let sadFactor = 0;
  let layAngle = 0;
  let blink = false;

  if (pet.isEndangered) {
    const f = Math.floor(t / 0.3) % 2;
    if (f === 1) blink = true;
    layAngle = easeOutCubic(clamp01(progress)) * (Math.PI / 2.2);
  }

  const anim = pet.animation;
  const p = easeInOutQuad(clamp01(progress));

  switch (anim) {
    case 'idle':
      bobY = Math.sin(t * Math.PI) * 2 * scale;
      break;
    case 'happy': {
      const jumpT = Math.sin(p * Math.PI);
      bobY = -jumpT * 14 * scale;
      rot = (p * Math.PI * 2);
      break;
    }
    case 'sad':
      bobY = Math.sin(t * 1.2) * 1 * scale;
      sadFactor = 1;
      break;
    case 'eating':
      bobY = Math.sin(t * 8) * 1 * scale;
      break;
    case 'sleeping':
      bobY = Math.sin(t * 1.5) * 1.2 * scale;
      break;
    case 'played': {
      rot = t * 8;
      bobY = Math.sin(t * 6) * 4 * scale;
      break;
    }
  }

  if (pet.isWeak) sadFactor = Math.max(sadFactor, 0.7);

  ctx.save();
  ctx.translate(cx, cy + bobY);
  ctx.rotate(layAngle);
  ctx.scale(scale, scale);

  if (blink) ctx.globalAlpha = 0.4;

  // 虚弱灰化滤镜
  const grayTint = pet.isWeak ? 0.4 : 0;
  drawPixelPetBody(ctx, pet.animation, t, p, sadFactor, grayTint);

  ctx.restore();
}

// 以32x32为基准单位绘制像素宠物
function drawPixelPetBody(
  ctx: CanvasRenderingContext2D,
  anim: AnimationType,
  t: number,
  p: number,
  sad: number,
  grayTint: number,
) {
  const bodyBase = '#ffb36b';
  const bodyLight = '#ffd39b';
  const bodyDark = '#e89054';
  const cheek = '#ff7a7a';
  const darkOutline = '#5a3a20';

  const body = mixColor(bodyBase, '#c9c9c9', grayTint);
  const light = mixColor(bodyLight, '#e0e0e0', grayTint);
  const dark = mixColor(bodyDark, '#9a9a9a', grayTint);

  const mouthOpen = anim === 'eating';
  const closeEyes = anim === 'sleeping';

  // 身体 (椭圆 20x14，居中在0,-4下方)
  const bodyW = 20, bodyH = 14;
  fillRoundedRect(ctx, -bodyW / 2, -4, bodyW, bodyH, 5, body);
  // 身体阴影底部
  ctx.fillStyle = dark;
  fillRoundedRect(ctx, -bodyW / 2, 4, bodyW, 4, 2, dark);

  // 脚
  const footOffset = anim === 'played' ? Math.sin(t * 14) * 2 : (anim === 'idle' ? Math.sin(t * 4) * 0.5 : 0);
  ctx.fillStyle = dark;
  ctx.fillRect(-8, 9, 5, 3 + footOffset);
  ctx.fillRect(3, 9, 5, 3 - footOffset);

  // 尾巴
  const tailWag = Math.sin(t * 6) * 0.4 + (sad ? -0.4 : 0.2);
  ctx.save();
  ctx.translate(bodyW / 2 - 1, 2);
  ctx.rotate(tailWag);
  ctx.fillStyle = body;
  ctx.fillRect(0, -2, 6, 4);
  ctx.fillStyle = dark;
  ctx.fillRect(4, -2, 2, 4);
  ctx.restore();

  // 头 (圆 22x20，在 y=-16 中心)
  const headR = 11;
  const headCY = -18;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵
  const earDroop = sad * 0.9;
  ctx.save();
  ctx.translate(-headR + 2, headCY - headR + 2);
  ctx.rotate(-0.3 - earDroop);
  ctx.fillStyle = body;
  ctx.fillRect(-3, -6, 6, 10);
  ctx.fillStyle = dark;
  ctx.fillRect(-3, -6, 6, 3);
  ctx.restore();

  ctx.save();
  ctx.translate(headR - 2, headCY - headR + 2);
  ctx.rotate(0.3 + earDroop);
  ctx.fillStyle = body;
  ctx.fillRect(-3, -6, 6, 10);
  ctx.fillStyle = dark;
  ctx.fillRect(-3, -6, 6, 3);
  ctx.restore();

  // 头部高光
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(-4, headCY - 5, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  const eyeY = headCY - 1;
  if (closeEyes) {
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, eyeY);
    ctx.quadraticCurveTo(-4, eyeY + 2, -2, eyeY);
    ctx.moveTo(2, eyeY);
    ctx.quadraticCurveTo(4, eyeY + 2, 6, eyeY);
    ctx.stroke();
  } else if (sad > 0.3) {
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, eyeY + 2);
    ctx.quadraticCurveTo(-4, eyeY - 1, -2, eyeY + 2);
    ctx.moveTo(2, eyeY + 2);
    ctx.quadraticCurveTo(4, eyeY - 1, 6, eyeY + 2);
    ctx.stroke();
  } else {
    const blinkPhase = (t % 4);
    const doBlink = blinkPhase > 3.85;
    if (doBlink) {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-6, eyeY, 4, 1);
      ctx.fillRect(2, eyeY, 4, 1);
    } else {
      ctx.fillStyle = darkOutline;
      ctx.beginPath();
      ctx.arc(-4, eyeY, 2, 0, Math.PI * 2);
      ctx.arc(4, eyeY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillRect(-5, eyeY - 1, 1, 1);
      ctx.fillRect(3, eyeY - 1, 1, 1);
    }
  }

  // 腮红
  ctx.fillStyle = `rgba(255,122,122,${0.6 - sad * 0.4})`;
  ctx.fillRect(-8, headCY + 4, 3, 2);
  ctx.fillRect(5, headCY + 4, 3, 2);
  void cheek;

  // 嘴
  ctx.strokeStyle = darkOutline;
  ctx.lineWidth = 1.2;
  if (mouthOpen) {
    const chew = 0.5 + Math.sin(t * 14) * 0.5;
    ctx.fillStyle = '#b84a4a';
    ctx.beginPath();
    ctx.ellipse(0, headCY + 6, 2.5, 1.5 + chew * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 食物粒
    for (let i = 0; i < 3; i++) {
      const ft = (t * 2 + i * 0.3) % 1;
      const fy = headCY + 6 - ft * 16;
      const fx = Math.sin(ft * 5 + i) * 6;
      const alpha = 1 - ft;
      ctx.fillStyle = `rgba(255,180,50,${alpha})`;
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
    }
  } else {
    ctx.beginPath();
    if (sad > 0.3) {
      ctx.moveTo(-3, headCY + 8);
      ctx.quadraticCurveTo(0, headCY + 5, 3, headCY + 8);
    } else {
      ctx.moveTo(-3, headCY + 6);
      ctx.quadraticCurveTo(0, headCY + 9, 3, headCY + 6);
    }
    ctx.stroke();
  }

  // 睡觉呼噜气泡
  if (anim === 'sleeping') {
    const bubbleT = (t % 2) / 2;
    const bx = 10 + Math.sin(bubbleT * 4) * 2;
    const by = headCY - 10 - bubbleT * 18;
    const alpha = 1 - Math.abs(bubbleT - 0.5) * 1.5;
    if (alpha > 0) {
      ctx.fillStyle = `rgba(200,230,255,${Math.max(0, alpha) * 0.8})`;
      ctx.beginPath();
      ctx.arc(bx, by, 4 + bubbleT * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(120,170,220,${Math.max(0, alpha)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // played星星闪烁
  if (anim === 'played') {
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + t * 4;
      const r = 22;
      const sx = Math.cos(ang) * r;
      const sy = headCY + Math.sin(ang) * r * 0.7;
      const twinkle = 0.5 + Math.sin(t * 10 + i) * 0.5;
      drawStar(ctx, sx, sy, 2.5, `rgba(255,230,80,${0.6 + twinkle * 0.4})`);
    }
  }
  void p;
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

function mixColor(hex1: string, hex2: string, t: number): string {
  if (t <= 0) return hex1;
  if (t >= 1) return hex2;
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// -------- 粒子 --------
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const t = p.life / p.maxLife;
  const alpha = clamp01(t);
  ctx.save();
  ctx.globalAlpha = alpha;
  const r = p.radius * (p.type === 'circle' ? (0.4 + 0.6 * t) : 1);
  switch (p.type) {
    case 'star':
      drawStar(ctx, p.x, p.y, r, p.color);
      break;
    case 'drop': {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.quadraticCurveTo(p.x + r, p.y, p.x, p.y + r);
      ctx.quadraticCurveTo(p.x - r, p.y, p.x, p.y - r);
      ctx.fill();
      break;
    }
    case 'circle':
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'heart': {
      const s = r * 0.12;
      ctx.translate(p.x, p.y);
      ctx.scale(s, s);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.bezierCurveTo(0, -7, -8, -7, -8, -2);
      ctx.bezierCurveTo(-8, 3, 0, 8, 0, 10);
      ctx.bezierCurveTo(0, 8, 8, 3, 8, -2);
      ctx.bezierCurveTo(8, -7, 0, -7, 0, -3);
      ctx.fill();
      break;
    }
    case 'cross': {
      const blink = Math.floor((1 - t) * 10) % 2 === 0 ? 1 : 0.2;
      ctx.globalAlpha = alpha * blink;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - r, p.y - r);
      ctx.lineTo(p.x + r, p.y + r);
      ctx.moveTo(p.x + r, p.y - r);
      ctx.lineTo(p.x - r, p.y + r);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

