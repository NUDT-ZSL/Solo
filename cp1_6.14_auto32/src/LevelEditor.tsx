import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import {
  LevelElement,
  ElementType,
  EditorMode,
  TOOLBOX_ITEMS,
  DEFAULT_ELEMENT_SIZES,
  DEFAULT_ELEMENT_COLORS,
  PRESET_COLORS,
} from './types';
import { PlayerController, PlayerState, CameraState, GameStats } from './PlayerController';
import DifficultyChart from './DifficultyChart';

interface LevelEditorProps {
  mode: EditorMode;
  elements: LevelElement[];
  onElementsChange: (elements: LevelElement[]) => void;
  showToolbox?: boolean;
  showProperties?: boolean;
  isMainCanvas?: boolean;
}

interface HistoryState {
  past: LevelElement[][];
  future: LevelElement[][];
}

interface SpringAnimation {
  id: string;
  startTime: number;
  fromY: number;
  targetY: number;
}

type DragSource = 'toolbox' | 'canvas';

interface DragState {
  isDragging: boolean;
  source: DragSource;
  elementType?: ElementType;
  elementId?: string;
  startMouseX?: number;
  startMouseY?: number;
  startElementX?: number;
  startElementY?: number;
  offsetX?: number;
  offsetY?: number;
}

const MAX_HISTORY = 50;
const SPRING_DURATION = 400;
const SPRING_ELASTICITY = 0.3;
const GRID_SIZE = 20;
const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.067)';

function generateId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function easeOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

function springEase(t: number, elasticity: number = SPRING_ELASTICITY): number {
  const linear = Math.min(1, t / 1);
  const elastic = easeOutElastic(Math.min(1, t / (1 + elasticity)));
  return linear + (elastic - linear) * elasticity;
}

const LevelEditor = forwardRef(function LevelEditor(
  { mode, elements, onElementsChange, showToolbox, showProperties, isMainCanvas }: LevelEditorProps,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, camX: 0, camY: 0 });

  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [springAnimations, setSpringAnimations] = useState<SpringAnimation[]>([]);

  const dragRef = useRef<DragState>({ isDragging: false, source: 'canvas' });
  const playerControllerRef = useRef<PlayerController | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const playStatsRef = useRef<GameStats | null>(null);
  const playerRenderRef = useRef<{ player: PlayerState | null; camera: CameraState | null }>({
    player: null,
    camera: null,
  });

  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionJumpRecord, setCompletionJumpRecord] = useState<number[]>([]);

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedId) || null,
    [elements, selectedId]
  );

  const pushHistory = useCallback(
    (newElements: LevelElement[]) => {
      setHistory((h) => {
        const newPast = [...h.past, elements];
        if (newPast.length > MAX_HISTORY) newPast.shift();
        return { past: newPast, future: [] };
      });
      onElementsChange(newElements);
    },
    [elements, onElementsChange]
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const newPast = [...h.past];
      const prev = newPast.pop()!;
      const newFuture = [elements, ...h.future];
      if (newFuture.length > MAX_HISTORY) newFuture.pop();
      onElementsChange(prev);
      return { past: newPast, future: newFuture };
    });
  }, [elements, onElementsChange]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const newFuture = [...h.future];
      const next = newFuture.shift()!;
      const newPast = [...h.past, elements];
      if (newPast.length > MAX_HISTORY) newPast.shift();
      onElementsChange(next);
      return { past: newPast, future: newFuture };
    });
  }, [elements, onElementsChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMainCanvas) return;
      if (mode !== 'edit') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          pushHistory(elements.filter((e) => e.id !== selectedId));
          setSelectedId(null);
        }
      }

      if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isMainCanvas, selectedId, elements, pushHistory, undo, redo]);

  useEffect(() => {
    if (mode === 'play' && isMainCanvas) {
      const controller = new PlayerController(elements);
      playerControllerRef.current = controller;

      setGameStats(null);
      setShowCompletion(false);

      controller.start(
        (player, cam, stats) => {
          playerRenderRef.current = { player, camera: cam };
          setGameStats({ ...stats, jumps: [...stats.jumps] });
          playStatsRef.current = { ...stats, jumps: [...stats.jumps] };
        },
        (stats) => {
          setCompletionJumpRecord([...stats.jumps]);
          setShowCompletion(true);
        }
      );

      return () => {
        controller.destroy();
        playerControllerRef.current = null;
      };
    } else {
      playerRenderRef.current = { player: null, camera: null };
    }
  }, [mode, isMainCanvas, elements]);

  useEffect(() => {
    if (!isMainCanvas) return;

    const render = () => {
      renderCanvas();
      rafIdRef.current = requestAnimationFrame(render);
    };
    rafIdRef.current = requestAnimationFrame(render);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isMainCanvas, elements, camera, selectedId, springAnimations, mode]);

  useEffect(() => {
    if (springAnimations.length === 0) return;
    const now = performance.now();
    const activeAnims = springAnimations.filter(
      (a) => now - a.startTime < SPRING_DURATION + 200
    );
    if (activeAnims.length !== springAnimations.length) {
      setSpringAnimations(activeAnims);
    }
  }, [springAnimations]);

  const addSpringAnimation = useCallback((id: string, targetY: number) => {
    setSpringAnimations((prev) => [
      ...prev.filter((a) => a.id !== id),
      { id, startTime: performance.now(), fromY: targetY - 150, targetY },
    ]);
  }, []);

  const getCanvasOffset = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX / camera.scale) + camera.x,
        y: (screenY / camera.scale) + camera.y,
      };
    },
    [camera]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      return {
        x: (worldX - camera.x) * camera.scale,
        y: (worldY - camera.y) * camera.scale,
      };
    },
    [camera]
  );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    let effectiveCamera = camera;
    if (mode === 'play' && playerRenderRef.current.camera) {
      effectiveCamera = {
        x: playerRenderRef.current.camera.x,
        y: playerRenderRef.current.camera.y,
        scale: camera.scale,
      };
    }

    drawBackground(ctx, displayWidth, displayHeight, effectiveCamera);
    drawGrid(ctx, displayWidth, displayHeight, effectiveCamera);

    if (mode === 'play') {
      drawParallaxLayer(ctx, displayWidth, displayHeight, effectiveCamera, 0.3);
    }

    const now = performance.now();

    for (const elem of elements) {
      let elemY = elem.y;
      const anim = springAnimations.find((a) => a.id === elem.id);
      if (anim && now - anim.startTime < SPRING_DURATION) {
        const t = (now - anim.startTime) / SPRING_DURATION;
        const eased = springEase(t);
        elemY = anim.fromY + (anim.targetY - anim.fromY) * eased;
      }

      drawElement(ctx, elem, elemY, effectiveCamera, elem.id === selectedId);
    }

    if (mode === 'play') {
      if (playerRenderRef.current.player) {
        drawPlayer(ctx, playerRenderRef.current.player, effectiveCamera);
      }
      drawParallaxLayer(ctx, displayWidth, displayHeight, effectiveCamera, 1.0);
    }

    if (mode === 'edit' && dragRef.current.isDragging && dragRef.current.source === 'toolbox') {
      drawDragPreview(ctx, displayWidth, displayHeight);
    }
  }, [elements, camera, selectedId, mode, springAnimations]);

  const drawBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cam: typeof camera
  ) => {
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    if (mode === 'play') {
      const bgOffset = cam.x * 0.1;
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0a0a14');
      gradient.addColorStop(0.5, '#10102a');
      gradient.addColorStop(1, '#0f0f1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
      for (let i = 0; i < 8; i++) {
        const x = ((i * 250 - bgOffset * 0.5) % (w + 300)) - 150;
        const baseY = h * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 120, baseY + Math.sin(i) * 40);
        ctx.lineTo(x + 240, h);
        ctx.closePath();
        ctx.fill();
      }
    }
  };

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cam: typeof camera
  ) => {
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;

    const startX = Math.floor(cam.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(cam.y / GRID_SIZE) * GRID_SIZE;

    for (let gx = startX; gx < cam.x + w / cam.scale; gx += GRID_SIZE) {
      const sx = (gx - cam.x) * cam.scale;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let gy = startY; gy < cam.y + h / cam.scale; gy += GRID_SIZE) {
      const sy = (gy - cam.y) * cam.scale;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
  };

  const drawParallaxLayer = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cam: typeof camera,
    factor: number
  ) => {
    const offset = cam.x * factor;
    ctx.fillStyle = factor < 0.5 ? 'rgba(59, 130, 246, 0.06)' : 'rgba(0, 212, 255, 0.04)';

    for (let i = 0; i < 15; i++) {
      const baseX = i * 180 - (offset % 180) - 100;
      const cloudY = h * (0.15 + (i % 3) * 0.1) + Math.sin(i * 1.3) * 30;
      const cloudW = 60 + (i % 4) * 20;
      const cloudH = 20 + (i % 3) * 10;
      ctx.beginPath();
      ctx.ellipse(baseX, cloudY, cloudW, cloudH, 0, 0, Math.PI * 2);
      ctx.ellipse(baseX + cloudW * 0.4, cloudY - cloudH * 0.4, cloudW * 0.6, cloudH * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(baseX + cloudW * 0.8, cloudY, cloudW * 0.5, cloudH * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawElement = (
    ctx: CanvasRenderingContext2D,
    elem: LevelElement,
    drawY: number,
    cam: typeof camera,
    isSelected: boolean
  ) => {
    const sx = (elem.x - cam.x) * cam.scale;
    const sy = (drawY - cam.y) * cam.scale;
    const sw = elem.width * cam.scale;
    const sh = elem.height * cam.scale;

    ctx.save();

    if (isSelected && mode === 'edit') {
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 12;
    }

    switch (elem.type) {
      case 'platform':
        drawPlatform(ctx, sx, sy, sw, sh, elem.color);
        break;
      case 'spike':
        drawSpike(ctx, sx, sy, sw, sh, elem.color);
        break;
      case 'obstacle':
        drawObstacle(ctx, sx, sy, sw, sh, elem.color);
        break;
      case 'collectible':
        drawCollectible(ctx, sx, sy, sw, sh, elem.color);
        break;
      case 'goal':
        drawGoal(ctx, sx, sy, sw, sh, elem.color);
        break;
    }

    ctx.restore();

    if (isSelected && mode === 'edit') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);
      ctx.setLineDash([]);

      const handles = [
        [sx - 3, sy - 3],
        [sx + sw + 3, sy - 3],
        [sx - 3, sy + sh + 3],
        [sx + sw + 3, sy + sh + 3],
      ];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (const [hx, hy] of handles) {
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
        ctx.strokeRect(hx - 4, hy - 4, 8, 8);
      }
    }
  };

  const drawPlatform = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, lightenColor(color, 0.25));
    grad.addColorStop(1, darkenColor(color, 0.15));
    ctx.fillStyle = grad;

    const r = Math.min(6, w / 2, h / 2);
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + r / 2, y + 2, Math.max(0, w - r), Math.max(1, h * 0.18));
  };

  const drawSpike = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    const spikeCount = Math.max(1, Math.floor(w / 15));
    const spikeW = w / spikeCount;

    ctx.fillStyle = color;
    for (let i = 0; i < spikeCount; i++) {
      const bx = x + i * spikeW;
      ctx.beginPath();
      ctx.moveTo(bx, y + h);
      ctx.lineTo(bx + spikeW / 2, y);
      ctx.lineTo(bx + spikeW, y + h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = darkenColor(color, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  };

  const drawObstacle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, lightenColor(color, 0.2));
    grad.addColorStop(1, darkenColor(color, 0.2));
    ctx.fillStyle = grad;

    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    roundRect(ctx, x + 4, y + 4, w - 8, h * 0.3, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const eyeY = y + h * 0.35;
    const eyeSize = Math.min(5, w * 0.1);
    ctx.beginPath();
    ctx.arc(x + w * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawCollectible = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;

    const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.8);
    glow.addColorStop(0, hexToRgba(color, 0.4));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, lightenColor(color, 0.4));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawGoal = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    const poleX = x + w * 0.15;
    const poleW = Math.max(4, w * 0.12);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(poleX, y, poleW, h);

    const flagX = poleX + poleW;
    const flagY = y + 4;
    const flagW = w - poleW - 2;
    const flagH = Math.min(h * 0.45, 36);

    const t = performance.now() / 500;
    const wave = Math.sin(t) * 3;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY);
    ctx.quadraticCurveTo(flagX + flagW * 0.5 + wave, flagY + wave, flagX + flagW, flagY + flagH * 0.2);
    ctx.lineTo(flagX + flagW, flagY + flagH);
    ctx.quadraticCurveTo(flagX + flagW * 0.5 - wave, flagY + flagH - wave, flagX, flagY + flagH);
    ctx.closePath();
    ctx.fill();

    const starCX = flagX + flagW * 0.5;
    const starCY = flagY + flagH * 0.5;
    const starR = Math.min(flagW, flagH) * 0.25;
    ctx.fillStyle = '#ffffff';
    drawStar(ctx, starCX, starCY, starR, starR * 0.45, 5);
    ctx.fill();
  };

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number
  ) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    cam: typeof camera
  ) => {
    const sx = (player.x - cam.x) * cam.scale;
    const sy = (player.y - cam.y) * cam.scale;
    const sw = player.width * cam.scale;
    const sh = player.height * cam.scale;

    ctx.save();

    if (player.isDead) {
      ctx.globalAlpha = 0.4 + Math.sin(performance.now() / 60) * 0.2;
    }

    const bodyW = sw;
    const bodyH = sh * 0.7;

    const bodyGrad = ctx.createLinearGradient(sx, sy + sh * 0.3, sx, sy + sh);
    bodyGrad.addColorStop(0, '#3b82f6');
    bodyGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, sx, sy + sh * 0.3, bodyW, bodyH, 6);
    ctx.fill();

    const headR = sw * 0.38;
    const headCX = sx + sw / 2;
    const headCY = sy + sh * 0.22;
    const headGrad = ctx.createRadialGradient(headCX - headR * 0.3, headCY - headR * 0.3, 0, headCX, headCY, headR);
    headGrad.addColorStop(0, '#ff6b6b');
    headGrad.addColorStop(1, '#ff4444');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    const eyeY = headCY - headR * 0.1;
    const eyeOffsetX = headR * 0.35;
    const eyeR = headR * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headCX - eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(headCX + eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    const pupilOffset = player.vx > 0 ? eyeR * 0.4 : -eyeR * 0.4;
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(headCX - eyeOffsetX + pupilOffset, eyeY, eyeR * 0.55, 0, Math.PI * 2);
    ctx.arc(headCX + eyeOffsetX + pupilOffset, eyeY, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    const legY = sy + sh * 0.95;
    const legH = sh * 0.05;
    const walkCycle = (performance.now() / 80) % (Math.PI * 2);
    const legSwing = player.onGround ? Math.sin(walkCycle) * sw * 0.12 : 0;

    ctx.fillStyle = '#1e40af';
    ctx.fillRect(sx + sw * 0.15 - legSwing, legY, sw * 0.25, legH);
    ctx.fillRect(sx + sw * 0.6 + legSwing, legY, sw * 0.25, legH);

    ctx.restore();
  };

  const drawDragPreview = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {};

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'edit') return;

      const offset = getCanvasOffset(e.clientX, e.clientY);
      const world = screenToWorld(offset.x, offset.y);

      let clickedElement: LevelElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (
          world.x >= el.x &&
          world.x <= el.x + el.width &&
          world.y >= el.y &&
          world.y <= el.y + el.height
        ) {
          clickedElement = el;
          break;
        }
      }

      if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && !clickedElement && e.shiftKey)) {
        setIsPanning(true);
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          camX: camera.x,
          camY: camera.y,
        });
        return;
      }

      if (clickedElement) {
        setSelectedId(clickedElement.id);
        dragRef.current = {
          isDragging: true,
          source: 'canvas',
          elementId: clickedElement.id,
          startMouseX: e.clientX,
          startMouseY: e.clientY,
          startElementX: clickedElement.x,
          startElementY: clickedElement.y,
          offsetX: world.x - clickedElement.x,
          offsetY: world.y - clickedElement.y,
        };
      } else {
        setSelectedId(null);
        setIsPanning(true);
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          camX: camera.x,
          camY: camera.y,
        });
      }
    },
    [mode, elements, camera, getCanvasOffset, screenToWorld]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'edit') return;

      if (isPanning) {
        const dx = (e.clientX - panStart.x) / camera.scale;
        const dy = (e.clientY - panStart.y) / camera.scale;
        setCamera((c) => ({ ...c, x: panStart.camX - dx, y: panStart.camY - dy }));
        return;
      }

      if (dragRef.current.isDragging && dragRef.current.source === 'canvas' && dragRef.current.elementId) {
        const offset = getCanvasOffset(e.clientX, e.clientY);
        const world = screenToWorld(offset.x, offset.y);
        const newX = Math.round((world.x - (dragRef.current.offsetX || 0)) / 5) * 5;
        const newY = Math.round((world.y - (dragRef.current.offsetY || 0)) / 5) * 5;

        onElementsChange(
          elements.map((el) =>
            el.id === dragRef.current.elementId ? { ...el, x: newX, y: newY } : el
          )
        );
      }
    },
    [mode, isPanning, panStart, camera, elements, onElementsChange, getCanvasOffset, screenToWorld]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (dragRef.current.isDragging && dragRef.current.source === 'canvas') {
      const moved =
        dragRef.current.startMouseX !== undefined &&
        (dragRef.current.startMouseX !== 0 || dragRef.current.startMouseY !== 0);
      if (moved) {
        setHistory((h) => {
          const newPast = [...h.past];
          if (
            newPast.length === 0 ||
            JSON.stringify(newPast[newPast.length - 1]) !== JSON.stringify(elements)
          ) {
            return {
              past: newPast.length > 0 && JSON.stringify(newPast[newPast.length - 1]) === JSON.stringify(elements)
                ? newPast
                : [...newPast, elements.slice(0, -0)].length > MAX_HISTORY
                ? [...newPast.slice(1), elements]
                : [...newPast, elements],
              future: [],
            };
          }
          return h;
        });
      }
      dragRef.current = { isDragging: false, source: 'canvas' };
    }
  }, [isPanning, elements]);

  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (mode !== 'edit') return;
      e.preventDefault();

      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const offset = getCanvasOffset(e.clientX, e.clientY);
      const worldBefore = screenToWorld(offset.x, offset.y);

      setCamera((c) => {
        const newScale = Math.max(0.2, Math.min(3, c.scale * factor));
        const scaleRatio = newScale / c.scale;
        const newX = worldBefore.x - offset.x / newScale;
        const newY = worldBefore.y - offset.y / newScale;
        return { x: newX, y: newY, scale: newScale };
      });
    },
    [mode, getCanvasOffset, screenToWorld]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (mode !== 'edit') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [mode]);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      if (mode !== 'edit') return;
      e.preventDefault();

      const type = e.dataTransfer.getData('application/x-element-type') as ElementType;
      if (!type) return;

      const offset = getCanvasOffset(e.clientX, e.clientY);
      const world = screenToWorld(offset.x, offset.y);
      const size = DEFAULT_ELEMENT_SIZES[type];
      const newId = generateId();

      const newElement: LevelElement = {
        id: newId,
        type,
        x: Math.round((world.x - size.width / 2) / 5) * 5,
        y: Math.round((world.y - size.height / 2) / 5) * 5,
        width: size.width,
        height: size.height,
        color: DEFAULT_ELEMENT_COLORS[type],
      };

      addSpringAnimation(newId, newElement.y);
      pushHistory([...elements, newElement]);
      setSelectedId(newId);
    },
    [mode, elements, pushHistory, getCanvasOffset, screenToWorld, addSpringAnimation]
  );

  const handleToolboxDragStart = useCallback(
    (e: React.DragEvent, type: ElementType) => {
      if (mode !== 'edit') {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('application/x-element-type', type);
      e.dataTransfer.effectAllowed = 'copy';
      dragRef.current = { isDragging: true, source: 'toolbox', elementType: type };
    },
    [mode]
  );

  const handleToolboxDragEnd = useCallback(() => {
    dragRef.current = { isDragging: false, source: 'canvas' };
  }, []);

  const updateElement = useCallback(
    (id: string, updates: Partial<LevelElement>) => {
      const newElements = elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );
      pushHistory(newElements);
    },
    [elements, pushHistory]
  );

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const lightenColor = (hex: string, amount: number): string => {
    const c = hexToRgb(hex);
    if (!c) return hex;
    return `rgb(${Math.min(255, Math.round(c.r + (255 - c.r) * amount))}, ${Math.min(255, Math.round(c.g + (255 - c.g) * amount))}, ${Math.min(255, Math.round(c.b + (255 - c.b) * amount))})`;
  };

  const darkenColor = (hex: string, amount: number): string => {
    const c = hexToRgb(hex);
    if (!c) return hex;
    return `rgb(${Math.round(c.r * (1 - amount))}, ${Math.round(c.g * (1 - amount))}, ${Math.round(c.b * (1 - amount))})`;
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    const c = hexToRgb(hex);
    if (!c) return `rgba(255,255,255,${alpha})`;
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  if (showToolbox) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <div className="toolbox-title">🎨 工具箱</div>
        {TOOLBOX_ITEMS.map((item) => (
          <div
            key={item.type}
            className="toolbox-item"
            draggable={mode === 'edit'}
            onDragStart={(e) => handleToolboxDragStart(e, item.type)}
            onDragEnd={handleToolboxDragEnd}
            style={{ opacity: mode !== 'edit' ? 0.4 : 1, cursor: mode !== 'edit' ? 'not-allowed' : 'grab' }}
          >
            <div
              className="toolbox-icon"
              style={{
                background: hexToRgba(DEFAULT_ELEMENT_COLORS[item.type], 0.2),
                color: DEFAULT_ELEMENT_COLORS[item.type],
              }}
            >
              {item.icon}
            </div>
            <span className="toolbox-label">{item.label}</span>
          </div>
        ))}

        <div style={{ marginTop: 24, padding: '0' }}>
          <div className="toolbox-title" style={{ opacity: 0.7 }}>⌨️ 快捷键</div>
          <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.8 }}>
            <div>Ctrl+Z 撤销</div>
            <div>Ctrl+Y 重做</div>
            <div>Delete 删除</div>
            <div>滚轮 缩放画布</div>
            <div>拖拽空白处 平移</div>
          </div>
        </div>
      </div>
    );
  }

  if (showProperties) {
    return (
      <div className="properties-wrapper">
        <div className="properties-title">⚙️ 属性面板</div>

        {selectedElement ? (
          <>
            <div className="property-group">
              <div className="property-label">元件类型</div>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#0f0f1a',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: selectedElement.color,
                }}
              >
                {TOOLBOX_ITEMS.find((t) => t.type === selectedElement.type)?.label}
              </div>
            </div>

            <div className="property-group">
              <div className="property-label">坐标位置</div>
              <div className="property-row">
                <div className="property-field">
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>X</div>
                  <input
                    type="number"
                    className="property-input"
                    value={selectedElement.x}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="property-field">
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Y</div>
                  <input
                    type="number"
                    className="property-input"
                    value={selectedElement.y}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="property-group">
              <div className="property-label">尺寸大小</div>
              <div className="property-row">
                <div className="property-field">
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>宽度</div>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    step={10}
                    value={selectedElement.width}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { width: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 12, color: '#ffffff', textAlign: 'center', marginTop: 2 }}>
                    {selectedElement.width}px
                  </div>
                </div>
              </div>
              <div className="property-row">
                <div className="property-field">
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>高度</div>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    step={10}
                    value={selectedElement.height}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { height: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 12, color: '#ffffff', textAlign: 'center', marginTop: 2 }}>
                    {selectedElement.height}px
                  </div>
                </div>
              </div>
            </div>

            <div className="property-group">
              <div className="property-label">元件颜色</div>
              <div className="color-preset-grid">
                {PRESET_COLORS.map((color) => (
                  <div key={color} className="color-preset-item">
                    <button
                      className={`color-preset-btn ${selectedElement.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => updateElement(selectedElement.id, { color })}
                      title={color}
                    />
                    <span className="color-preset-label">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-properties">
            点击画布上的元件<br />查看并编辑其属性
          </div>
        )}

        <div className="difficulty-section">
          <div className="difficulty-title">📊 关卡分析</div>

          {gameStats && mode === 'play' && (
            <div className="game-stats-panel">
              <div className="stat-row">
                <span className="stat-label">当前用时</span>
                <span className="stat-value">{gameStats.time.toFixed(2)}s</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">死亡次数</span>
                <span className="stat-value">{gameStats.deaths}</span>
              </div>
            </div>
          )}

          {showCompletion ? (
            <DifficultyChart
              elements={elements}
              jumpRecord={completionJumpRecord}
              width={260}
              height={200}
            />
          ) : (
            <DifficultyChart elements={elements} jumpRecord={[]} width={260} height={200} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="editor-canvas-wrapper"
      style={{ cursor: isPanning ? 'grabbing' : mode === 'edit' ? 'default' : 'auto' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isPanning ? 'grabbing' : mode === 'edit' ? 'default' : 'auto',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleCanvasWheel}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      />

      {mode === 'play' && (
        <div className="hud-overlay">
          {gameStats && !showCompletion && (
            <div className="hud-stats">
              <span>⏱️ {gameStats.time.toFixed(2)}s</span>
              <span>💀 {gameStats.deaths}</span>
              <span>💎 {gameStats.jumps.reduce((a, b) => a + b, 0)}次跳跃</span>
            </div>
          )}

          {!showCompletion && (
            <div className="game-hint">空格键跳跃 · 角色自动向右前进</div>
          )}

          {showCompletion && (
            <div className="completion-modal">
              <div className="completion-title">🎉 通关成功！</div>
              <div className="completion-stats">
                <div className="stat-row" style={{ justifyContent: 'center', gap: 16, fontSize: 15 }}>
                  <span>⏱️ 用时</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>
                    {playStatsRef.current?.time.toFixed(2)}s
                  </span>
                </div>
                <div className="stat-row" style={{ justifyContent: 'center', gap: 16, fontSize: 15 }}>
                  <span>💀 死亡</span>
                  <span style={{ color: '#ff4444', fontWeight: 700 }}>
                    {playStatsRef.current?.deaths} 次
                  </span>
                </div>
                <div className="stat-row" style={{ justifyContent: 'center', gap: 16, fontSize: 15 }}>
                  <span>🦘 跳跃</span>
                  <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                    {playStatsRef.current?.jumps.reduce((a, b) => a + b, 0)} 次
                  </span>
                </div>
              </div>
              <button
                className="completion-btn"
                onClick={() => {
                  setShowCompletion(false);
                  playerControllerRef.current?.start(
                    (player, cam, stats) => {
                      playerRenderRef.current = { player, camera: cam };
                      setGameStats({ ...stats, jumps: [...stats.jumps] });
                    },
                    (stats) => {
                      setCompletionJumpRecord([...stats.jumps]);
                      setShowCompletion(true);
                    }
                  );
                }}
              >
                再玩一次
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <div className="hud-overlay">
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={() =>
                setCamera((c) => {
                  const newScale = Math.min(3, c.scale * 1.25);
                  return { ...c, scale: newScale };
                })
              }
              title="放大"
            >
              +
            </button>
            <button
              className="zoom-btn"
              onClick={() =>
                setCamera((c) => {
                  const newScale = Math.max(0.2, c.scale / 1.25);
                  return { ...c, scale: newScale };
                })
              }
              title="缩小"
            >
              −
            </button>
            <button
              className="zoom-btn"
              onClick={() => setCamera({ x: 0, y: 0, scale: 1 })}
              title="重置视图"
              style={{ fontSize: 14 }}
            >
              ⌂
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default LevelEditor;
