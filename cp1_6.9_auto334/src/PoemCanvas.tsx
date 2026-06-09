import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Particle, ExplosionParticle, StreamerTrail, Point, Poem } from './types';

interface PoemCanvasProps {
  mode: 'editor' | 'browse' | 'thumbnail';
  poem?: Poem;
  width?: number;
  height?: number;
  onSealed?: (content: string) => void;
  onVanished?: () => void;
  autoVanish?: boolean;
}

const STROKE_MAP: Record<string, number> = {
  '一':1,'二':2,'三':3,'四':5,'五':4,'六':4,'七':2,'八':2,'九':2,'十':2,
  '人':2,'大':3,'小':3,'中':4,'上':3,'下':3,'天':4,'地':6,'日':4,'月':4,
  '水':4,'火':4,'山':3,'木':4,'土':3,'金':8,'石':5,'风':4,'雨':8,'云':4,
  '花':7,'草':9,'树':9,'叶':5,'春':9,'夏':10,'秋':9,'冬':5,'雪':11,
  '诗':8,'书':4,'画':8,'琴':12,'棋':12,'酒':10,'茶':9,'香':9,'墨':15,'笔':10,
  '星':9,'江':6,'河':8,'湖':12,'海':10,'川':3,'林':8,'野':11,
  '心':4,'情':11,'意':13,'思':9,'念':8,'愁':13,'爱':10,'恨':10,'悲':12,'欢':6,
  '生':5,'死':6,'来':7,'去':5,'归':5,'离':10,'聚':14,'散':12,'逢':10,'别':7,
  '明':8,'清':11,'幽':9,'雅':12,'淡':11,'静':14,'闲':12,'悠':11,'远':7,'深':11,
  '长':4,'短':12,'高':10,'低':7,'轻':9,'重':9,'缓':12,'疾':10,'柔':9,'刚':6,
  '霜':17,'露':21,'霞':17,'虹':9,'雷':13,'电':5,'雾':13,'霭':24,'霁':22,
  '的':8,'了':2,'是':9,'在':6,'我':7,'你':7,'他':5,'她':6,'它':5,'们':5,
  '不':4,'有':6,'这':7,'那':6,'个':3,'就':12,'都':10,'也':3,'很':9,'还':7,
  '要':9,'会':6,'能':10,'可':5,'以':4,'从':4,'到':8,'为':4,'和':8,'与':3,
};

function getStrokeCount(char: string): number {
  if (STROKE_MAP[char]) return STROKE_MAP[char];
  const code = char.charCodeAt(0);
  if (code >= 0x4e00 && code <= 0x9fff) {
    return 4 + ((code * 7 + 3) % 12);
  }
  return 3;
}

function lerpColor(color1: number[], color2: number[], t: number): number[] {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * t),
    Math.round(color1[1] + (color2[1] - color1[1]) * t),
    Math.round(color1[2] + (color2[2] - color1[2]) * t),
  ];
}

const WARM_ORANGE = [255, 140, 50];
const COOL_PURPLE = [148, 88, 204];

function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

let particleIdCounter = 0;
let explosionIdCounter = 0;
let trailIdCounter = 0;

const PoemCanvas: React.FC<PoemCanvasProps> = ({
  mode,
  poem,
  width = 900,
  height = 500,
  onSealed,
  onVanished,
  autoVanish = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputText, setInputText] = useState('');
  const [isSealed, setIsSealed] = useState(false);
  const [, setSealedContent] = useState('');
  const [vanishPhase, setVanishPhase] = useState<'none' | 'shrinking' | 'bright' | 'greeting'>('none');
  const [greeting, setGreeting] = useState('');
  const greetingRef = useRef('');

  const particlesRef = useRef<Particle[]>([]);
  const explosionsRef = useRef<ExplosionParticle[]>([]);
  const trailsRef = useRef<StreamerTrail[]>([]);
  const dragRef = useRef<{ particleId: number | null; offsetX: number; offsetY: number }>({
    particleId: null,
    offsetX: 0,
    offsetY: 0,
  });
  const scrollPaddingRef = useRef({ left: 60, right: 60, top: 40, bottom: 40 });
  const noiseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vanishTimerRef = useRef(0);
  const vanishStartRef = useRef(0);
  const _animationStartedRef = useRef(false);
  void _animationStartedRef;

  const scrollContentWidth = width - scrollPaddingRef.current.left - scrollPaddingRef.current.right;
  const scrollContentHeight = height - scrollPaddingRef.current.top - scrollPaddingRef.current.bottom;

  const getPathPoints = useCallback((): { p0: Point; p1: Point; p2: Point; p3: Point } => {
    const { left, right, top } = scrollPaddingRef.current;
    return {
      p0: { x: left + 30, y: top + 60 },
      p1: { x: left + scrollContentWidth * 0.3, y: top + scrollContentHeight * 0.25 },
      p2: { x: left + scrollContentWidth * 0.7, y: top + scrollContentHeight * 0.75 },
      p3: { x: width - right - 30, y: top + scrollContentHeight - 60 },
    };
  }, [width, scrollContentWidth, scrollContentHeight]);

  const initParticles = useCallback((text: string) => {
    const chars = Array.from(text).filter((c) => c !== ' ' && c !== '\n').slice(0, 140);
    const total = chars.length;
    if (total === 0) return;

    const particles: Particle[] = [];
    const pathWidth = 40;
    const progressStep = 0.85 / Math.max(total, 1);

    chars.forEach((char, i) => {
      const strokes = getStrokeCount(char);
      const sizeT = Math.min(1, (strokes - 3) / 20);
      const baseSize = 6 + sizeT * 10;
      const baseAlpha = 0.6 + sizeT * 0.4;
      const colorT = total === 1 ? 0 : i / (total - 1);
      const rgb = lerpColor(WARM_ORANGE, COOL_PURPLE, colorT);
      const color = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const progress = 0.08 + i * progressStep;

      particles.push({
        id: particleIdCounter++,
        char,
        strokeCount: strokes,
        baseSize,
        baseAlpha,
        color,
        pathProgress: progress,
        pathOffset: (Math.random() - 0.5) * pathWidth * 0.3,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        isDragging: false,
        dragProgress: 0,
        targetX: 0,
        targetY: 0,
        originalPathProgress: progress,
      });
    });

    particlesRef.current = particles;
  }, []);

  const generateNoise = useCallback((w: number, h: number) => {
    const nc = document.createElement('canvas');
    nc.width = w;
    nc.height = h;
    const nctx = nc.getContext('2d')!;
    const imgData = nctx.createImageData(w, h);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 0.08 * 255;
    }
    nctx.putImageData(imgData, 0, 0);
    noiseCanvasRef.current = nc;
  }, []);

  useEffect(() => {
    generateNoise(width, height);
  }, [width, height, generateNoise]);

  useEffect(() => {
    if (mode === 'browse' && poem) {
      setSealedContent(poem.content);
      setIsSealed(true);
      initParticles(poem.content);
      if (autoVanish) {
        vanishTimerRef.current = window.setTimeout(() => {
          triggerVanish();
        }, 5000);
      }
    }
  }, [mode, poem, autoVanish, initParticles]);

  const triggerVanish = useCallback(() => {
    setVanishPhase('shrinking');
    vanishStartRef.current = performance.now();
  }, []);

  const handleSeal = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setSealedContent(text);
    setIsSealed(true);
    initParticles(text);
    onSealed?.(text);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let lastTime = performance.now();
    const paths = getPathPoints();

    const drawScroll = () => {
      const { left, right, top, bottom } = scrollPaddingRef.current;
      const scrollX = left;
      const scrollY = top;
      const scrollW = width - left - right;
      const scrollH = height - top - bottom;

      const grad = ctx.createLinearGradient(scrollX, scrollY, scrollX, scrollY + scrollH);
      grad.addColorStop(0, '#E8D5B7');
      grad.addColorStop(1, '#B8996E');
      ctx.fillStyle = grad;
      ctx.fillRect(scrollX, scrollY, scrollW, scrollH);

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        const startX = scrollX + Math.random() * scrollW;
        const startY = scrollY + Math.random() * scrollH;
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
          startX + (Math.random() - 0.5) * 60,
          startY + (Math.random() - 0.5) * 60,
          startX + (Math.random() - 0.5) * 100,
          startY + (Math.random() - 0.5) * 40
        );
        ctx.stroke();
      }
      ctx.restore();

      if (noiseCanvasRef.current) {
        ctx.drawImage(noiseCanvasRef.current, scrollX, scrollY, scrollW, scrollH, scrollX, scrollY, scrollW, scrollH);
      }

      const drawAxis = (x: number) => {
        const axisW = 20;
        const axisGrad = ctx.createLinearGradient(x - axisW / 2, scrollY, x + axisW / 2, scrollY);
        axisGrad.addColorStop(0, '#3E2A1F');
        axisGrad.addColorStop(0.4, '#5C4033');
        axisGrad.addColorStop(0.6, '#7A5440');
        axisGrad.addColorStop(1, '#3E2A1F');
        ctx.fillStyle = axisGrad;
        ctx.fillRect(x - axisW / 2, scrollY - 10, axisW, scrollH + 20);

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 230, 200, 0.6)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(x - axisW / 2 + 3, scrollY - 8);
        ctx.lineTo(x - axisW / 2 + 3, scrollY + scrollH + 8);
        ctx.stroke();
        ctx.restore();
      };

      drawAxis(left - 10);
      drawAxis(width - right + 10);
    };

    const drawInputArea = () => {
      const { left, top } = scrollPaddingRef.current;
      const pad = 40;
      if (!isSealed && mode === 'editor') {
        ctx.save();
        ctx.fillStyle = 'rgba(92, 64, 51, 0.08)';
        ctx.fillRect(left + pad, top + pad - 10, scrollContentWidth - pad * 2, 160);
        ctx.strokeStyle = 'rgba(92, 64, 51, 0.25)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1;
        ctx.strokeRect(left + pad, top + pad - 10, scrollContentWidth - pad * 2, 160);
        ctx.restore();
      }
    };

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0B0C10';
      ctx.fillRect(0, 0, width, height);

      drawScroll();
      drawInputArea();

      const { p0, p1, p2, p3 } = paths;
      const particles = particlesRef.current;
      const dragging = dragRef.current.particleId !== null;

      if (particles.length > 0 && isSealed) {
        if (vanishPhase === 'shrinking') {
          const elapsed = (time - vanishStartRef.current) / 1000;
          if (elapsed < 1.0) {
            const t = elapsed / 1.0;
            const cx = width / 2;
            const cy = height / 2;
            particles.forEach((p) => {
              const pt = bezierPoint(Math.min(1, p.pathProgress + t * (0.5 - p.pathProgress + 0.5)), p0, p1, p2, p3);
              const shrinkT = Math.min(1, t * 1.5);
              p.x = pt.x + (cx - pt.x) * shrinkT;
              p.y = pt.y + (cy - pt.y) * shrinkT;
              p.dragProgress = -shrinkT;
            });
          } else {
            setVanishPhase('bright');
            vanishStartRef.current = time;
          }
        } else if (vanishPhase === 'bright') {
          const elapsed = (time - vanishStartRef.current) / 1000;
          const cx = width / 2;
          const cy = height / 2;
          if (elapsed < 0.5) {
            const t = elapsed / 0.5;
            particles.forEach((p) => {
              p.x = cx;
              p.y = cy;
              p.dragProgress = -1 + t * 0.5;
            });
          } else {
            particles.length = 0;
            const blessings = [
              '愿你岁月静好，浅笑安然', '愿你三冬暖，愿你春不寒',
              '愿所有美好如期而至', '愿你心有繁花，一路芬芳',
              '愿山高水长，别来无恙', '愿此生尽兴，赤诚善良',
              '愿你眼里有光，心中有爱', '愿往事清零，爱恨随意',
              '愿岁月温柔以待', '愿你前路漫漫，未来可期',
              '愿烟火人间，事事值得', '愿你所得皆所期，所失亦无碍',
              '愿清风徐来，花自盛开', '愿你眉目舒展，顺问冬安',
              '愿山河无恙，人间皆安', '愿你温柔且坚定，知足且上进',
              '愿以梦为马，不负韶华', '愿历尽千帆，归来仍是少年',
              '愿时光能缓，愿故人不散', '愿世间美好与你环环相扣',
            ];
            const msg = blessings[Math.floor(Math.random() * blessings.length)];
            greetingRef.current = msg;
            setGreeting(msg);
            setVanishPhase('greeting');
            vanishStartRef.current = time;
            if (mode === 'browse') {
              setTimeout(() => {
                onVanished?.();
              }, 3000);
            }
          }
        } else if (vanishPhase === 'greeting') {
          const elapsed = (time - vanishStartRef.current) / 1000;
          const alpha = Math.min(1, elapsed / 0.5);
          if (alpha > 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = '24px "KaiTi", "楷体", serif';
            ctx.fillStyle = '#8B0000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(greetingRef.current, width / 2, height / 2);
            ctx.restore();
          }
        } else {
          if (!dragging) {
            particles.forEach((p) => {
              p.pathProgress += 0.0008 * dt;
              if (p.pathProgress > 1) p.pathProgress -= 1;
              if (p.pathProgress < 0) p.pathProgress += 1;
            });
          }

          particles.forEach((p) => {
            if (p.isDragging) {
              p.dragProgress = Math.min(1, p.dragProgress + 0.15 * dt);
            } else {
              p.dragProgress = Math.max(0, p.dragProgress - 0.1 * dt);
            }
          });

          const tempPositions: { p: Particle; pt: Point }[] = [];
          particles.forEach((p) => {
            const pt = bezierPoint(p.pathProgress, p0, p1, p2, p3);
            if (!p.isDragging) {
              p.targetX = pt.x;
              p.targetY = pt.y;
              const easeT = p.dragProgress;
              p.x = p.x + (p.targetX - p.x) * (0.12 + (1 - easeT) * 0.08) * dt;
              p.y = p.y + (p.targetY - p.y) * (0.12 + (1 - easeT) * 0.08) * dt;
            }
            tempPositions.push({ p, pt });
          });
        }

        if (vanishPhase === 'none') {
          particles.forEach((p) => {
            const sizeScale = 1 + p.dragProgress * 0.2;
            const haloAlpha = 0.3 + p.dragProgress * 0.3;
            const size = p.baseSize * sizeScale;
            const haloR = size * 1.5;

            const haloGrad = ctx.createRadialGradient(p.x, p.y, size * 0.3, p.x, p.y, haloR);
            const rgbMatch = p.color.match(/\d+/g);
            if (rgbMatch) {
              const [r, g, b] = rgbMatch.map(Number);
              haloGrad.addColorStop(0, `rgba(${r},${g},${b},${haloAlpha * 0.8})`);
              haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},${haloAlpha * 0.3})`);
              haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            }
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (vanishPhase === 'shrinking' || vanishPhase === 'bright') {
          particles.forEach((p) => {
            const sizeScale = Math.max(0.05, 1 + p.dragProgress);
            const size = p.baseSize * sizeScale;
            const haloR = size * 1.5;
            const brightBoost = vanishPhase === 'bright' ? 1.5 : 1;

            const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR * brightBoost);
            const rgbMatch = p.color.match(/\d+/g);
            if (rgbMatch) {
              const [r, g, b] = rgbMatch.map(Number);
              const br = Math.min(255, r * brightBoost);
              const bg = Math.min(255, g * brightBoost);
              const bb = Math.min(255, b * brightBoost);
              haloGrad.addColorStop(0, `rgba(${br},${bg},${bb},${0.85 * brightBoost})`);
              haloGrad.addColorStop(0.4, `rgba(${br},${bg},${bb},${0.4 * brightBoost})`);
              haloGrad.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
            }
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, haloR * brightBoost, 0, Math.PI * 2);
            ctx.fill();

            const rgbMatch2 = p.color.match(/\d+/g);
            if (rgbMatch2) {
              const [r, g, b] = rgbMatch2.map(Number);
              ctx.fillStyle = `rgb(${Math.min(255, r * brightBoost)},${Math.min(255, g * brightBoost)},${Math.min(255, b * brightBoost)})`;
            } else {
              ctx.fillStyle = p.color;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, size / 2), 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      const maxExplosion = 300 - particles.length - trailsRef.current.length;
      const explosions = explosionsRef.current;
      for (let i = explosions.length - 1; i >= 0; i--) {
        if (explosions.length > maxExplosion && i > 60) {
          explosions.splice(i, 1);
          continue;
        }
        const ep = explosions[i];
        ep.life -= dt;
        if (ep.life <= 0) {
          explosions.splice(i, 1);
          continue;
        }
        ep.x += ep.vx * dt * 0.06;
        ep.y += ep.vy * dt * 0.06;
        ep.alpha = Math.max(0, ep.life / ep.maxLife);
        ctx.globalAlpha = ep.alpha;
        ctx.fillStyle = ep.color;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const trails = trailsRef.current;
      for (let i = trails.length - 1; i >= 0; i--) {
        const tr = trails[i];
        tr.life -= dt;
        if (tr.life <= 0) {
          trails.splice(i, 1);
          continue;
        }
        tr.alpha = Math.max(0, tr.life / tr.maxLife);
        ctx.save();
        ctx.globalAlpha = tr.alpha * 0.8;
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.angle);
        const trGrad = ctx.createLinearGradient(0, 0, tr.length, 0);
        trGrad.addColorStop(0, tr.color);
        trGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = trGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tr.length, 0);
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      if (vanishTimerRef.current) clearTimeout(vanishTimerRef.current);
    };
  }, [width, height, isSealed, getPathPoints, vanishPhase, mode, onVanished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: PointerEvent | React.PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (mode !== 'editor' || !isSealed || vanishPhase !== 'none') return;
      const pos = getPos(e);
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        const dx = pos.x - p.x;
        const dy = pos.y - p.y;
        if (dx * dx + dy * dy <= (p.baseSize * 1.2) * (p.baseSize * 1.2)) {
          p.isDragging = true;
          dragRef.current = { particleId: p.id, offsetX: dx, offsetY: dy };
          canvas.setPointerCapture(e.pointerId);
          break;
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragRef.current.particleId === null) return;
      const pos = getPos(e);
      const p = particlesRef.current.find((x) => x.id === dragRef.current.particleId);
      if (p) {
        p.x = pos.x - dragRef.current.offsetX;
        p.y = pos.y - dragRef.current.offsetY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragRef.current.particleId === null) return;
      const p = particlesRef.current.find((x) => x.id === dragRef.current.particleId);
      if (p) {
        p.isDragging = false;
        const { left, right, top, bottom } = scrollPaddingRef.current;
        const margin = 50;
        const outOfBounds =
          p.x < left - margin ||
          p.x > width - right + margin ||
          p.y < top - margin ||
          p.y > height - bottom + margin;

        if (outOfBounds) {
          createExplosion(p);
          particlesRef.current = particlesRef.current.filter((x) => x.id !== p.id);
          const paths = getPathPoints();
          const total = Math.max(particlesRef.current.length, 1);
          particlesRef.current.forEach((pp, i) => {
            pp.originalPathProgress = 0.08 + (0.85 * i) / total;
          });
          particlesRef.current.forEach((pp) => {
            pp.pathProgress = pp.originalPathProgress;
          });
          void paths;
        }
      }
      dragRef.current = { particleId: null, offsetX: 0, offsetY: 0 };
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [width, height, isSealed, vanishPhase, mode, getPathPoints]);

  const createExplosion = (p: Particle) => {
    const count = 40 + Math.floor(Math.random() * 21);
    const rgbMatch = p.color.match(/\d+/g);
    const [r, g, b] = rgbMatch ? rgbMatch.map(Number) : [255, 200, 150];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      const jitter = 0.7 + Math.random() * 0.6;
      explosionsRef.current.push({
        id: explosionIdCounter++,
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 2,
        color: `rgb(${Math.min(255, r * jitter)},${Math.min(255, g * jitter)},${Math.min(255, b * jitter)})`,
        alpha: 1,
        life: 48,
        maxLife: 48,
      });
    }

    const { left, right, top, bottom } = scrollPaddingRef.current;
    let edgeX = p.x;
    let edgeY = p.y;
    let angle = 0;
    const thresholds = [
      { side: 'left', val: left - 50, dx: 1, dy: 0 },
      { side: 'right', val: width - right + 50, dx: -1, dy: 0 },
      { side: 'top', val: top - 50, dx: 0, dy: 1 },
      { side: 'bottom', val: height - bottom + 50, dx: 0, dy: -1 },
    ];
    for (const th of thresholds) {
      if ((th.side === 'left' && p.x < th.val) ||
          (th.side === 'right' && p.x > th.val) ||
          (th.side === 'top' && p.y < th.val) ||
          (th.side === 'bottom' && p.y > th.val)) {
        if (th.dx !== 0) {
          edgeX = th.side === 'left' ? left : width - right;
          edgeY = Math.max(top + 10, Math.min(height - bottom - 10, p.y));
          angle = th.dx > 0 ? 0 : Math.PI;
        } else {
          edgeX = Math.max(left + 10, Math.min(width - right - 10, p.x));
          edgeY = th.side === 'top' ? top : height - bottom;
          angle = th.dy > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        break;
      }
    }

    const cr = 255 - r, cg = 255 - g, cb = 255 - b;
    trailsRef.current.push({
      id: trailIdCounter++,
      x: edgeX,
      y: edgeY,
      angle,
      length: 30,
      color: `rgb(${cr},${cg},${cb})`,
      alpha: 1,
      life: 60,
      maxLife: 60,
    });
  };

  const inputScale = width / 900;

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: 4,
          touchAction: 'none',
        }}
      />
      {mode === 'editor' && !isSealed && (
        <div
          style={{
            position: 'absolute',
            left: (60 + 40) * inputScale,
            top: (40 + 30) * inputScale,
            width: (width - 200) * inputScale,
            height: 140 * inputScale,
          }}
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 140))}
            placeholder="在此书写你的短诗（最多140字）..."
            style={{
              width: '100%',
              height: '68%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: '"KaiTi", "楷体", serif',
              fontSize: 20 * inputScale,
              color: '#3E2A1F',
              lineHeight: 1.6,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6,
              height: 40,
            }}
          >
            <span style={{ color: '#7A5440', fontSize: 14 * inputScale }}>
              {inputText.length}/140
            </span>
            <button
              onClick={handleSeal}
              disabled={!inputText.trim()}
              style={{
                padding: `8px 28px`,
                fontSize: 16 * inputScale,
                fontFamily: '"KaiTi", "楷体", serif',
                background: inputText.trim()
                  ? 'linear-gradient(135deg, #8B4513, #5C4033)'
                  : '#999',
                color: '#FAEBD7',
                border: 'none',
                borderRadius: 6,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                boxShadow: '0 2px 8px rgba(92, 64, 51, 0.3)',
                letterSpacing: 2,
              }}
            >
              封 存
            </button>
          </div>
        </div>
      )}
      {mode === 'browse' && isSealed && vanishPhase === 'greeting' && greeting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: '"KaiTi", "楷体", serif',
              fontSize: 24,
              color: '#8B0000',
              animation: 'fadeIn 0.5s ease-in',
            }}
          >
            {greeting}
          </div>
        </div>
      )}
    </div>
  );
};

export default PoemCanvas;
