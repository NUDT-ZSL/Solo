import { useEffect, useRef, useCallback } from 'react';
import {
  AnimationState,
  CollectBeam,
  HEX_SIZE,
  HexCoord,
  MazeData,
  PlayerState,
  Ripple,
  SEAL_COLORS,
  SealColor,
} from './types';
import {
  drawHexPath,
  getHexCorner,
  hexEquals,
  hexKey,
  hexNeighbor,
  hexToPixel,
  pixelToHex,
  rotateHexCoordBy60,
} from './utils/hexMath';
import { canMoveBetween, getCellByCoord } from './mazeGenerator';

interface GameBoardProps {
  maze: MazeData;
  player: PlayerState;
  animation: AnimationState;
  onMoveRequest: (target: HexCoord) => void;
  allSealsCollected: boolean;
}

const CANVAS_LOGICAL_SIZE = 600;
const MOVE_DURATION = 300;
const ROTATION_STEP_RAD = (Math.PI / 180) * 60;
const BEAM_DURATION = 600;
const BEAM_TRAVEL = 20;

interface LocalAnimState {
  lastTime: number;
  moveTime: number;
  moveFrom: HexCoord;
  moveTo: HexCoord;
  isMoving: boolean;
  extraRotationAngle: number;
}

let beamIdCounter = 1;
let rippleIdCounter = 1;

export default function GameBoard({
  maze,
  player,
  animation,
  onMoveRequest,
  allSealsCollected,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<LocalAnimState>({
    lastTime: 0,
    moveTime: 0,
    moveFrom: player.coord,
    moveTo: player.coord,
    isMoving: false,
    extraRotationAngle: 0,
  });
  const pendingMoveRef = useRef<HexCoord | null>(null);
  const rotationAnimRef = useRef({
    active: false,
    startTime: 0,
    startAngle: 0,
    targetDelta: 0,
  });
  const animationRef = useRef(animation);
  animationRef.current = animation;
  const playerRef = useRef(player);
  playerRef.current = player;
  const mazeRef = useRef(maze);
  mazeRef.current = maze;

  const getOffset = useCallback(() => CANVAS_LOGICAL_SIZE / 2, []);

  useEffect(() => {
    const newFrom = animRef.current.moveTo;
    if (!hexEquals(newFrom, player.coord)) {
      animRef.current.moveFrom = newFrom;
      animRef.current.moveTo = player.coord;
      animRef.current.moveTime = 0;
      animRef.current.isMoving = true;
    }
  }, [player.coord]);

  useEffect(() => {
    if (
      animation.rotating &&
      !rotationAnimRef.current.active
    ) {
      rotationAnimRef.current = {
        active: true,
        startTime: performance.now(),
        startAngle: animRef.current.extraRotationAngle,
        targetDelta: animation.rotationTargetAngle - animation.rotationStartAngle,
      };
    }
  }, [animation.rotating, animation.rotationStartAngle, animation.rotationTargetAngle]);

  const addBeams = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const beam: CollectBeam = {
        id: beamIdCounter++,
        x,
        y,
        angle,
        color,
        alpha: 1,
        life: 0,
        maxLife: BEAM_DURATION,
      };
      animationRef.current.beams.push(beam);
    }
  }, []);

  useEffect(() => {
    (window as unknown as { __addBeams?: (x: number, y: number, c: string) => void }).__addBeams = addBeams;
    return () => {
      delete (window as unknown as { __addBeams?: (x: number, y: number, c: string) => void }).__addBeams;
    };
  }, [addBeams]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let running = true;

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }

    function lerp(a: number, b: number, t: number): number {
      return a + (b - a) * t;
    }

    function render(now: number) {
      if (!running) return;
      const last = animRef.current.lastTime || now;
      const dt = Math.min(64, now - last);
      animRef.current.lastTime = now;

      if (animRef.current.isMoving) {
        animRef.current.moveTime += dt;
        if (animRef.current.moveTime >= MOVE_DURATION) {
          animRef.current.moveTime = MOVE_DURATION;
          animRef.current.isMoving = false;
          if (pendingMoveRef.current) {
            const next = pendingMoveRef.current;
            pendingMoveRef.current = null;
            onMoveRequest(next);
          }
        }
      }

      if (rotationAnimRef.current.active) {
        const ra = rotationAnimRef.current;
        const t = Math.min(1, (now - ra.startTime) / 1000);
        const eased = easeOutCubic(t);
        animRef.current.extraRotationAngle = ra.startAngle + ra.targetDelta * eased;
        if (t >= 1) {
          rotationAnimRef.current.active = false;
        }
      }

      const anim = animationRef.current;
      const beams = anim.beams;
      for (let i = beams.length - 1; i >= 0; i--) {
        beams[i].life += dt;
        beams[i].alpha = Math.max(0, 1 - beams[i].life / beams[i].maxLife);
        if (beams[i].life >= beams[i].maxLife) beams.splice(i, 1);
      }
      const ripples = anim.ripples;
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].life += dt;
        const t = ripples[i].life / ripples[i].maxLife;
        ripples[i].radius = t * 400;
        ripples[i].alpha = Math.max(0, 1 - t) * 0.7;
        if (ripples[i].life >= ripples[i].maxLife) ripples.splice(i, 1);
      }
      anim.exitFlashPhase = (anim.exitFlashPhase + dt / 500) % 2;
      if (anim.sealFlash) {
        anim.sealFlash = false;
      }
      if (anim.winFade < 1 && anim.winRipplesTriggered) {
        anim.winFade = Math.min(1, anim.winFade + dt / 2000);
      }

      draw(ctx, now, dt);
      rafId = requestAnimationFrame(render);
    }

    function drawBackground(ctx: CanvasRenderingContext2D) {
      const size = CANVAS_LOGICAL_SIZE;
      const grad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size / 1.2);
      grad.addColorStop(0, '#0a0a2e');
      grad.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }

    function getPlayerPixelPos(): { x: number; y: number } {
      const animState = animRef.current;
      let t = 0;
      if (animState.isMoving) {
        t = Math.min(1, animState.moveTime / MOVE_DURATION);
      } else {
        t = hexEquals(playerRef.current.coord, animState.moveTo) ? 1 : 0;
      }
      const from = hexToPixel(animState.moveFrom);
      const to = hexToPixel(animState.moveTo);
      return {
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t),
      };
    }

    function draw(ctx: CanvasRenderingContext2D, _now: number, _dt: number) {
      drawBackground(ctx);
      const offset = getOffset();
      const rotAngle = animRef.current.extraRotationAngle;
      const anim = animationRef.current;
      const maze = mazeRef.current;

      const inRotateTransition = rotationAnimRef.current.active;

      ctx.save();
      ctx.translate(offset, offset);
      ctx.rotate(rotAngle);
      ctx.translate(-offset, -offset);

      const wallColor = inRotateTransition ? 'rgba(255, 221, 68, 0.5)' : 'rgba(32, 255, 255, 0.2)';

      for (const cell of maze.cells) {
        const { x, y } = hexToPixel(cell.coord);
        const cx = x + offset;
        const cy = y + offset;

        if (cell.activated && cell.activatedColor) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = cell.activatedColor;
          drawHexPath(ctx, cx, cy, HEX_SIZE - 2);
          ctx.fill();
          ctx.restore();
        }

        if (allSealsCollected && maze.exitCoord && hexEquals(cell.coord, maze.exitCoord)) {
          ctx.save();
          const flashAlpha = 0.5 + 0.5 * Math.sin(anim.exitFlashPhase * Math.PI);
          ctx.globalAlpha = 0.3 + 0.3 * flashAlpha;
          ctx.fillStyle = '#ffdd44';
          drawHexPath(ctx, cx, cy, HEX_SIZE - 2);
          ctx.fill();
          ctx.strokeStyle = '#ffdd44';
          ctx.lineWidth = 3 + flashAlpha * 3;
          ctx.shadowColor = '#ffdd44';
          ctx.shadowBlur = 20 * flashAlpha;
          drawHexPath(ctx, cx, cy, HEX_SIZE - 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.strokeStyle = wallColor;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        for (let dir = 0; dir < 6; dir++) {
          if (!cell.walls[dir]) continue;
          const a = getHexCorner({ x: cx, y: cy }, dir);
          const b = getHexCorner({ x: cx, y: cy }, (dir + 1) % 6);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const seal of maze.seals) {
        if (seal.collected) continue;
        const { x, y } = hexToPixel(seal.coord);
        const cx = x + offset;
        const cy = y + offset;

        let scale = 1;
        let glowAlpha = 0.5;
        if (anim.sealFlash) {
          scale = 1.3;
          glowAlpha = 0.9;
        }
        const pulse = 1 + 0.15 * Math.sin((_now / 400) + seal.coord.q);

        ctx.save();
        const glowR = 22 * scale * pulse;
        const rgrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
        rgrad.addColorStop(0, hexToRgba(seal.color, glowAlpha * 0.9));
        rgrad.addColorStop(1, hexToRgba(seal.color, 0));
        ctx.fillStyle = rgrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = seal.color;
        ctx.shadowColor = seal.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 * scale * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const beam of anim.beams) {
        const t = beam.life / beam.maxLife;
        const dist = BEAM_TRAVEL * t;
        const bx = beam.x + Math.cos(beam.angle) * dist;
        const by = beam.y + Math.sin(beam.angle) * dist;
        const len = 14 * (1 - t) + 6;
        const tipX = bx + Math.cos(beam.angle) * len;
        const tipY = by + Math.sin(beam.angle) * len;
        ctx.save();
        ctx.globalAlpha = beam.alpha;
        ctx.strokeStyle = beam.color;
        ctx.shadowColor = beam.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();
      }

      const pp = getPlayerPixelPos();
      const px = pp.x + offset;
      const py = pp.y + offset;

      for (const ripple of anim.ripples) {
        ctx.save();
        ctx.globalAlpha = ripple.alpha;
        ctx.strokeStyle = ripple.color;
        ctx.shadowColor = ripple.color;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ripple.x + offset, ripple.y + offset, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      const outerR = 16;
      const glowGrad = ctx.createRadialGradient(px, py, 1, px, py, outerR);
      glowGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
      glowGrad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(px, py, outerR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      if (anim.winFade > 0) {
        ctx.save();
        ctx.globalAlpha = anim.winFade;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_LOGICAL_SIZE, CANVAS_LOGICAL_SIZE);
        ctx.restore();
      }
    }

    rafId = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [getOffset, onMoveRequest, allSealsCollected]);

  useEffect(() => {
    (window as unknown as { __triggerWinRipples?: () => void }).__triggerWinRipples = () => {
      const anim = animationRef.current;
      if (anim.winRipplesTriggered) return;
      anim.winRipplesTriggered = true;
      const offset = getOffset();
      const colors: SealColor[] = [...SEAL_COLORS];
      for (let i = 0; i < 12; i++) {
        const r: Ripple = {
          id: rippleIdCounter++,
          x: 0,
          y: 0,
          radius: 0,
          color: colors[i % colors.length],
          alpha: 0.8,
          life: -i * 150,
          maxLife: 2000,
        };
        anim.ripples.push(r);
      }
      void offset;
    };
  }, [getOffset]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (playerRef.current.moveProgress < 1 && animRef.current.isMoving) return;
      const key = e.key.toLowerCase();
      let dir: number | null = null;
      switch (key) {
        case 'd':
          dir = 0;
          break;
        case 'e':
          dir = 1;
          break;
        case 'w':
          dir = 2;
          break;
        case 'a':
          dir = 3;
          break;
        case 'z':
          dir = 4;
          break;
        case 's':
          dir = 5;
          break;
      }
      if (dir === null) return;
      const rotSteps = Math.round(animRef.current.extraRotationAngle / ROTATION_STEP_RAD);
      const correctedDir = ((dir - rotSteps) % 6 + 6) % 6;
      const currentCoord = playerRef.current.coord;
      const target = rotateHexCoordBy60(
        hexNeighbor({ q: 0, r: 0 }, correctedDir),
        rotSteps
      );
      const actualTarget: HexCoord = {
        q: currentCoord.q + target.q,
        r: currentCoord.r + target.r,
      };
      if (canMoveBetween(mazeRef.current, currentCoord, actualTarget)) {
        if (animRef.current.isMoving) {
          pendingMoveRef.current = actualTarget;
        } else {
          onMoveRequest(actualTarget);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onMoveRequest]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = CANVAS_LOGICAL_SIZE / rect.width;
      const mx = (e.clientX - rect.left) * scale;
      const my = (e.clientY - rect.top) * scale;
      const offset = getOffset();

      const cos = Math.cos(-animRef.current.extraRotationAngle);
      const sin = Math.sin(-animRef.current.extraRotationAngle);
      const cx = mx - offset;
      const cy = my - offset;
      const rx = cx * cos - cy * sin + offset;
      const ry = cx * sin + cy * cos + offset;

      const worldX = rx - offset;
      const worldY = ry - offset;
      const clickedHex = pixelToHex(worldX, worldY);
      const cell = getCellByCoord(mazeRef.current, clickedHex);
      if (!cell) return;

      const current = playerRef.current.coord;
      if (hexEquals(current, clickedHex)) return;
      if (!canMoveBetween(mazeRef.current, current, clickedHex)) return;

      if (animRef.current.isMoving) {
        pendingMoveRef.current = clickedHex;
      } else {
        onMoveRequest(clickedHex);
      }
    },
    [onMoveRequest, getOffset]
  );

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const cssSize = Math.min(container.clientWidth, container.clientHeight, 600);
      canvas.style.width = cssSize + 'px';
      canvas.style.height = cssSize + 'px';
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(CANVAS_LOGICAL_SIZE * dpr);
      canvas.height = Math.floor(CANVAS_LOGICAL_SIZE * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div ref={containerRef} className="maze-canvas-container">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          display: 'block',
          cursor: 'pointer',
          imageRendering: 'auto',
          borderRadius: '16px',
          boxShadow: '0 0 60px rgba(80, 40, 200, 0.35), 0 0 120px rgba(20,20,80,0.3)',
        }}
      />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function spawnCollectBeamsWorld(worldX: number, worldY: number, color: string) {
  const fn = (window as unknown as { __addBeams?: (x: number, y: number, c: string) => void }).__addBeams;
  if (fn) fn(worldX, worldY, color);
}

export function triggerWinRipples() {
  const fn = (window as unknown as { __triggerWinRipples?: () => void }).__triggerWinRipples;
  if (fn) fn();
}

export { hexKey as unusedHexKey };
