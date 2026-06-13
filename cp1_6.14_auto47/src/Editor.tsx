import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
  EditorStateShape,
  Action,
  ELEMENT_COLORS,
  GridElement,
  ElementType
} from './EditorState';
import { buildCollisionGrid, CollisionResult } from './CollisionEngine';

interface EditorProps {
  state: EditorStateShape;
  dispatch: React.Dispatch<Action>;
  dragType: ElementType | null;
  onDragEnd: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  element: GridElement | null;
}

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const drawElementShape = (
  ctx: CanvasRenderingContext2D,
  el: GridElement,
  x: number,
  y: number,
  size: number,
  scale: number = 1
) => {
  const color = ELEMENT_COLORS[el.type];
  const opacity = el.type === 'water' && el.properties.opacity !== undefined
    ? el.properties.opacity
    : 1;

  const cx = x + size / 2;
  const cy = y + size / 2;
  const padding = size * 0.06;
  const innerSize = size - padding * 2;
  const drawSize = innerSize * scale;
  const drawX = cx - drawSize / 2;
  const drawY = cy - drawSize / 2;
  const radius = Math.max(2, size * 0.07);

  ctx.save();
  ctx.globalAlpha = opacity;

  if (el.properties.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((el.properties.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (el.type) {
    case 'grass':
    case 'dirt':
    case 'sand':
      roundRect(ctx, drawX, drawY, drawSize, drawSize, radius);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (el.type === 'grass') {
        ctx.strokeStyle = 'rgba(22, 101, 52, 0.4)';
        ctx.lineWidth = Math.max(1, size * 0.015);
        for (let i = 0; i < 4; i++) {
          const gx = drawX + (i + 0.5) * (drawSize / 4);
          ctx.beginPath();
          ctx.moveTo(gx, drawY + drawSize * 0.7);
          ctx.lineTo(gx - size * 0.02, drawY + drawSize * 0.55);
          ctx.moveTo(gx, drawY + drawSize * 0.7);
          ctx.lineTo(gx + size * 0.02, drawY + drawSize * 0.5);
          ctx.stroke();
        }
      }
      break;

    case 'water':
      roundRect(ctx, drawX, drawY, drawSize, drawSize, radius);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = Math.max(1, size * 0.015);
      const waveY = drawY + drawSize * 0.3;
      ctx.beginPath();
      ctx.moveTo(drawX + drawSize * 0.1, waveY);
      ctx.bezierCurveTo(
        drawX + drawSize * 0.25, waveY - size * 0.05,
        drawX + drawSize * 0.4, waveY + size * 0.05,
        drawX + drawSize * 0.55, waveY
      );
      ctx.bezierCurveTo(
        drawX + drawSize * 0.7, waveY - size * 0.05,
        drawX + drawSize * 0.85, waveY + size * 0.05,
        drawX + drawSize * 0.95, waveY
      );
      ctx.stroke();
      break;

    case 'rock':
      ctx.fillStyle = color;
      ctx.beginPath();
      const rxC = cx;
      const ryC = cy;
      const rockSize = drawSize * 0.42;
      ctx.moveTo(rxC - rockSize, ryC + rockSize * 0.3);
      ctx.lineTo(rxC - rockSize * 0.7, ryC - rockSize * 0.5);
      ctx.lineTo(rxC - rockSize * 0.1, ryC - rockSize * 0.8);
      ctx.lineTo(rxC + rockSize * 0.6, ryC - rockSize * 0.6);
      ctx.lineTo(rxC + rockSize, ryC + rockSize * 0.1);
      ctx.lineTo(rxC + rockSize * 0.7, ryC + rockSize * 0.7);
      ctx.lineTo(rxC - rockSize * 0.3, ryC + rockSize * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(rxC - rockSize * 0.5, ryC - rockSize * 0.4);
      ctx.lineTo(rxC - rockSize * 0.1, ryC - rockSize * 0.7);
      ctx.lineTo(rxC + rockSize * 0.3, ryC - rockSize * 0.5);
      ctx.lineTo(rxC, ryC - rockSize * 0.1);
      ctx.closePath();
      ctx.fill();
      break;

    case 'tree':
      const trunkW = drawSize * 0.18;
      const trunkH = drawSize * 0.32;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - trunkW / 2, cy + drawSize * 0.12, trunkW, trunkH);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy - drawSize * 0.02, drawSize * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(22, 163, 74, 0.5)';
      ctx.beginPath();
      ctx.arc(cx - drawSize * 0.1, cy - drawSize * 0.1, drawSize * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'building':
      const bw = drawSize * 0.78;
      const bh = drawSize * 0.7;
      const bx = cx - bw / 2;
      const by = cy - bh / 2 + drawSize * 0.05;
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(bx - drawSize * 0.04, by);
      ctx.lineTo(cx, by - drawSize * 0.2);
      ctx.lineTo(bx + bw + drawSize * 0.04, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      const winSize = drawSize * 0.1;
      ctx.fillRect(bx + bw * 0.18, by + bh * 0.25, winSize, winSize);
      ctx.fillRect(bx + bw * 0.6, by + bh * 0.25, winSize, winSize);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(cx - drawSize * 0.06, by + bh * 0.55, drawSize * 0.12, drawSize * 0.22);
      break;

    case 'start':
      roundRect(ctx, drawX, drawY, drawSize, drawSize, radius);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${drawSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', cx, cy);
      break;

    case 'end':
      roundRect(ctx, drawX, drawY, drawSize, drawSize, radius);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${drawSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', cx, cy);
      break;
  }

  ctx.restore();
};

const Editor: React.FC<EditorProps> = ({ state, dispatch, dragType, onDragEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [hoverGrid, setHoverGrid] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, element: null
  });
  const animFrameRef = useRef<number>(0);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const dragOverRef = useRef(false);

  const collision: CollisionResult = useMemo(
    () => buildCollisionGrid(state.elements, state.gridSize),
    [state.elements, state.gridSize]
  );

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.code === 'Escape') {
        setContextMenu({ visible: false, x: 0, y: 0, element: null });
        dispatch({ type: 'SELECT_ELEMENT', payload: null });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dispatch]);

  const worldToScreen = useCallback(
    (gx: number, gy: number) => {
      const cs = state.cellSize * state.zoom;
      return {
        x: gx * cs + state.panX + canvasSize.w / 2 - (state.gridSize * cs) / 2,
        y: gy * cs + state.panY + canvasSize.h / 2 - (state.gridSize * cs) / 2
      };
    },
    [state.cellSize, state.zoom, state.panX, state.panY, state.gridSize, canvasSize]
  );

  const screenToGrid = useCallback(
    (sx: number, sy: number): { x: number; y: number } | null => {
      const cs = state.cellSize * state.zoom;
      const ox = canvasSize.w / 2 - (state.gridSize * cs) / 2 + state.panX;
      const oy = canvasSize.h / 2 - (state.gridSize * cs) / 2 + state.panY;
      const relX = sx - ox;
      const relY = sy - oy;
      if (relX < 0 || relY < 0 || relX >= state.gridSize * cs || relY >= state.gridSize * cs) {
        return null;
      }
      return {
        x: Math.floor(relX / cs),
        y: Math.floor(relY / cs)
      };
    },
    [state.cellSize, state.zoom, state.panX, state.panY, state.gridSize, canvasSize]
  );

  const placeElementAt = useCallback(
    (gridX: number, gridY: number, type: ElementType) => {
      const id = 'el_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      dispatch({
        type: 'PLACE_ELEMENT',
        payload: {
          id,
          type,
          gridX,
          gridY,
          properties: type === 'water' ? { opacity: 0.8 } : {},
          placedAt: Date.now()
        }
      });
    },
    [dispatch]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = canvasSize.w + 'px';
    canvas.style.height = canvasSize.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    const cs = state.cellSize * state.zoom;
    const originX = canvasSize.w / 2 - (state.gridSize * cs) / 2 + state.panX;
    const originY = canvasSize.h / 2 - (state.gridSize * cs) / 2 + state.panY;
    const totalW = state.gridSize * cs;
    const totalH = state.gridSize * cs;

    ctx.save();
    ctx.strokeStyle = '#ffffff11';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= state.gridSize; gx++) {
      const x = originX + gx * cs;
      ctx.moveTo(x, originY);
      ctx.lineTo(x, originY + totalH);
    }
    for (let gy = 0; gy <= state.gridSize; gy++) {
      const y = originY + gy * cs;
      ctx.moveTo(originX, y);
      ctx.lineTo(originX + totalW, y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, totalW, totalH);
    ctx.restore();

    const now = performance.now();

    const animMap = new Map<string, { startTime: number; type: 'place' | 'delete' }>();
    for (const a of state.animatingCells) {
      animMap.set(a.key, { startTime: a.startTime, type: a.type });
    }

    const elementsByPos = new Map<string, GridElement>();
    for (const el of state.elements) {
      elementsByPos.set(`${el.gridX},${el.gridY}`, el);
    }

    for (let gy = 0; gy < state.gridSize; gy++) {
      for (let gx = 0; gx < state.gridSize; gx++) {
        const key = `${gx},${gy}`;
        const anim = animMap.get(key);
        const el = elementsByPos.get(key);

        if (anim) {
          const elapsed = now - anim.startTime;
          const t = Math.min(1, elapsed / 200);
          if (anim.type === 'place') {
            const scale = easeOutBack(t);
            if (el) {
              const pos = worldToScreen(gx, gy);
              drawElementShape(ctx, el, pos.x, pos.y, cs, scale);
            }
          } else if (anim.type === 'delete') {
            const alpha = 1 - t;
            if (alpha > 0 && el) {
              ctx.save();
              ctx.globalAlpha = alpha;
              const pos = worldToScreen(gx, gy);
              drawElementShape(ctx, el, pos.x, pos.y, cs, 1 + t * 0.15);
              ctx.restore();
            }
          }
        } else if (el) {
          const pos = worldToScreen(gx, gy);
          drawElementShape(ctx, el, pos.x, pos.y, cs, 1);
        }
      }
    }

    if (state.showCollisionLayer) {
      ctx.save();
      for (let gy = 0; gy < state.gridSize; gy++) {
        for (let gx = 0; gx < state.gridSize; gx++) {
          if (collision.collisionGrid[gy]?.[gx]) {
            const pos = worldToScreen(gx, gy);
            ctx.fillStyle = '#ff000040';
            ctx.fillRect(pos.x + cs * 0.04, pos.y + cs * 0.04, cs * 0.92, cs * 0.92);
          }
        }
      }
      ctx.restore();
    }

    const blinkPhase = (now % 1200) / 1200;
    const blinkAlpha = 0.15 + Math.abs(Math.sin(blinkPhase * Math.PI)) * 0.4;
    for (const el of state.elements) {
      if (el.type === 'start' || el.type === 'end') {
        const pos = worldToScreen(el.gridX, el.gridY);
        ctx.save();
        ctx.globalAlpha = blinkAlpha * (state.showCollisionLayer ? 1 : 0.8);
        ctx.fillStyle = el.type === 'start' ? '#00ff00' : '#ff0000';
        const inset = cs * 0.05;
        ctx.fillRect(pos.x + inset, pos.y + inset, cs - inset * 2, cs - inset * 2);
        ctx.restore();
      }
    }

    if (state.selectedElementId) {
      const sel = state.elements.find(e => e.id === state.selectedElementId);
      if (sel) {
        const pos = worldToScreen(sel.gridX, sel.gridY);
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        const inset = -3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(pos.x + inset, pos.y + inset, cs - inset * 2, cs - inset * 2);
        ctx.restore();
      }
    }

    if (hoverGrid && (dragType || state.selectedTool) && !isPanning) {
      const type = dragType || state.selectedTool;
      if (type) {
        const pos = worldToScreen(hoverGrid.x, hoverGrid.y);
        ctx.save();
        ctx.globalAlpha = 0.55;
        const ghostEl: GridElement = {
          id: 'ghost',
          type,
          gridX: hoverGrid.x,
          gridY: hoverGrid.y,
          properties: type === 'water' ? { opacity: 0.8 } : {},
          placedAt: 0
        };
        drawElementShape(ctx, ghostEl, pos.x, pos.y, cs, 1);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(pos.x + 1, pos.y + 1, cs - 2, cs - 2);
        ctx.restore();
      }
    }

    const gradW = Math.min(30, canvasSize.w * 0.05);
    const gradH = Math.min(30, canvasSize.h * 0.05);

    const fadeAreaX = Math.max(0, originX);
    const fadeAreaY = Math.max(0, originY);
    const fadeAreaW = Math.min(canvasSize.w, originX + totalW) - fadeAreaX;
    const fadeAreaH = Math.min(canvasSize.h, originY + totalH) - fadeAreaY;

    if (fadeAreaW > 0 && fadeAreaH > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(fadeAreaX, fadeAreaY, fadeAreaW, fadeAreaH);
      ctx.clip();

      const lgTop = ctx.createLinearGradient(0, fadeAreaY, 0, fadeAreaY + gradH);
      lgTop.addColorStop(0, '#0f0f1aff');
      lgTop.addColorStop(1, '#0f0f1a00');
      ctx.fillStyle = lgTop;
      ctx.fillRect(fadeAreaX, fadeAreaY, fadeAreaW, gradH);

      const lgBottom = ctx.createLinearGradient(0, fadeAreaY + fadeAreaH - gradH, 0, fadeAreaY + fadeAreaH);
      lgBottom.addColorStop(0, '#0f0f1a00');
      lgBottom.addColorStop(1, '#0f0f1aff');
      ctx.fillStyle = lgBottom;
      ctx.fillRect(fadeAreaX, fadeAreaY + fadeAreaH - gradH, fadeAreaW, gradH);

      const lgLeft = ctx.createLinearGradient(fadeAreaX, 0, fadeAreaX + gradW, 0);
      lgLeft.addColorStop(0, '#0f0f1aff');
      lgLeft.addColorStop(1, '#0f0f1a00');
      ctx.fillStyle = lgLeft;
      ctx.fillRect(fadeAreaX, fadeAreaY, gradW, fadeAreaH);

      const lgRight = ctx.createLinearGradient(fadeAreaX + fadeAreaW - gradW, 0, fadeAreaX + fadeAreaW, 0);
      lgRight.addColorStop(0, '#0f0f1a00');
      lgRight.addColorStop(1, '#0f0f1aff');
      ctx.fillStyle = lgRight;
      ctx.fillRect(fadeAreaX + fadeAreaW - gradW, fadeAreaY, gradW, fadeAreaH);

      ctx.restore();
    }

    dispatch({ type: 'CLEAR_ANIMATING_CELLS' });
  }, [state, canvasSize, collision, hoverGrid, dragType, isPanning, worldToScreen, dispatch]);

  useEffect(() => {
    const loop = () => {
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  const getRelativePos = (e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      const p = getRelativePos(e);
      lastPosRef.current = p;
      return;
    }
    if (e.button === 0) {
      setContextMenu({ visible: false, x: 0, y: 0, element: null });
      const p = getRelativePos(e);
      const grid = screenToGrid(p.x, p.y);
      if (grid) {
        if (state.selectedTool) {
          placeElementAt(grid.x, grid.y, state.selectedTool);
        } else {
          const el = state.elements.find(em => em.gridX === grid.x && em.gridY === grid.y);
          if (el) {
            dispatch({ type: 'SELECT_ELEMENT', payload: el.id });
          } else {
            dispatch({ type: 'SELECT_ELEMENT', payload: null });
          }
        }
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const p = getRelativePos(e);
    if (isPanning && (e.buttons === 1 || e.buttons === 4)) {
      const dx = p.x - lastPosRef.current.x;
      const dy = p.y - lastPosRef.current.y;
      const multiplier = spacePressed ? 2 : 1;
      dispatch({ type: 'ADJUST_PAN', payload: { dx: dx * multiplier, dy: dy * multiplier } });
      lastPosRef.current = p;
    } else {
      const grid = screenToGrid(p.x, p.y);
      setHoverGrid(grid);
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
  };

  const onMouseLeave = () => {
    setIsPanning(false);
    setHoverGrid(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.5, Math.min(3, state.zoom + delta * state.zoom));
    dispatch({ type: 'SET_ZOOM', payload: newZoom });
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = getRelativePos(e);
    const grid = screenToGrid(p.x, p.y);
    if (grid) {
      const el = state.elements.find(em => em.gridX === grid.x && em.gridY === grid.y);
      if (el) {
        dispatch({ type: 'SELECT_ELEMENT', payload: el.id });
        const containerRect = containerRef.current!.getBoundingClientRect();
        setContextMenu({
          visible: true,
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
          element: el
        });
        return;
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0, element: null });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!dragType) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dragOverRef.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const grid = screenToGrid(p.x, p.y);
    setHoverGrid(grid);
  };

  const onDragLeave = () => {
    dragOverRef.current = false;
  };

  const onDrop = (e: React.DragEvent) => {
    if (!dragType) return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const grid = screenToGrid(p.x, p.y);
    if (grid) {
      placeElementAt(grid.x, grid.y, dragType);
    }
    onDragEnd();
    setHoverGrid(null);
    dragOverRef.current = false;
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, element: null });
  };

  const handleDelete = () => {
    if (contextMenu.element) {
      dispatch({ type: 'DELETE_ELEMENT', payload: contextMenu.element.id });
    }
    closeContextMenu();
  };

  const handleRotate = () => {
    if (contextMenu.element) {
      dispatch({ type: 'ROTATE_ELEMENT', payload: { id: contextMenu.element.id, degrees: 90 } });
    }
  };

  const handleOpacityChange = (val: number) => {
    if (contextMenu.element) {
      dispatch({
        type: 'UPDATE_ELEMENT_PROPERTIES',
        payload: { id: contextMenu.element.id, properties: { opacity: val } }
      });
    }
  };

  const passablePct = (collision.passableRatio * 100).toFixed(1);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isPanning || spacePressed ? 'grabbing' : dragType || state.selectedTool ? 'crosshair' : 'default'
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => { if (contextMenu.visible) closeContextMenu(); }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '10px 14px',
          background: '#000000cc',
          backdropFilter: 'blur(6px)',
          borderRadius: 8,
          color: '#e5e7eb',
          fontSize: 13,
          lineHeight: 1.7,
          pointerEvents: 'none',
          border: '1px solid #ffffff15',
          boxShadow: '0 4px 20px #00000060'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#a5b4fc' }}>碰撞信息</div>
        <div>网格尺寸：{state.gridSize} × {state.gridSize}</div>
        <div>碰撞格数：<span style={{ color: '#f87171' }}>{collision.blockedCount}</span></div>
        <div>可通行比例：<span style={{ color: '#4ade80' }}>{passablePct}%</span> ({collision.passableCount}/{collision.totalCells})</div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
          缩放: {(state.zoom * 100).toFixed(0)}%
        </div>
      </div>

      {contextMenu.visible && contextMenu.element && (
        <div
          style={{
            position: 'absolute',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#000000cc',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            padding: 6,
            minWidth: 200,
            border: '1px solid #ffffff18',
            boxShadow: '0 8px 32px #00000080',
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '4px 10px 8px',
              fontSize: 12,
              color: '#a5b4fc',
              borderBottom: '1px solid #ffffff12',
              marginBottom: 4,
              fontWeight: 600
            }}
          >
            {ELEMENT_COLORS[contextMenu.element.type] && (
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: ELEMENT_COLORS[contextMenu.element.type],
                  marginRight: 8,
                  verticalAlign: 'middle'
                }}
              />
            )}
            元素属性 · ({contextMenu.element.gridX}, {contextMenu.element.gridY})
          </div>

          <button
            onClick={handleDelete}
            style={{
              display: 'block',
              width: '100%',
              height: 36,
              padding: '0 12px',
              background: 'transparent',
              color: '#fca5a5',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 13,
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b82f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            🗑 删除元素
          </button>

          <button
            onClick={handleRotate}
            style={{
              display: 'block',
              width: '100%',
              height: 36,
              padding: '0 12px',
              background: 'transparent',
              color: '#e5e7eb',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 13,
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b82f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ↻ 旋转 90°（当前: {contextMenu.element.properties.rotation || 0}°）
          </button>

          {contextMenu.element.type === 'water' && (
            <div style={{ padding: '8px 12px 6px' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                透明度: {((contextMenu.element.properties.opacity ?? 0.8) * 100).toFixed(0)}%
              </div>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={contextMenu.element.properties.opacity ?? 0.8}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>
          )}

          <button
            onClick={closeContextMenu}
            style={{
              display: 'block',
              width: '100%',
              height: 36,
              padding: '0 12px',
              background: 'transparent',
              color: '#9ca3af',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 13,
              marginTop: 4,
              borderTop: '1px solid #ffffff12',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b82f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
};

export default Editor;
