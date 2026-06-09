import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  PuzzlePiece,
  Particle,
  buildPath,
  createMatchParticles,
  createFireworkParticles,
  createSparkParticles,
  rgbStringToRgb
} from '../utils/puzzleGen';

interface PuzzleCanvasProps {
  image: HTMLImageElement | null;
  pieces: PuzzlePiece[];
  onPiecesChange: (pieces: PuzzlePiece[]) => void;
  onProgressChange: (progress: number) => void;
  onComplete: () => void;
  puzzleArea: { x: number; y: number; w: number; h: number };
  canvasSize: { w: number; h: number };
  isComplete: boolean;
}

const SNAP_DISTANCE = 30;
const SNAP_DURATION = 200;
const MAX_PARTICLES = 200;

const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  image,
  pieces,
  onPiecesChange,
  onProgressChange,
  onComplete,
  puzzleArea,
  canvasSize,
  isComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const draggingRef = useRef<{
    pieceId: number | null;
    offsetX: number;
    offsetY: number;
  }>({ pieceId: null, offsetX: 0, offsetY: 0 });
  const piecesRef = useRef<PuzzlePiece[]>(pieces);
  const ringRef = useRef<{
    active: boolean;
    startTime: number;
    x: number;
    y: number;
  }>({ active: false, startTime: 0, x: 0, y: 0 });
  const completedRef = useRef(false);
  const lastTimeRef = useRef<number>(performance.now());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    completedRef.current = isComplete;
  }, [isComplete]);

  const clampParticles = useCallback(() => {
    if (particlesRef.current.length > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    }
  }, []);

  const updateParticles = useCallback((deltaTime: number) => {
    const newParticles: Particle[] = [];

    for (const p of particlesRef.current) {
      p.life -= deltaTime;
      if (p.life <= 0) continue;

      if (p.type === 'firework') {
        p.vy += (p.gravity || 0.15);
        p.x += p.vx;
        p.y += p.vy;

        if (p.explodeTime !== undefined) {
          p.explodeTime -= deltaTime;
          if (p.explodeTime <= 0) {
            const sparks = createSparkParticles(p.x, p.y, p.color);
            newParticles.push(...sparks);
            continue;
          }
        }
      } else if (p.type === 'match') {
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
      } else if (p.type === 'spark') {
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
      }

      newParticles.push(p);
    }

    particlesRef.current = newParticles;
    clampParticles();
  }, [clampParticles]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const p of particlesRef.current) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const rgb = rgbStringToRgb(p.color);

      if (p.type === 'spark') {
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
        gradient.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = p.radius * 0.5;
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + p.life * 5;
          const len = p.radius * 4 * alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }, []);

  const drawRing = useCallback((ctx: CanvasRenderingContext2D, currentTime: number) => {
    if (!ringRef.current.active) return;

    const elapsed = (currentTime - ringRef.current.startTime) / 1000;
    const duration = 1.5;

    if (elapsed >= duration) {
      ringRef.current.active = false;
      return;
    }

    const t = elapsed / duration;
    const radius = 0 + t * 200;
    const alpha = 0.9 * (1 - t);
    const lineWidth = 15 * (1 - t * 0.5);

    const gradient = ctx.createRadialGradient(
      ringRef.current.x, ringRef.current.y, radius * 0.5,
      ringRef.current.x, ringRef.current.y, radius
    );

    const colors = [
      `rgba(255, 107, 107, ${alpha})`,
      `rgba(255, 217, 61, ${alpha})`,
      `rgba(72, 219, 251, ${alpha})`,
      `rgba(95, 39, 205, ${alpha})`,
      `rgba(255, 107, 157, ${alpha * 0.8})`
    ];

    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(i / (colors.length - 1), colors[i]);
    }

    ctx.save();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(ringRef.current.x, ringRef.current.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const innerGradient = ctx.createRadialGradient(
      ringRef.current.x, ringRef.current.y, 0,
      ringRef.current.x, ringRef.current.y, radius * 0.8
    );
    innerGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.15})`);
    innerGradient.addColorStop(0.5, `rgba(255, 217, 61, ${alpha * 0.08})`);
    innerGradient.addColorStop(1, `rgba(72, 219, 251, 0)`);

    ctx.save();
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(ringRef.current.x, ringRef.current.y, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  const drawPiece = useCallback((
    ctx: CanvasRenderingContext2D,
    piece: PuzzlePiece,
    isDragging: boolean
  ) => {
    if (!image) return;

    const centerX = piece.currentX + piece.pieceWidth / 2;
    const centerY = piece.currentY + piece.pieceHeight / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(piece.rotation);
    ctx.translate(-piece.pieceWidth / 2, -piece.pieceHeight / 2);

    if (!piece.isPlaced && !isDragging) {
      ctx.save();
      buildPath(ctx, piece.shapePath);
      ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    if (piece.glowIntensity > 0) {
      ctx.save();
      buildPath(ctx, piece.shapePath);
      ctx.shadowColor = `rgba(255, 255, 255, ${piece.glowIntensity})`;
      ctx.shadowBlur = 30 * piece.glowIntensity;
      ctx.strokeStyle = `rgba(255, 255, 255, ${piece.glowIntensity * 0.8})`;
      ctx.lineWidth = 3 + piece.glowIntensity * 4;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    buildPath(ctx, piece.shapePath);
    ctx.clip();

    const scaleX = piece.pieceWidth / (image.width / 3);
    const scaleY = piece.pieceHeight / (image.height / 3);
    const drawSourceX = piece.sourceX;
    const drawSourceY = piece.sourceY;
    const drawSourceW = image.width / 3;
    const drawSourceH = image.height / 3;

    const expand = 4;
    ctx.drawImage(
      image,
      Math.max(0, drawSourceX - expand),
      Math.max(0, drawSourceY - expand),
      Math.min(image.width - drawSourceX + expand, drawSourceW + expand * 2),
      Math.min(image.height - drawSourceY + expand, drawSourceH + expand * 2),
      -expand * scaleX,
      -expand * scaleY,
      (drawSourceW + expand * 2) * scaleX,
      (drawSourceH + expand * 2) * scaleY
    );

    ctx.restore();

    if (piece.isPlaced) {
      ctx.save();
      buildPath(ctx, piece.shapePath);
      ctx.globalAlpha = piece.snapProgress;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * piece.snapProgress})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [image]);

  const drawPuzzleArea = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();

    const borderGradient = ctx.createLinearGradient(
      puzzleArea.x, puzzleArea.y,
      puzzleArea.x + puzzleArea.w, puzzleArea.y + puzzleArea.h
    );
    borderGradient.addColorStop(0, 'rgba(72, 219, 251, 0.3)');
    borderGradient.addColorStop(0.5, 'rgba(159, 122, 234, 0.3)');
    borderGradient.addColorStop(1, 'rgba(255, 107, 107, 0.3)');

    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(puzzleArea.x, puzzleArea.y, puzzleArea.w, puzzleArea.h);
    ctx.setLineDash([]);

    if (!completedRef.current) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(puzzleArea.x, puzzleArea.y, puzzleArea.w, puzzleArea.h);
    }

    if (!completedRef.current) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;

      for (let i = 1; i < 3; i++) {
        const x = puzzleArea.x + (puzzleArea.w / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, puzzleArea.y);
        ctx.lineTo(x, puzzleArea.y + puzzleArea.h);
        ctx.stroke();
      }

      for (let i = 1; i < 3; i++) {
        const y = puzzleArea.y + (puzzleArea.h / 3) * i;
        ctx.beginPath();
        ctx.moveTo(puzzleArea.x, y);
        ctx.lineTo(puzzleArea.x + puzzleArea.w, y);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }, [puzzleArea]);

  const render = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = currentTime;

    updateParticles(deltaTime);

    const allPieces = piecesRef.current;

    for (const piece of allPieces) {
      if (piece.snapProgress < 1 && piece.isPlaced) {
        piece.snapProgress = Math.min(1, piece.snapProgress + deltaTime * (1000 / SNAP_DURATION));
      }
      if (piece.glowIntensity > 0) {
        piece.glowIntensity = Math.max(0, piece.glowIntensity - deltaTime * 3);
      }
    }

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % canvasSize.w;
      const y = (i * 97.3) % canvasSize.h;
      const r = 1 + Math.sin(currentTime / 2000 + i) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPuzzleArea(ctx);

    const unplacedSorted = [...allPieces]
      .filter(p => !p.isPlaced)
      .sort((a, b) => {
        const aDragging = draggingRef.current.pieceId === a.id ? 1 : 0;
        const bDragging = draggingRef.current.pieceId === b.id ? 1 : 0;
        return aDragging - bDragging;
      });

    for (const piece of allPieces) {
      if (piece.isPlaced) {
        drawPiece(ctx, piece, false);
      }
    }

    for (const piece of unplacedSorted) {
      const isDragging = draggingRef.current.pieceId === piece.id;
      drawPiece(ctx, piece, isDragging);
    }

    drawParticles(ctx);
    drawRing(ctx, currentTime);

    animationRef.current = requestAnimationFrame(render);
  }, [canvasSize, drawPuzzleArea, drawPiece, drawParticles, drawRing, updateParticles]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const checkPieceAtPoint = useCallback((x: number, y: number): PuzzlePiece | null => {
    const allPieces = piecesRef.current;

    for (let i = allPieces.length - 1; i >= 0; i--) {
      const piece = allPieces[i];
      if (piece.isPlaced) continue;

      const localX = x - piece.currentX;
      const localY = y - piece.currentY;

      const cos = Math.cos(-piece.rotation);
      const sin = Math.sin(-piece.rotation);
      const cx = piece.pieceWidth / 2;
      const cy = piece.pieceHeight / 2;
      const rotatedX = cos * (localX - cx) - sin * (localY - cy) + cx;
      const rotatedY = sin * (localX - cx) + cos * (localY - cy) + cy;

      if (rotatedX >= -20 && rotatedX <= piece.pieceWidth + 20 &&
          rotatedY >= -20 && rotatedY <= piece.pieceHeight + 20) {
        return piece;
      }
    }

    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || completedRef.current) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const piece = checkPieceAtPoint(x, y);

    if (piece) {
      draggingRef.current = {
        pieceId: piece.id,
        offsetX: x - piece.currentX,
        offsetY: y - piece.currentY
      };

      const allPieces = [...piecesRef.current];
      const idx = allPieces.findIndex(p => p.id === piece.id);
      if (idx > -1) {
        const [moved] = allPieces.splice(idx, 1);
        allPieces.push(moved);
        piecesRef.current = allPieces;
        onPiecesChange(allPieces);
        forceUpdate({});
      }
    }
  }, [image, getCanvasCoords, checkPieceAtPoint, onPiecesChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingRef.current.pieceId === null) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pieceId = draggingRef.current.pieceId;

    const allPieces = piecesRef.current.map(piece => {
      if (piece.id === pieceId) {
        return {
          ...piece,
          currentX: Math.max(0, Math.min(canvasSize.w - piece.pieceWidth, x - draggingRef.current.offsetX)),
          currentY: Math.max(0, Math.min(canvasSize.h - piece.pieceHeight, y - draggingRef.current.offsetY))
        };
      }
      return piece;
    });

    piecesRef.current = allPieces;
    onPiecesChange(allPieces);
  }, [getCanvasCoords, canvasSize, onPiecesChange]);

  const handleMouseUp = useCallback(() => {
    if (draggingRef.current.pieceId === null) return;

    const pieceId = draggingRef.current.pieceId;
    draggingRef.current = { pieceId: null, offsetX: 0, offsetY: 0 };

    const allPieces = [...piecesRef.current];
    const pieceIdx = allPieces.findIndex(p => p.id === pieceId);

    if (pieceIdx === -1) return;

    const piece = allPieces[pieceIdx];
    const centerX = piece.currentX + piece.pieceWidth / 2;
    const centerY = piece.currentY + piece.pieceHeight / 2;
    const correctCenterX = piece.correctX + piece.pieceWidth / 2;
    const correctCenterY = piece.correctY + piece.pieceHeight / 2;

    const distance = Math.hypot(centerX - correctCenterX, centerY - correctCenterY);

    if (distance < SNAP_DISTANCE) {
      allPieces[pieceIdx] = {
        ...piece,
        currentX: piece.correctX,
        currentY: piece.correctY,
        rotation: 0,
        isPlaced: true,
        snapProgress: 0,
        glowIntensity: 1
      };

      const matchParticles = createMatchParticles(
        correctCenterX,
        correctCenterY,
        piece.avgColor
      );
      particlesRef.current.push(...matchParticles);
      clampParticles();

      piecesRef.current = allPieces;
      onPiecesChange(allPieces);

      const placedCount = allPieces.filter(p => p.isPlaced).length;
      const progress = (placedCount / allPieces.length) * 100;
      onProgressChange(progress);

      if (placedCount === allPieces.length) {
        const centerXFinal = puzzleArea.x + puzzleArea.w / 2;
        const centerYFinal = puzzleArea.y + puzzleArea.h / 2;

        ringRef.current = {
          active: true,
          startTime: performance.now(),
          x: centerXFinal,
          y: centerYFinal
        };

        setTimeout(() => {
          const fireworkParticles = createFireworkParticles(
            centerXFinal,
            centerYFinal,
            200
          );
          particlesRef.current.push(...fireworkParticles);
          clampParticles();
        }, 500);

        onComplete();
      }
    } else {
      onPiecesChange(allPieces);
    }
  }, [onPiecesChange, onProgressChange, onComplete, puzzleArea, clampParticles]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!image || completedRef.current || e.touches.length === 0) return;

    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    const piece = checkPieceAtPoint(x, y);

    if (piece) {
      draggingRef.current = {
        pieceId: piece.id,
        offsetX: x - piece.currentX,
        offsetY: y - piece.currentY
      };

      const allPieces = [...piecesRef.current];
      const idx = allPieces.findIndex(p => p.id === piece.id);
      if (idx > -1) {
        const [moved] = allPieces.splice(idx, 1);
        allPieces.push(moved);
        piecesRef.current = allPieces;
        onPiecesChange(allPieces);
      }
    }
  }, [image, getCanvasCoords, checkPieceAtPoint, onPiecesChange]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (draggingRef.current.pieceId === null || e.touches.length === 0) return;

    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    const pieceId = draggingRef.current.pieceId;

    const allPieces = piecesRef.current.map(piece => {
      if (piece.id === pieceId) {
        return {
          ...piece,
          currentX: Math.max(0, Math.min(canvasSize.w - piece.pieceWidth, x - draggingRef.current.offsetX)),
          currentY: Math.max(0, Math.min(canvasSize.h - piece.pieceHeight, y - draggingRef.current.offsetY))
        };
      }
      return piece;
    });

    piecesRef.current = allPieces;
    onPiecesChange(allPieces);
  }, [getCanvasCoords, canvasSize, onPiecesChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: draggingRef.current.pieceId !== null ? 'grabbing' : (image ? 'grab' : 'default'),
        borderRadius: '12px',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default PuzzleCanvas;
