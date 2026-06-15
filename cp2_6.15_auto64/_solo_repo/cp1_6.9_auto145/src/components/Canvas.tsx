import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Card as CardType, Connection } from '../hooks/useWebSocket';
import Card from './Card';

interface CanvasProps {
  cards: CardType[];
  connections: Connection[];
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  onCreateCard: (x: number, y: number) => void;
  onUpdateCard: (id: string, changes: Partial<CardType>) => void;
  onDeleteCard: (id: string) => void;
  onCreateConnection: (fromId: string, toId: string) => void;
  onDeleteConnection: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  autoLayoutTrigger: number;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const DEFAULT_CARD_W = 220;
const DEFAULT_CARD_H = 160;

interface AnimatedCardPos {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
}

const Canvas: React.FC<CanvasProps> = ({
  cards,
  connections,
  selectedCardId,
  onSelectCard,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onCreateConnection,
  onDeleteConnection,
  onUndo,
  onRedo,
  autoLayoutTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // 拖拽状态
  const spacePressedRef = useRef(false);
  const panningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const draggingCardRef = useRef<{ id: string; mx: number; my: number; cx: number; cy: number } | null>(null);
  const resizingCardRef = useRef<{ id: string; mx: number; my: number; w: number; h: number } | null>(null);
  const connectingRef = useRef<{ fromId: string; startX: number; startY: number; curX: number; curY: number; targetId: string | null } | null>(null);
  const moveCardDebounceRef = useRef<number | null>(null);
  const resizeCardDebounceRef = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const animatingCardsRef = useRef<Record<string, AnimatedCardPos>>({});
  const prevCardsRef = useRef<Record<string, CardType>>({});
  const hoveredConnIdRef = useRef<string | null>(null);

  // 屏幕坐标 -> 世界坐标
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current;
    return {
      x: (sx - t.x) / t.scale,
      y: (sy - t.y) / t.scale,
    };
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const t = transformRef.current;
    return {
      x: wx * t.scale + t.x,
      y: wy * t.scale + t.y,
    };
  }, []);

  // 响应式调整 canvas 大小
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      const container = containerRef.current;
      if (!c || !container) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = container.clientWidth * dpr;
      c.height = container.clientHeight * dpr;
      c.style.width = `${container.clientWidth}px`;
      c.style.height = `${container.clientHeight}px`;
      const ctx = c.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scheduleDraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // 自动布局动画
  useEffect(() => {
    if (autoLayoutTrigger === 0) return;
    const current: Record<string, CardType> = {};
    for (const card of cards) current[card.id] = card;

    const anim: Record<string, AnimatedCardPos> = {};
    const now = performance.now();
    for (const card of cards) {
      const prev = prevCardsRef.current[card.id];
      const startX = prev ? prev.x : card.x;
      const startY = prev ? prev.y : card.y;
      if (startX !== card.x || startY !== card.y) {
        anim[card.id] = {
          startX, startY,
          endX: card.x, endY: card.y,
          startTime: now,
        };
      }
    }
    animatingCardsRef.current = anim;
    prevCardsRef.current = current;
    runAnimLoop();
  }, [autoLayoutTrigger, cards]);

  // 普通状态更新 prevCards
  useEffect(() => {
    // 仅当没有动画进行时才更新
    if (Object.keys(animatingCardsRef.current).length === 0) {
      const current: Record<string, CardType> = {};
      for (const card of cards) current[card.id] = card;
      prevCardsRef.current = current;
    }
  }, [cards]);

  const runAnimLoop = useCallback(() => {
    const step = () => {
      const now = performance.now();
      const anim = animatingCardsRef.current;
      const duration = 1500;
      let anyActive = false;
      for (const id in anim) {
        const a = anim[id];
        if (now - a.startTime < duration) anyActive = true;
      }
      scheduleDraw();
      if (anyActive) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        // 动画结束，更新 prevCards
        const current: Record<string, CardType> = {};
        for (const card of cards) current[card.id] = card;
        prevCardsRef.current = current;
        animatingCardsRef.current = {};
      }
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);
  }, [cards]);

  const getCardAnimatedPos = useCallback((card: CardType) => {
    const anim = animatingCardsRef.current[card.id];
    if (!anim) return null;
    const now = performance.now();
    const duration = 1500;
    const rawT = Math.min(1, (now - anim.startTime) / duration);
    // easeInOutCubic
    const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
    return {
      x: anim.startX + (anim.endX - anim.startX) * t,
      y: anim.startY + (anim.endY - anim.startY) * t,
    };
  }, []);

  // 绘制网格和连线
  const scheduleDraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const W = c.width / (window.devicePixelRatio || 1);
    const H = c.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, W, H);

    const { x: tx, y: ty, scale } = transformRef.current;

    // 绘制网格
    drawGrid(ctx, W, H, tx, ty, scale);

    // 绘制连线
    drawConnections(ctx, tx, ty, scale);

    // 绘制正在创建的临时连线
    const conn = connectingRef.current;
    if (conn) {
      drawTempConnection(ctx, conn, tx, ty, scale);
    }
  }, [cards, connections]);

  const drawGrid = (ctx: CanvasRenderingContext2D, W: number, H: number, tx: number, ty: number, scale: number) => {
    const baseSize = 40;
    const gridSize = baseSize * scale;
    const offsetX = ((tx % gridSize) + gridSize) % gridSize;
    const offsetY = ((ty % gridSize) + gridSize) % gridSize;

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + 0.04 * scale})`;
    ctx.beginPath();
    for (let x = offsetX; x < W; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = offsetY; y < H; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // 粗网格（每5格）
    const bigGridSize = gridSize * 5;
    const bigOffsetX = ((tx % bigGridSize) + bigGridSize) % bigGridSize;
    const bigOffsetY = ((ty % bigGridSize) + bigGridSize) % bigGridSize;
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 + 0.05 * scale})`;
    ctx.beginPath();
    for (let x = bigOffsetX; x < W; x += bigGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = bigOffsetY; y < H; y += bigGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  };

  const getCardBottomCenter = (card: CardType): { x: number; y: number } => {
    const pos = getCardAnimatedPos(card);
    const cx = pos ? pos.x : card.x;
    const cy = pos ? pos.y : card.y;
    return { x: cx + card.width / 2, y: cy + card.height };
  };

  const getCardTopCenter = (card: CardType): { x: number; y: number } => {
    const pos = getCardAnimatedPos(card);
    const cx = pos ? pos.x : card.x;
    const cy = pos ? pos.y : card.y;
    return { x: cx + card.width / 2, y: cy };
  };

  // 检测曲线与卡片是否相交（粗略：卡片与控制点矩形重叠）
  const adjustControlPoints = (
    p0: { x: number; y: number },
    p3: { x: number; y: number },
    cardMap: Record<string, CardType>,
    excludeFromId: string,
    excludeToId: string
  ): { c1: { x: number; y: number }; c2: { x: number; y: number } } => {
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // 基础控制点：垂向外拉
    const off = Math.min(120, dist * 0.35);
    const perpX = -dy / dist;
    const perpY = dx / dist;
    let c1 = { x: p0.x + dx * 0.3 + perpX * off, y: p0.y + dy * 0.3 + perpY * off };
    let c2 = { x: p0.x + dx * 0.7 + perpX * off, y: p0.y + dy * 0.7 + perpY * off };

    // 检查每个卡片，看看是否与曲线碰撞，如果有则加大偏移
    for (const id in cardMap) {
      if (id === excludeFromId || id === excludeToId) continue;
      const card = cardMap[id];
      const pos = animatingCardsRef.current[id]
        ? { x: animatingCardsRef.current[id].endX, y: animatingCardsRef.current[id].endY }
        : { x: card.x, y: card.y };
      const rect = { x: pos.x, y: pos.y, w: card.width, h: card.height };
      // 采样曲线点
      let hit = false;
      for (let t = 0.2; t <= 0.8; t += 0.1) {
        const bx = bezierPoint(p0.x, c1.x, c2.x, p3.x, t);
        const by = bezierPoint(p0.y, c1.y, c2.y, p3.y, t);
        if (bx > rect.x - 10 && bx < rect.x + rect.w + 10 &&
            by > rect.y - 10 && by < rect.y + rect.h + 10) {
          hit = true;
          break;
        }
      }
      if (hit) {
        // 反向拉
        const extra = 80;
        c1 = { x: c1.x - perpX * extra, y: c1.y - perpY * extra };
        c2 = { x: c2.x - perpX * extra, y: c2.y - perpY * extra };
        // 也可以再试另一侧，这里简单处理即可
      }
    }

    return { c1, c2 };
  };

  const bezierPoint = (a: number, b: number, c: number, d: number, t: number) => {
    const mt = 1 - t;
    return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
  };

  const drawConnections = (ctx: CanvasRenderingContext2D, tx: number, ty: number, scale: number) => {
    const cardMap: Record<string, CardType> = {};
    for (const card of cards) cardMap[card.id] = card;

    for (const conn of connections) {
      const fromCard = cardMap[conn.fromCardId];
      const toCard = cardMap[conn.toCardId];
      if (!fromCard || !toCard) continue;

      const p0W = getCardBottomCenter(fromCard);
      const p3W = getCardTopCenter(toCard);
      const { c1: c1W, c2: c2W } = adjustControlPoints(p0W, p3W, cardMap, conn.fromCardId, conn.toCardId);

      const p0 = { x: p0W.x * scale + tx, y: p0W.y * scale + ty };
      const p3 = { x: p3W.x * scale + tx, y: p3W.y * scale + ty };
      const c1 = { x: c1W.x * scale + tx, y: c1W.y * scale + ty };
      const c2 = { x: c2W.x * scale + tx, y: c2W.y * scale + ty };

      const hovered = hoveredConnIdRef.current === conn.id;
      const alpha = hovered ? 1 : 0.6;
      const lineWidth = hovered ? 3 : 2;

      // 渐变色
      const grad = ctx.createLinearGradient(p0.x, p0.y, p3.x, p3.y);
      grad.addColorStop(0, hexOrRgbaToRgba(fromCard.color, alpha));
      grad.addColorStop(1, hexOrRgbaToRgba(toCard.color, alpha));

      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
      ctx.stroke();

      // 箭头
      const tHead = 0.96;
      const ax = bezierPoint(p0.x, c1.x, c2.x, p3.x, tHead);
      const ay = bezierPoint(p0.y, c1.y, c2.y, p3.y, tHead);
      const axt = bezierPoint(p0.x, c1.x, c2.x, p3.x, 1);
      const ayt = bezierPoint(p0.y, c1.y, c2.y, p3.y, 1);
      const angle = Math.atan2(ayt - ay, axt - ax);
      const arr = 10 * Math.max(0.6, scale);
      const p1x = axt - arr * Math.cos(angle - Math.PI / 6);
      const p1y = ayt - arr * Math.sin(angle - Math.PI / 6);
      const p2x = axt - arr * Math.cos(angle + Math.PI / 6);
      const p2y = ayt - arr * Math.sin(angle + Math.PI / 6);

      ctx.fillStyle = hexOrRgbaToRgba(toCard.color, alpha);
      ctx.beginPath();
      ctx.moveTo(axt, ayt);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();
    }
  };

  const hexOrRgbaToRgba = (color: string, alpha: number): string => {
    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
      return color;
    }
    // hex
    const h = color.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const drawTempConnection = (ctx: CanvasRenderingContext2D, conn: typeof connectingRef.current, tx: number, ty: number, scale: number) => {
    if (!conn) return;
    const p0 = { x: conn.startX * scale + tx, y: conn.startY * scale + ty };
    const p3 = { x: conn.curX * scale + tx, y: conn.curY * scale + ty };
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const off = Math.min(100, dist * 0.3);
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const c1 = { x: p0.x + dx * 0.3 + perpX * off, y: p0.y + dy * 0.3 + perpY * off };
    const c2 = { x: p0.x + dx * 0.7 + perpX * off, y: p0.y + dy * 0.7 + perpY * off };

    ctx.strokeStyle = conn.targetId ? 'rgba(155, 89, 182, 0.95)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // 初始绘制
  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  // 数据变化重绘
  useEffect(() => {
    scheduleDraw();
  }, [cards, connections, transform]);

  // ================= 事件处理 =================
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = Math.exp(delta * 0.001);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { scale, x, y } = transformRef.current;
    let newScale = scale * factor;
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const actualFactor = newScale / scale;
    const newX = mx - (mx - x) * actualFactor;
    const newY = my - (my - y) * actualFactor;
    setTransform({ x: newX, y: newY, scale: newScale });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 空格按下 -> 平移画布
    if (spacePressedRef.current || e.button === 1) {
      e.preventDefault();
      panningRef.current = true;
      panStartRef.current = { mx, my, tx: transformRef.current.x, ty: transformRef.current.y };
      return;
    }

    // 左键点击空白：取消选择
    if (e.button === 0) {
      onSelectCard(null);
      // 画布平移（按住中键或无操作的普通拖拽也可平移）
      // 这里允许普通拖拽平移
      panningRef.current = true;
      panStartRef.current = { mx, my, tx: transformRef.current.x, ty: transformRef.current.y };
    }
  }, [onSelectCard]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const world = screenToWorld(mx, my);
    onCreateCard(world.x - DEFAULT_CARD_W / 2, world.y - DEFAULT_CARD_H / 2);
  }, [onCreateCard, screenToWorld]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 平移
    if (panningRef.current) {
      const { mx: smx, my: smy, tx, ty } = panStartRef.current;
      setTransform((prev) => ({ ...prev, x: tx + (mx - smx), y: ty + (my - smy) }));
      return;
    }

    // 拖拽卡片
    if (draggingCardRef.current) {
      const d = draggingCardRef.current;
      const t = transformRef.current;
      const dx = (mx - d.mx) / t.scale;
      const dy = (my - d.my) / t.scale;
      const newX = d.cx + dx;
      const newY = d.cy + dy;
      // 更新 prevCards 实时位置
      if (prevCardsRef.current[d.id]) {
        prevCardsRef.current[d.id].x = newX;
        prevCardsRef.current[d.id].y = newY;
      }
      if (moveCardDebounceRef.current) window.clearTimeout(moveCardDebounceRef.current);
      const id = d.id;
      moveCardDebounceRef.current = window.setTimeout(() => {
        onUpdateCard(id, { x: newX, y: newY });
      }, 80);
      // 立即本地更新
      setLocalCardPos(id, newX, newY);
      scheduleDraw();
      return;
    }

    // 调整卡片大小
    if (resizingCardRef.current) {
      const d = resizingCardRef.current;
      const t = transformRef.current;
      const dx = (mx - d.mx) / t.scale;
      const dy = (my - d.my) / t.scale;
      const newW = Math.max(160, d.w + dx);
      const newH = Math.max(110, d.h + dy);
      if (resizeCardDebounceRef.current) window.clearTimeout(resizeCardDebounceRef.current);
      const id = d.id;
      resizeCardDebounceRef.current = window.setTimeout(() => {
        onUpdateCard(id, { width: newW, height: newH });
      }, 80);
      setLocalCardSize(id, newW, newH);
      scheduleDraw();
      return;
    }

    // 创建连线
    if (connectingRef.current) {
      const world = screenToWorld(mx, my);
      connectingRef.current.curX = world.x;
      connectingRef.current.curY = world.y;
      // 检测是否有目标卡片顶部被命中
      const hitCardId = findCardNearTop(world.x, world.y);
      connectingRef.current.targetId = hitCardId;
      scheduleDraw();
      return;
    }

    // 否则检测连线悬停
    checkConnectionHover(mx, my);
  }, [screenToWorld, onUpdateCard, scheduleDraw, cards, connections]);

  const checkConnectionHover = useCallback((mx: number, my: number) => {
    const { x: tx, y: ty, scale } = transformRef.current;
    const cardMap: Record<string, CardType> = {};
    for (const card of cards) cardMap[card.id] = card;

    let closestId: string | null = null;
    let closestDist = 8;

    for (const conn of connections) {
      const fromCard = cardMap[conn.fromCardId];
      const toCard = cardMap[conn.toCardId];
      if (!fromCard || !toCard) continue;
      const p0W = getCardBottomCenter(fromCard);
      const p3W = getCardTopCenter(toCard);
      const { c1: c1W, c2: c2W } = adjustControlPoints(p0W, p3W, cardMap, conn.fromCardId, conn.toCardId);
      const p0 = { x: p0W.x * scale + tx, y: p0W.y * scale + ty };
      const p3 = { x: p3W.x * scale + tx, y: p3W.y * scale + ty };
      const c1 = { x: c1W.x * scale + tx, y: c1W.y * scale + ty };
      const c2 = { x: c2W.x * scale + tx, y: c2W.y * scale + ty };

      for (let t = 0; t <= 1; t += 0.04) {
        const bx = bezierPoint(p0.x, c1.x, c2.x, p3.x, t);
        const by = bezierPoint(p0.y, c1.y, c2.y, p3.y, t);
        const dist = Math.sqrt((bx - mx) ** 2 + (by - my) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = conn.id;
        }
      }
    }

    if (closestId !== hoveredConnIdRef.current) {
      hoveredConnIdRef.current = closestId;
      scheduleDraw();
    }
  }, [cards, connections, scheduleDraw]);

  const findCardNearTop = (wx: number, wy: number): string | null => {
    for (const card of cards) {
      const pos = getCardAnimatedPos(card);
      const cx = pos ? pos.x : card.x;
      const cy = pos ? pos.y : card.y;
      const topCenterX = cx + card.width / 2;
      const topCenterY = cy;
      const dist = Math.sqrt((wx - topCenterX) ** 2 + (wy - topCenterY) ** 2);
      if (dist < Math.max(50, card.width * 0.4)) {
        return card.id;
      }
    }
    return null;
  };

  // 本地状态（用于拖拽实时显示，不用等服务器回传）
  const [localCardOverrides, setLocalCardOverrides] = useState<Record<string, { x?: number; y?: number; width?: number; height?: number }>>({});

  const setLocalCardPos = (id: string, x: number, y: number) => {
    setLocalCardOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), x, y } }));
  };
  const setLocalCardSize = (id: string, width: number, height: number) => {
    setLocalCardOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), width, height } }));
  };

  // 清理本地 overrides（当收到服务器相同位置时）
  useEffect(() => {
    setLocalCardOverrides({});
  }, [cards.length]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // 平移结束
    if (panningRef.current) {
      panningRef.current = false;
    }

    // 拖拽卡片结束
    if (draggingCardRef.current) {
      const d = draggingCardRef.current;
      const t = transformRef.current;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = (mx - d.mx) / t.scale;
        const dy = (my - d.my) / t.scale;
        const newX = d.cx + dx;
        const newY = d.cy + dy;
        if (moveCardDebounceRef.current) window.clearTimeout(moveCardDebounceRef.current);
        moveCardDebounceRef.current = null;
        onUpdateCard(d.id, { x: newX, y: newY });
      }
      draggingCardRef.current = null;
    }

    // 调整大小结束
    if (resizingCardRef.current) {
      const d = resizingCardRef.current;
      const t = transformRef.current;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = (mx - d.mx) / t.scale;
        const dy = (my - d.my) / t.scale;
        const newW = Math.max(160, d.w + dx);
        const newH = Math.max(110, d.h + dy);
        if (resizeCardDebounceRef.current) window.clearTimeout(resizeCardDebounceRef.current);
        resizeCardDebounceRef.current = null;
        onUpdateCard(d.id, { width: newW, height: newH });
      }
      resizingCardRef.current = null;
    }

    // 创建连线结束
    if (connectingRef.current) {
      const fromId = connectingRef.current.fromId;
      const targetId = connectingRef.current.targetId;
      if (targetId && fromId !== targetId) {
        onCreateConnection(fromId, targetId);
      }
      connectingRef.current = null;
      scheduleDraw();
    }
  }, [onUpdateCard, onCreateConnection, scheduleDraw]);

  const handleMouseLeave = () => {
    // 失去鼠标时暂不取消，mouseup 在文档级会触发
  };

  // 卡片事件回调
  const handleCardDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    e.stopPropagation();
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    // 取消平移模式
    panningRef.current = false;
    draggingCardRef.current = {
      id,
      mx, my,
      cx: (localCardOverrides[id]?.x !== undefined ? localCardOverrides[id].x : card.x)!,
      cy: (localCardOverrides[id]?.y !== undefined ? localCardOverrides[id].y : card.y)!,
    };
  }, [cards, localCardOverrides]);

  const handleCardResizeStart = useCallback((id: string, e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    e.stopPropagation();
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    panningRef.current = false;
    resizingCardRef.current = {
      id, mx, my,
      w: (localCardOverrides[id]?.width !== undefined ? localCardOverrides[id].width : card.width)!,
      h: (localCardOverrides[id]?.height !== undefined ? localCardOverrides[id].height : card.height)!,
    };
  }, [cards, localCardOverrides]);

  const handleConnectionStart = useCallback((id: string, e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    e.stopPropagation();
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const world = screenToWorld(mx, my);
    const pos = getCardAnimatedPos(card);
    const bottomX = (pos ? pos.x : card.x) + card.width / 2;
    const bottomY = (pos ? pos.y : card.y) + card.height;
    panningRef.current = false;
    connectingRef.current = {
      fromId: id,
      startX: bottomX,
      startY: bottomY,
      curX: world.x,
      curY: world.y,
      targetId: null,
    };
  }, [cards, screenToWorld]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // 先检查是否命中连线
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    checkConnectionHover(mx, my);
    if (hoveredConnIdRef.current) {
      e.preventDefault();
      onDeleteConnection(hoveredConnIdRef.current);
      hoveredConnIdRef.current = null;
      scheduleDraw();
    }
  }, [checkConnectionHover, onDeleteConnection, scheduleDraw]);

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = true;
        if (document.body) document.body.style.cursor = 'grab';
      }
      // Ctrl+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo();
      }
      // Delete/Backspace 删除选中卡片（焦点不在输入框时）
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCardId) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && !active.hasAttribute('contenteditable'))) {
          e.preventDefault();
          onDeleteCard(selectedCardId);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        if (document.body) document.body.style.cursor = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedCardId, onUndo, onRedo, onDeleteCard]);

  // 合并本地覆盖卡片
  const displayCards = cards.map((c) => {
    const override = localCardOverrides[c.id];
    if (!override) return c;
    return { ...c, ...override };
  });

  const { x: tx, y: ty, scale } = transform;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#1A1A2E',
        cursor: panningRef.current ? 'grabbing' : spacePressedRef.current ? 'grab' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {displayCards.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={selectedCardId === card.id}
            onSelect={onSelectCard}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
            onDragStart={handleCardDragStart}
            onResizeStart={handleCardResizeStart}
            onConnectionStart={handleConnectionStart}
            isDragTarget={connectingRef.current?.targetId === card.id && connectingRef.current?.fromId !== card.id}
            scale={scale}
            autoLayoutAnimating={Object.keys(animatingCardsRef.current).length > 0}
            animatedPos={getCardAnimatedPos(card)}
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
