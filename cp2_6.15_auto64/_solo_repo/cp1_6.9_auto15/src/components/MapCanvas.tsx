import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  useAppStore,
  MemoryMarker,
  EMOTION_COLORS,
  EMOTION_LABELS,
  EmotionType,
} from '../store';

interface Connection {
  from: MemoryMarker;
  to: MemoryMarker;
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  cachedLength: number;
  flowT: number;
}

const MAP_SIZE = 5000;
const GRID_SIZE = 100;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const FLOW_SPEED = 80;

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function mixColors(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1),
    b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const b2 = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${b2})`;
}

function cubicBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function bezierLength(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) {
  let len = 0;
  const steps = 40;
  let prev = cubicBezierPoint(p0, p1, p2, p3, 0);
  for (let i = 1; i <= steps; i++) {
    const curr = cubicBezierPoint(p0, p1, p2, p3, i / steps);
    len += Math.hypot(curr.x - prev.x, curr.y - prev.y);
    prev = curr;
  }
  return len;
}

function easeElastic(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const markers = useAppStore((s) => s.currentMap?.markers ?? []);
  const isVisitor = useAppStore((s) => s.isVisitor);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const matchedIds = useAppStore((s) => s.matchedIds);
  const selectedMarkerId = useAppStore((s) => s.selectedMarkerId);
  const setSelectedMarkerId = useAppStore((s) => s.setSelectedMarkerId);
  const setPendingPosition = useAppStore((s) => s.setPendingPosition);
  const setShowForm = useAppStore((s) => s.setShowForm);
  const removeMarker = useAppStore((s) => s.removeMarker);

  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, ox: 0, oy: 0, moved: false });
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());
  const sizeRef = useRef({ w: 0, h: 0 });
  const [showPhoto, setShowPhoto] = useState<string | null>(null);
  const capsuleAnimRef = useRef<{ id: string | null; progress: number; opening: boolean; from: { x: number; y: number } }>({
    id: null,
    progress: 0,
    opening: false,
    from: { x: 0, y: 0 },
  });
  const hoveredConnRef = useRef<number>(-1);
  const connectionsRef = useRef<Connection[]>([]);
  const markerPhasesRef = useRef<Map<string, number>>(new Map());

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId) ?? null;

  const buildConnections = useCallback(() => {
    const sorted = [...markers].sort((a, b) => a.createdAt - b.createdAt);
    const list: Connection[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i],
        to = sorted[i + 1];
      const dx = to.x - from.x,
        dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist,
        ny = dx / dist;
      const seed = (i * 9301 + 49297) % 233280;
      const rand1 = 50 + ((seed * 7 + 11) % 51);
      const rand2 = 50 + ((seed * 13 + 17) % 51);
      const sign = i % 2 === 0 ? 1 : -1;
      const cp1 = { x: from.x + dx * 0.3 + nx * rand1 * sign, y: from.y + dy * 0.3 + ny * rand1 * sign };
      const cp2 = { x: to.x - dx * 0.3 - nx * rand2 * sign, y: to.y - dy * 0.3 - ny * rand2 * sign };
      const len = bezierLength(from, cp1, cp2, to);
      list.push({
        from,
        to,
        cp1,
        cp2,
        cachedLength: len,
        flowT: (i * 0.37) % 1,
      });
      if (list.length >= 300) break;
    }
    connectionsRef.current = list;
  }, [markers]);

  useEffect(() => {
    buildConnections();
  }, [markers, buildConnections]);

  useEffect(() => {
    markers.forEach((m) => {
      if (!markerPhasesRef.current.has(m.id)) {
        markerPhasesRef.current.set(m.id, Math.random() * Math.PI * 2);
      }
    });
  }, [markers]);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const { offsetX, offsetY, scale } = viewRef.current;
    const { w, h } = sizeRef.current;
    return {
      x: (wx - MAP_SIZE / 2) * scale + offsetX + w / 2,
      y: (wy - MAP_SIZE / 2) * scale + offsetY + h / 2,
    };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { offsetX, offsetY, scale } = viewRef.current;
    const { w, h } = sizeRef.current;
    return {
      x: (sx - w / 2 - offsetX) / scale + MAP_SIZE / 2,
      y: (sy - h / 2 - offsetY) / scale + MAP_SIZE / 2,
    };
  }, []);

  const hitTestMarker = useCallback(
    (sx: number, sy: number): MemoryMarker | null => {
      const scale = viewRef.current.scale;
      const sorted = [...markers].sort((a, b) => b.createdAt - a.createdAt);
      for (const m of sorted) {
        const p = worldToScreen(m.x, m.y);
        const r = (16 + m.emotionIntensity * 1.2) * scale;
        if (Math.hypot(sx - p.x, sy - p.y) <= Math.max(r, 20)) return m;
      }
      return null;
    },
    [markers, worldToScreen]
  );

  const hitTestConnection = useCallback(
    (sx: number, sy: number): number => {
      const conns = connectionsRef.current;
      for (let i = conns.length - 1; i >= 0; i--) {
        const c = conns[i];
        for (let t = 0; t <= 1; t += 0.05) {
          const pt = cubicBezierPoint(c.from, c.cp1, c.cp2, c.to, t);
          const p = worldToScreen(pt.x, pt.y);
          if (Math.hypot(sx - p.x, sy - p.y) < 8) return i;
        }
      }
      return -1;
    },
    [worldToScreen]
  );

  const drawFlower = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      color: string,
      intensity: number,
      phase: number,
      time: number,
      alpha: number = 1
    ) => {
      const breathe = 1 + 0.05 * Math.sin(time + phase);
      const petalCount = Math.max(1, Math.round(intensity));
      const baseR = (8 + intensity * 0.8) * breathe;
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(angle) * baseR * 0.7;
        const py = cy + Math.sin(angle) * baseR * 0.7;
        const grd = ctx.createRadialGradient(px, py, 0, px, py, baseR * 1.1);
        grd.addColorStop(0, color);
        grd.addColorStop(0.6, color + 'cc');
        grd.addColorStop(1, color + '22');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + Math.PI / 2);
        ctx.scale(1, 1.6);
        ctx.arc(0, 0, baseR * 0.55, 0, Math.PI * 2);
        ctx.restore();
        ctx.fill();
      }
      const centerGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.6);
      centerGrd.addColorStop(0, '#ffffff');
      centerGrd.addColorStop(0.3, color + 'ff');
      centerGrd.addColorStop(1, color + '44');
      ctx.fillStyle = centerGrd;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 * breathe;
      ctx.fillStyle = color + '33';
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    },
    []
  );

  const drawCapsule = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      marker: MemoryMarker,
      progress: number,
      opening: boolean,
      screenPos: { x: number; y: number }
    ) => {
      if (progress <= 0) return;
      const ease = easeElastic(progress);
      const w = Math.min(400, sizeRef.current.w - 80) * ease;
      const h = Math.min(300, sizeRef.current.h - 200) * ease;
      const x = screenPos.x - w / 2;
      const y = screenPos.y - h / 2;
      if (w < 10 || h < 10) return;

      ctx.save();
      ctx.globalAlpha = Math.min(1, progress * 1.5);

      ctx.shadowColor = EMOTION_COLORS[marker.emotionType];
      ctx.shadowBlur = 30;

      const gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, 'rgba(26, 26, 90, 0.97)');
      gradient.addColorStop(1, 'rgba(15, 15, 63, 0.97)');
      ctx.fillStyle = gradient;
      const radius = 28;
      ctx.beginPath();
      if (w > radius * 2 && h > radius * 2) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
      } else {
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = EMOTION_COLORS[marker.emotionType] + '66';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (progress > 0.6 && opening) {
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = (progress - 0.6) / 0.4;
        const pad = 18;
        const contentX = x + pad;
        const contentY = y + pad;
        const contentW = w - pad * 2;
        const contentH = h - pad * 2;
        const leftW = marker.photo ? contentW * 0.42 : 0;
        const rightX = contentX + leftW + (marker.photo ? 14 : 0);
        const rightW = contentW - (marker.photo ? leftW + 14 : 0);

        if (marker.photo && leftW > 30) {
          const img = new Image();
          img.src = marker.photo;
          try {
            const imgH = contentH * 0.7;
            const imgRatio = leftW / imgH;
            ctx.save();
            ctx.beginPath();
            const ir = 10;
            ctx.moveTo(contentX + ir, contentY);
            ctx.lineTo(contentX + leftW - ir, contentY);
            ctx.quadraticCurveTo(contentX + leftW, contentY, contentX + leftW, contentY + ir);
            ctx.lineTo(contentX + leftW, contentY + imgH - ir);
            ctx.quadraticCurveTo(contentX + leftW, contentY + imgH, contentX + leftW - ir, contentY + imgH);
            ctx.lineTo(contentX + ir, contentY + imgH);
            ctx.quadraticCurveTo(contentX, contentY + imgH, contentX, contentY + imgH - ir);
            ctx.lineTo(contentX, contentY + ir);
            ctx.quadraticCurveTo(contentX, contentY, contentX + ir, contentY);
            ctx.closePath();
            ctx.clip();
            if (img.complete && img.naturalWidth > 0) {
              const nratio = img.naturalWidth / img.naturalHeight;
              let dw = leftW,
                dh = leftW / nratio;
              if (dh > imgH) {
                dh = imgH;
                dw = imgH * nratio;
              }
              ctx.drawImage(
                img,
                contentX + (leftW - dw) / 2,
                contentY + (imgH - dh) / 2,
                dw,
                dh
              );
            } else {
              ctx.fillStyle = 'rgba(224,224,255,0.1)';
              ctx.fillRect(contentX, contentY, leftW, imgH);
              ctx.fillStyle = 'rgba(224,224,255,0.5)';
              ctx.font = '12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('📷 照片', contentX + leftW / 2, contentY + imgH / 2);
            }
            ctx.restore();
          } catch {}
        }

        ctx.fillStyle = '#E0E0FF';
        ctx.font = '600 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const titleY = contentY;
        let title = marker.title;
        const titleMaxW = rightW - 60;
        if (ctx.measureText(title).width > titleMaxW) {
          while (ctx.measureText(title + '...').width > titleMaxW && title.length > 0)
            title = title.slice(0, -1);
          title += '...';
        }
        ctx.fillText(title, rightX, titleY);

        const emotionColor = EMOTION_COLORS[marker.emotionType];
        ctx.fillStyle = emotionColor + '33';
        const labelW = 72;
        ctx.beginPath();
        ctx.roundRect(contentX + contentW - labelW, titleY - 2, labelW, 22, 11);
        ctx.fill();
        ctx.fillStyle = emotionColor;
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${EMOTION_LABELS[marker.emotionType]}·${marker.emotionIntensity}`,
          contentX + contentW - labelW / 2,
          titleY + 6
        );

        ctx.fillStyle = 'rgba(224,224,255,0.45)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(formatDate(marker.createdAt), rightX, titleY + 24);

        const textStartY = titleY + 50;
        const textAreaH = contentH - 50;
        ctx.fillStyle = 'rgba(224,224,255,0.85)';
        ctx.font = '13px/1.6 sans-serif';
        const chars = marker.content.split('');
        let line = '';
        const lineH = 20;
        let ly = textStartY;
        const maxLines = Math.max(2, Math.floor(textAreaH / lineH));
        let lines = 0;
        for (const ch of chars) {
          const test = line + ch;
          if (ctx.measureText(test).width > rightW) {
            ctx.fillText(line, rightX, ly);
            line = ch;
            ly += lineH;
            lines++;
            if (lines >= maxLines - 1) break;
          } else {
            line = test;
          }
        }
        if (lines < maxLines) {
          let finalLine = line;
          if (marker.content.length > chars.length - line.length + 10 && lines >= maxLines - 1) {
            while (ctx.measureText(finalLine + '...').width > rightW && finalLine.length > 0) {
              finalLine = finalLine.slice(0, -1);
            }
            finalLine += '...';
          }
          ctx.fillText(finalLine, rightX, ly);
        }
      }
      ctx.restore();
    },
    []
  );

  useEffect(() => {
    if (selectedMarker) {
      capsuleAnimRef.current = {
        id: selectedMarker.id,
        progress: 0,
        opening: true,
        from: worldToScreen(selectedMarker.x, selectedMarker.y),
      };
    } else if (capsuleAnimRef.current.id) {
      capsuleAnimRef.current.opening = false;
    }
  }, [selectedMarker, worldToScreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let lastT = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const time = (now - startTimeRef.current) / 1000;
      const { w, h } = sizeRef.current;
      const { offsetX, offsetY, scale } = viewRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0A0A2E';
      ctx.fillRect(0, 0, w, h);

      const bgGrd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGrd.addColorStop(0, '#0D0D45');
      bgGrd.addColorStop(1, '#050524');
      ctx.fillStyle = bgGrd;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.translate(-MAP_SIZE / 2, -MAP_SIZE / 2);

      ctx.strokeStyle = '#1A1A4A';
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      const startGX = Math.max(0, Math.floor((w / 2 + offsetX - w / 2 / scale) * 0 + offsetX));
      for (let gx = 0; gx <= MAP_SIZE; gx += GRID_SIZE) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, MAP_SIZE);
      }
      for (let gy = 0; gy <= MAP_SIZE; gy += GRID_SIZE) {
        ctx.moveTo(0, gy);
        ctx.lineTo(MAP_SIZE, gy);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(74, 144, 217, 0.12)';
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.rect(0, 0, MAP_SIZE, MAP_SIZE);
      ctx.stroke();

      ctx.restore();

      const conns = connectionsRef.current;
      for (let i = 0; i < conns.length; i++) {
        const c = conns[i];
        const p0 = worldToScreen(c.from.x, c.from.y);
        const p1 = worldToScreen(c.cp1.x, c.cp1.y);
        const p2 = worldToScreen(c.cp2.x, c.cp2.y);
        const p3 = worldToScreen(c.to.x, c.to.y);
        const c1 = EMOTION_COLORS[c.from.emotionType];
        const c2 = EMOTION_COLORS[c.to.emotionType];
        const grd = ctx.createLinearGradient(p0.x, p0.y, p3.x, p3.y);
        const hovered = hoveredConnRef.current === i;
        grd.addColorStop(0, c1 + (hovered ? 'cc' : '80'));
        grd.addColorStop(0.5, mixColors(c1, c2, 0.5) + (hovered ? 'bb' : '66'));
        grd.addColorStop(1, c2 + (hovered ? 'cc' : '80'));
        ctx.strokeStyle = grd;
        ctx.lineWidth = hovered ? 3 : 1.8;
        ctx.shadowColor = mixColors(c1, c2, 0.5);
        ctx.shadowBlur = hovered ? 16 : 10;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (c.cachedLength > 0) {
          c.flowT += (FLOW_SPEED * dt) / c.cachedLength;
          if (c.flowT > 1) c.flowT -= 1;
          const fpt = cubicBezierPoint(c.from, c.cp1, c.cp2, c.to, c.flowT);
          const fp = worldToScreen(fpt.x, fpt.y);
          const fc = mixColors(c1, c2, c.flowT);
          const fr = 4 + 1 * Math.sin(time * 5 + i);
          const dotGrd = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, fr * 4);
          dotGrd.addColorStop(0, fc);
          dotGrd.addColorStop(0.3, fc + 'aa');
          dotGrd.addColorStop(1, fc + '00');
          ctx.fillStyle = dotGrd;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fr * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (hoveredConnRef.current >= 0 && hoveredConnRef.current < conns.length) {
        const hc = conns[hoveredConnRef.current];
        const pm = worldToScreen(hc.from.x, hc.from.y);
        const ps = worldToScreen(hc.to.x, hc.to.y);
        const drawTip = (px: number, py: number, m: MemoryMarker, align: 'l' | 'r') => {
          ctx.font = '12px sans-serif';
          const title = m.title.length > 20 ? m.title.slice(0, 20) + '...' : m.title;
          const date = formatDate(m.createdAt);
          const tw = Math.max(ctx.measureText(title).width, ctx.measureText(date).width) + 24;
          const bx = align === 'r' ? px : px - tw;
          const by = py - 50;
          const col = EMOTION_COLORS[m.emotionType];
          ctx.fillStyle = 'rgba(10, 10, 46, 0.92)';
          ctx.strokeStyle = col + '66';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bx, by, tw, 44, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#E0E0FF';
          ctx.textBaseline = 'top';
          ctx.textAlign = align === 'r' ? 'left' : 'right';
          ctx.fillStyle = col;
          ctx.fillText(title, align === 'r' ? bx + 12 : bx + tw - 12, by + 8);
          ctx.fillStyle = 'rgba(224,224,255,0.5)';
          ctx.font = '10px sans-serif';
          ctx.fillText(date, align === 'r' ? bx + 12 : bx + tw - 12, by + 26);
        };
        drawTip(pm.x, pm.y, hc.from, pm.x < sizeRef.current.w / 2 ? 'r' : 'l');
        drawTip(ps.x, ps.y, hc.to, ps.x < sizeRef.current.w / 2 ? 'r' : 'l');
      }

      const pulsePeriod = 1.5;
      for (const m of markers) {
        const p = worldToScreen(m.x, m.y);
        const matched = matchedIds.has(m.id);
        const dimmed = searchQuery.trim().length > 0 && !matched;
        if (matched) {
          const tp = (time % pulsePeriod) / pulsePeriod;
          const pr = 80 * tp * viewRef.current.scale;
          const pa = 0.8 - 0.6 * tp;
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
          grd.addColorStop(0, EMOTION_COLORS[m.emotionType] + Math.floor(pa * 255).toString(16).padStart(2, '0'));
          grd.addColorStop(1, EMOTION_COLORS[m.emotionType] + '00');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
          ctx.fill();
        }
        const alpha = dimmed ? 0.15 : 1;
        const phase = markerPhasesRef.current.get(m.id) ?? 0;
        drawFlower(
          ctx,
          p.x,
          p.y,
          EMOTION_COLORS[m.emotionType],
          m.emotionIntensity,
          phase,
          time,
          alpha
        );
      }

      if (capsuleAnimRef.current.id) {
        const cap = capsuleAnimRef.current;
        const dur = 0.6;
        if (cap.opening) {
          cap.progress = Math.min(1, cap.progress + dt / dur);
        } else {
          cap.progress = Math.max(0, cap.progress - dt / dur);
          if (cap.progress <= 0) cap.id = null;
        }
        if (cap.id) {
          const m = markers.find((mm) => mm.id === cap.id);
          if (m) {
            const sp = worldToScreen(m.x, m.y);
            drawCapsule(ctx, m, cap.progress, true, sp);
          }
        }
      }

      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      const oldScale = viewRef.current.scale;
      let newScale = oldScale * (1 + delta);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldBefore = screenToWorld(mx, my);
      viewRef.current.scale = newScale;
      const worldAfter = screenToWorld(mx, my);
      viewRef.current.offsetX += (worldAfter.x - worldBefore.x) * newScale;
      viewRef.current.offsetY += (worldAfter.y - worldBefore.y) * newScale;
    };

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      dragRef.current = {
        active: true,
        startX: mx,
        startY: my,
        ox: viewRef.current.offsetX,
        oy: viewRef.current.offsetY,
        moved: false,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (dragRef.current.active) {
        const dx = mx - dragRef.current.startX;
        const dy = my - dragRef.current.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
        const maxOff = (MAP_SIZE / 2) * viewRef.current.scale;
        viewRef.current.offsetX = Math.max(
          -maxOff - sizeRef.current.w / 2 + 50,
          Math.min(maxOff + sizeRef.current.w / 2 - 50, dragRef.current.ox + dx)
        );
        viewRef.current.offsetY = Math.max(
          -maxOff - sizeRef.current.h / 2 + 50,
          Math.min(maxOff + sizeRef.current.h / 2 - 50, dragRef.current.oy + dy)
        );
      } else {
        const connIdx = hitTestConnection(mx, my);
        hoveredConnRef.current = connIdx;
        const hit = hitTestMarker(mx, my);
        canvas.style.cursor = hit || connIdx >= 0 ? 'pointer' : 'grab';
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wasMoved = dragRef.current.moved;
      dragRef.current.active = false;
      if (!wasMoved) {
        if (capsuleAnimRef.current.id && capsuleAnimRef.current.progress > 0.8) {
          const capMarker = markers.find((mm) => mm.id === capsuleAnimRef.current!.id);
          if (capMarker) {
            const sp = worldToScreen(capMarker.x, capMarker.y);
            const ease = 1;
            const w = Math.min(400, sizeRef.current.w - 80) * ease;
            const h = Math.min(300, sizeRef.current.h - 200) * ease;
            const cx1 = sp.x - w / 2,
              cy1 = sp.y - h / 2;
            if (mx >= cx1 && mx <= cx1 + w && my >= cy1 && my <= cy1 + h) {
              return;
            }
          }
        }
        const hit = hitTestMarker(mx, my);
        if (hit) {
          setSelectedMarkerId(selectedMarkerId === hit.id ? null : hit.id);
        } else if (selectedMarkerId) {
          setSelectedMarkerId(null);
        }
      }
    };

    const onDblClick = (e: MouseEvent) => {
      if (isVisitor) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (hitTestMarker(mx, my)) return;
      const world = screenToWorld(mx, my);
      world.x = Math.max(50, Math.min(MAP_SIZE - 50, world.x));
      world.y = Math.max(50, Math.min(MAP_SIZE - 50, world.y));
      if (markers.length >= 80) {
        alert('标记点数量已达上限(80)');
        return;
      }
      setPendingPosition(world);
      setShowForm(true);
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isVisitor) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTestMarker(mx, my);
      if (hit && confirm(`删除回忆「${hit.title}」?`)) {
        removeMarker(hit.id);
        fetch(`/api/markers/${hit.id}`, { method: 'DELETE' }).catch(() => {});
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [
    markers,
    isVisitor,
    searchQuery,
    matchedIds,
    selectedMarkerId,
    setSelectedMarkerId,
    setPendingPosition,
    setShowForm,
    removeMarker,
    worldToScreen,
    screenToWorld,
    hitTestMarker,
    hitTestConnection,
    drawFlower,
    drawCapsule,
  ]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'grab' }} />
      {showPhoto && (
        <div
          onClick={() => setShowPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img src={showPhoto} alt="放大照片" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}
      {selectedMarker?.photo && capsuleAnimRef.current.progress > 0.92 && (
        <div
          onClick={() => setShowPhoto(selectedMarker.photo!)}
          style={{
            position: 'fixed',
            left:
              (() => {
                const sp = worldToScreen(selectedMarker.x, selectedMarker.y);
                const w = Math.min(400, sizeRef.current.w - 80);
                return sp.x - w / 2 + 18;
              })(),
            top:
              (() => {
                const sp = worldToScreen(selectedMarker.x, selectedMarker.y);
                const h = Math.min(300, sizeRef.current.h - 200);
                return sp.y - h / 2 + 18;
              })(),
            width: `${(Math.min(400, sizeRef.current.w - 80) * 0.42)}px`,
            height: `${(Math.min(300, sizeRef.current.h - 200) * 0.7)}px`,
            background: 'transparent',
            zIndex: 150,
            cursor: 'zoom-in',
          }}
        />
      )}
    </div>
  );
};

export default MapCanvas;
