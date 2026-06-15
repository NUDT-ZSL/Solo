import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Particle, ViewMode, EventsMap, FilterRange, TooltipData, HourglassConfig, SettledParticle } from './types';

interface Props {
  viewMode: ViewMode;
  events: EventsMap;
  filterRange: FilterRange | null;
  onResetFilter: () => void;
}

const GRAVITY = 9.8;
const FPS = 60;
const GRAVITY_PER_FRAME = GRAVITY / FPS;
const FILL_DURATION = 2000;
const DAMPING = 0.7;
const OVERFLOW_THRESHOLD = 0.8;
const WARNING_BLINK_PERIOD = 600;
const HIGHLIGHT_DURATION = 3000;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColor = (c1: string, c2: string, t: number): string => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
};

const mapEventCountToColor = (count: number): string => {
  const c = Math.max(0, Math.min(10, count));
  if (c === 0) return '#E0E0E0';
  if (c <= 3) {
    const t = (c - 1) / 2;
    return lerpColor('#64B5F6', '#81C784', t);
  }
  if (c <= 6) {
    const t = (c - 4) / 2;
    return lerpColor('#FFB74D', '#FF8A65', t);
  }
  const t = (c - 7) / 3;
  return lerpColor('#E57373', '#BA68C8', t);
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDatesForView = (viewMode: ViewMode, baseDate: Date): Date[] => {
  const dates: Date[] = [];
  if (viewMode === 'year') {
    const start = new Date(baseDate.getFullYear(), 0, 1);
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
  } else if (viewMode === 'month') {
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(y, m, i));
    }
  } else {
    const d = new Date(baseDate);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    for (let i = 0; i < 7; i++) {
      const cur = new Date(d);
      cur.setDate(cur.getDate() + i);
      dates.push(cur);
    }
  }
  return dates;
};

const easeOutElastic = (t: number): number => {
  if (t === 0 || t === 1) return t;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
};

const easeOutQuad = (t: number): number => t * (2 - t);

const ParticleSimulator: React.FC<Props> = ({ viewMode, events, filterRange, onResetFilter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const settledRef = useRef<SettledParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hoveredIdRef = useRef<number | null>(null);
  const highlightStartRef = useRef<number>(0);
  const isHighlightingRef = useRef<boolean>(false);
  const overflowRef = useRef<boolean>(false);
  const overflowStartRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 900 });
  const configRef = useRef<HourglassConfig | null>(null);

  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    eventCount: 0,
    opacity: 0,
  });

  const baseDate = useMemo(() => new Date(), []);

  const computeConfig = useCallback((w: number, h: number): HourglassConfig => {
    const centerX = w / 2;
    const containerW = Math.min(360, w * 0.55);
    const topH = Math.min(260, h * 0.28);
    const bottomH = Math.min(300, h * 0.33);
    const neckW = 40;
    const neckH = 28;
    const topY = h * 0.08;
    const neckY = topY + topH;
    const bottomY = neckY + neckH;

    return {
      topContainer: { x: centerX - containerW / 2, y: topY, width: containerW, height: topH },
      neck: { x: centerX - neckW / 2, y: neckY, width: neckW, height: neckH },
      bottomContainer: { x: centerX - containerW / 2, y: bottomY, width: containerW, height: bottomH },
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const cssW = Math.floor(rect.width * 0.95);
    const cssH = Math.floor(rect.height * 0.95);
    const w = cssW * dpr;
    const h = cssH * dpr;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }

    sizeRef.current = { w: cssW, h: cssH };
    configRef.current = computeConfig(cssW, cssH);
  }, [computeConfig]);

  const initializeParticles = useCallback(() => {
    const dates = getDatesForView(viewMode, baseDate);
    const config = configRef.current;
    if (!config) return;

    const { x: cx, y: cy, width: cw, height: ch } = config.topContainer;
    const centerX = cx + cw / 2;
    const count = dates.length;

    const cols = Math.ceil(Math.sqrt(count * (cw / ch)));
    const rows = Math.ceil(count / cols);
    const cellW = cw / cols;
    const cellH = ch / rows;

    const particles: Particle[] = dates.map((dateObj, i) => {
      const dateStr = formatDate(dateObj);
      const eventCount = events[dateStr] ?? 0;
      const baseRadius = 5 + Math.random() * 2;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const targetX = cx + cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.3;
      const targetY = cy + cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.3;
      const startX = cx + Math.random() * cw;
      const startY = cy - 20 - Math.random() * 80;

      return {
        id: i,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        targetX,
        targetY,
        radius: baseRadius,
        baseRadius,
        color: mapEventCountToColor(eventCount),
        glowRadius: 0,
        glowAlpha: 0,
        date: dateStr,
        eventCount,
        state: 'filling',
        settleY: 0,
        scale: 1,
        highlighted: false,
        opacity: 1,
        fillStartDelay: (i / Math.max(1, count)) * FILL_DURATION * 0.5,
        fillProgress: 0,
      };
    });

    particlesRef.current = particles;
    settledRef.current = [];
    overflowRef.current = false;
    startTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
    hoveredIdRef.current = null;
    isHighlightingRef.current = false;
    highlightStartRef.current = 0;
    centerX;
  }, [viewMode, baseDate, events]);

  const updateFilling = useCallback((elapsed: number) => {
    const particles = particlesRef.current;
    let allDone = true;

    for (const p of particles) {
      const localElapsed = elapsed - p.fillStartDelay;
      if (localElapsed <= 0) {
        allDone = false;
        continue;
      }
      const t = Math.min(1, localElapsed / (FILL_DURATION * 0.8));
      const easeT = easeOutElastic(t);
      p.fillProgress = easeT;

      const startX = p.targetX + (Math.random() - 0.5) * 2;
      const startY = p.targetY - 100 - p.id * 0.3;
      void startX;

      if (t < 1) {
        allDone = false;
        const dx = p.targetX - (p.x - (p.targetX - p.x) * 0);
        const dy = p.targetY - p.y;
        void dx;
        const bounceY = Math.sin(t * Math.PI * 3) * (1 - t) * 12;
        p.y = p.y + (p.targetY - p.y) * 0.22;
        p.x = p.x + (p.targetX - p.x) * 0.18 + (Math.random() - 0.5) * 0.5;
        if (t > 0.6) {
          p.y = p.targetY + bounceY;
        }
        void startY;
        void dy;
      } else {
        p.x = p.targetX;
        p.y = p.targetY;
        p.state = 'waiting';
      }
    }
    return allDone;
  }, []);

  const updateFalling = useCallback((deltaMs: number) => {
    const config = configRef.current;
    if (!config) return;

    const dt = deltaMs / 16.67;
    const { bottomContainer, neck, topContainer } = config;
    const neckEntryY = neck.y;
    const neckLeft = neck.x;
    const neckRight = neck.x + neck.width;
    const bottomLeft = bottomContainer.x;
    const bottomRight = bottomContainer.x + bottomContainer.width;
    const bottomTopY = bottomContainer.y;
    const bottomBottomY = bottomContainer.y + bottomContainer.height;
    const overflowY = bottomTopY + bottomContainer.height * (1 - OVERFLOW_THRESHOLD);

    for (const p of particlesRef.current) {
      if (p.state === 'waiting') {
        if (Math.random() < 0.012) {
          p.state = 'falling';
          p.vy = 0;
          p.vx = 0;
        }
      }

      if (p.state === 'falling' || p.state === 'settled') {
        if (p.y < neckEntryY) {
          p.vy += GRAVITY_PER_FRAME * dt;
          p.y += p.vy * dt;
          const targetNx = neckLeft + neck.width / 2 + (Math.random() - 0.5) * 2;
          p.x = p.x + (targetNx - p.x) * 0.03 + (Math.random() - 0.5) * 0.4;
        } else if (p.y >= neckEntryY && p.y < bottomTopY) {
          p.vy += GRAVITY_PER_FRAME * dt * 1.2;
          p.y += p.vy * dt;
          p.x = Math.max(neckLeft + p.radius, Math.min(neckRight - p.radius, p.x + (Math.random() - 0.5) * 0.6));
        } else if (p.y >= bottomTopY) {
          if (p.state !== 'settled') {
            p.vy += GRAVITY_PER_FRAME * dt;
            p.y += p.vy * dt;
            p.x += (Math.random() - 0.5) * 2 * dt;
            p.x = Math.max(bottomLeft + p.radius + 1, Math.min(bottomRight - p.radius - 1, p.x));

            let settleAt = bottomBottomY - p.radius - 1;
            for (const s of settledRef.current) {
              const dx = p.x - s.x;
              const dy = p.y - s.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = p.radius + s.radius + 1;
              if (dist < minDist && p.y > s.y - minDist) {
                const proposed = s.y - Math.sqrt(Math.max(0, minDist * minDist - dx * dx));
                if (proposed < settleAt) settleAt = proposed;
              }
            }
            if (p.y >= settleAt) {
              p.y = settleAt;
              p.vy = 0;
              p.state = 'settled';
              p.settleY = settleAt;
              settledRef.current.push({ x: p.x, y: settleAt, radius: p.radius });
            }
          }
        }
      }
    }

    const settledParticles = particlesRef.current.filter(p => p.state === 'settled');
    if (settledParticles.length > 0) {
      const minSettledY = Math.min(...settledParticles.map(p => p.settleY));
      if (minSettledY <= overflowY) {
        if (!overflowRef.current) {
          overflowRef.current = true;
          overflowStartRef.current = performance.now();
        }
      } else {
        overflowRef.current = false;
      }
    }
    void topContainer;
  }, []);

  const updateHoverAndHighlight = useCallback((now: number) => {
    let activeHighlight = isHighlightingRef.current;
    if (activeHighlight && now - highlightStartRef.current > HIGHLIGHT_DURATION) {
      activeHighlight = false;
      isHighlightingRef.current = false;
      onResetFilter();
    }

    for (const p of particlesRef.current) {
      const isHovered = hoveredIdRef.current === p.id;
      const targetScale = isHovered ? 12 / p.baseRadius : 1;
      const targetGlowR = isHovered ? 20 : (activeHighlight && p.highlighted ? 8 : 0);
      const targetGlowA = isHovered ? 0.5 : (activeHighlight && p.highlighted ? 0.35 : 0);
      let targetOpacity = 1;
      if (activeHighlight) {
        targetOpacity = filterRange && p.eventCount >= filterRange.min && p.eventCount <= filterRange.max ? 1 : 0.2;
      }
      p.scale = p.scale + (targetScale - p.scale) * 0.25;
      p.radius = p.baseRadius * p.scale;
      p.glowRadius = p.glowRadius + (targetGlowR - p.glowRadius) * 0.22;
      p.glowAlpha = p.glowAlpha + (targetGlowA - p.glowAlpha) * 0.22;
      p.opacity = p.opacity + (targetOpacity - p.opacity) * 0.2;
    }
  }, [filterRange, onResetFilter]);

  const drawHourglass = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const config = configRef.current;
    if (!config) return;

    const { topContainer, neck, bottomContainer } = config;
    const cx = topContainer.x + topContainer.width / 2;
    const neckLx = neck.x;
    const neckRx = neck.x + neck.width;
    const topLx = topContainer.x;
    const topRx = topContainer.x + topContainer.width;
    const botLx = bottomContainer.x;
    const botRx = bottomContainer.x + bottomContainer.width;
    const topTopY = topContainer.y;
    const topBotY = neck.y;
    const neckBotY = neck.y + neck.height;
    const botTopY = bottomContainer.y;
    const botBotY = bottomContainer.y + bottomContainer.height;

    let borderColor = '#4A4A6A';
    if (overflowRef.current) {
      const phase = (now - overflowStartRef.current) % WARNING_BLINK_PERIOD;
      const t = phase < WARNING_BLINK_PERIOD / 2 ? phase / (WARNING_BLINK_PERIOD / 2) : 1 - (phase - WARNING_BLINK_PERIOD / 2) / (WARNING_BLINK_PERIOD / 2);
      borderColor = lerpColor('#FFFFFF', '#FF5252', t);
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topLx, topTopY);
    ctx.lineTo(topRx, topTopY);
    ctx.lineTo(neckRx, topBotY);
    ctx.lineTo(neckRx, neckBotY);
    ctx.lineTo(botRx, botBotY);
    ctx.lineTo(botLx, botBotY);
    ctx.lineTo(neckLx, neckBotY);
    ctx.lineTo(neckLx, topBotY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    const gridTop = botTopY + bottomContainer.height * 0.4;
    for (let gy = gridTop; gy < botBotY; gy += gridSpacing) {
      const alpha = 1 - (botBotY - gy) / (botBotY - gridTop) * 0.7;
      ctx.globalAlpha = Math.max(0, alpha) * 0.6;
      ctx.beginPath();
      ctx.moveTo(botLx + 4, gy);
      ctx.lineTo(botRx - 4, gy);
      ctx.stroke();
    }
    for (let gx = botLx + gridSpacing; gx < botRx; gx += gridSpacing) {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(gx, botTopY + 8);
      ctx.lineTo(gx, botBotY - 4);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    const warnY = botTopY + bottomContainer.height * (1 - OVERFLOW_THRESHOLD);
    ctx.moveTo(botLx + 8, warnY);
    ctx.lineTo(botRx - 8, warnY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,82,82,0.6)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('⚠ 80% 警告线', botLx + 10, warnY - 4);
    ctx.restore();

    void cx;
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const now = performance.now();
    const activeHighlight = isHighlightingRef.current;

    for (const p of particlesRef.current) {
      if (p.opacity <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = p.opacity;

      if (p.glowRadius > 0.5 && p.glowAlpha > 0.01) {
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.glowRadius + p.radius);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = p.opacity * p.glowAlpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.glowRadius + p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.opacity;
      }

      if (activeHighlight && p.highlighted) {
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      let fillColor = p.color;
      if (activeHighlight && p.highlighted) {
        const rgb = hexToRgb(p.color);
        fillColor = rgbToHex(
          Math.min(255, rgb.r + (255 - rgb.r) * 0.3),
          Math.min(255, rgb.g + (255 - rgb.g) * 0.3),
          Math.min(255, rgb.b + (255 - rgb.b) * 0.3),
        );
      }

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.opacity * 0.4;
      const hl = ctx.createRadialGradient(p.x - p.radius * 0.35, p.y - p.radius * 0.35, 0, p.x, p.y, p.radius);
      hl.addColorStop(0, 'rgba(255,255,255,0.9)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    void now;
  }, []);

  const drawTooltip = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!tooltip.visible || tooltip.opacity <= 0.01) return;
    const paddingX = 12;
    const paddingY = 10;
    const fontSize = 13;
    const lineHeight = 20;
    ctx.save();
    ctx.globalAlpha = tooltip.opacity;
    const lines = [tooltip.date, `事件数量: ${tooltip.eventCount}`];
    let maxW = 0;
    ctx.font = `${fontSize}px JetBrains Mono, 'Noto Sans SC', sans-serif`;
    for (const l of lines) {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    }
    const boxW = maxW + paddingX * 2;
    const boxH = lines.length * lineHeight + paddingY * 2 - 4;
    let x = tooltip.x + 16;
    let y = tooltip.y - boxH - 12;
    const { w: cw } = sizeRef.current;
    if (x + boxW > cw - 8) x = tooltip.x - boxW - 16;
    if (y < 8) y = tooltip.y + 16;

    const r = 8;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + boxW - r, y);
    ctx.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
    ctx.lineTo(x + boxW, y + boxH - r);
    ctx.quadraticCurveTo(x + boxW, y + boxH, x + boxW - r, y + boxH);
    ctx.lineTo(x + r, y + boxH);
    ctx.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, x + paddingX, y + paddingY + i * lineHeight);
    });
    ctx.restore();
  }, [tooltip]);

  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(26, 26, 46, 0)');
    bg.addColorStop(1, 'rgba(22, 33, 62, 0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    drawHourglass(ctx, now);
    drawParticles(ctx);
    drawTooltip(ctx);
  }, [drawHourglass, drawParticles, drawTooltip]);

  const gameLoop = useCallback((now: number) => {
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;
    const elapsed = now - startTimeRef.current;

    const fillingDone = updateFilling(elapsed);
    if (fillingDone) {
      updateFalling(delta);
    }
    updateHoverAndHighlight(now);

    setTooltip(prev => {
      const hid = hoveredIdRef.current;
      if (hid === null) {
        if (prev.opacity <= 0.02) return { ...prev, visible: false, opacity: 0 };
        return { ...prev, opacity: prev.opacity * 0.88 };
      }
      const p = particlesRef.current.find(x => x.id === hid);
      if (!p) return prev;
      const targetO = 1;
      return {
        visible: true,
        x: p.x,
        y: p.y,
        date: p.date,
        eventCount: p.eventCount,
        opacity: prev.opacity + (targetO - prev.opacity) * 0.3,
      };
    });

    render(now);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [updateFilling, updateFalling, updateHoverAndHighlight, render]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let foundId: number | null = null;
    let minDist = Infinity;
    for (const p of particlesRef.current) {
      const dx = p.x - mx;
      const dy = p.y - my;
      const d2 = dx * dx + dy * dy;
      const hitR = Math.max(14, p.radius + 6);
      if (d2 < hitR * hitR && d2 < minDist) {
        minDist = d2;
        foundId = p.id;
      }
    }
    hoveredIdRef.current = foundId;
  }, []);

  const handlePointerLeave = useCallback(() => {
    hoveredIdRef.current = null;
  }, []);

  useEffect(() => {
    const activeHighlight = !!filterRange;
    if (activeHighlight) {
      for (const p of particlesRef.current) {
        p.highlighted = !!(filterRange && p.eventCount >= filterRange.min && p.eventCount <= filterRange.max);
      }
      isHighlightingRef.current = true;
      highlightStartRef.current = performance.now();
    } else {
      for (const p of particlesRef.current) {
        p.highlighted = false;
      }
      isHighlightingRef.current = false;
    }
  }, [filterRange]);

  useEffect(() => {
    for (const p of particlesRef.current) {
      const ec = events[p.date] ?? 0;
      p.eventCount = ec;
      p.color = mapEventCountToColor(ec);
    }
  }, [events]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      resizeCanvas();
      initializeParticles();
      lastTimeRef.current = performance.now();
      startTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }, 30);
    return () => {
      window.clearTimeout(timeoutId);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.setTimeout(() => {
      initializeParticles();
    }, 50);
  }, [viewMode, initializeParticles, resizeCanvas]);

  void easeOutQuad;

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
      />
    </div>
  );
};

export default ParticleSimulator;
