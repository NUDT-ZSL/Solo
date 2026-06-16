import React, { useEffect, useRef, useCallback } from 'react';
import type { PetState, AnimationType } from './GameEngine';
import {
  PALETTE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PET_SIZE,
  PET_SCALE,
  ANIMATION_CONFIG,
} from './GameEngine';

const P = {
  T: null,
  0: PALETTE.darkBrown,
  1: PALETTE.yellow,
  2: PALETTE.green,
  3: PALETTE.red,
  4: PALETTE.white,
  5: PALETTE.black,
  6: PALETTE.lightYellow,
  7: PALETTE.darkGreen,
};

type PixelColor = keyof typeof P;

const spriteIdleFrame0: PixelColor[][] = [
  ['T','T','T','T','0','0','0','0','0','0','T','T','T','T','T','T'],
  ['T','T','T','0','1','1','1','1','1','1','0','T','T','T','T','T'],
  ['T','T','0','1','1','6','1','1','6','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','6','1','1','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','1','1','1','1','1','1','1','0','T','T','T'],
  ['0','1','1','1','1','5','1','1','5','1','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','4','4','1','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['0','1','1','6','6','6','6','6','6','6','6','1','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteIdleFrame1: PixelColor[][] = [
  ['T','T','T','T','0','0','0','0','0','0','T','T','T','T','T','T'],
  ['T','T','T','0','1','1','1','1','1','1','0','T','T','T','T','T'],
  ['T','T','0','1','1','6','1','1','6','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','6','1','1','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','1','1','1','1','1','1','1','0','T','T','T'],
  ['0','1','1','1','1','5','5','5','5','1','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['0','1','1','6','6','6','6','6','6','6','6','1','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteWalkFrame0: PixelColor[][] = [
  ['T','T','T','0','0','0','0','0','0','0','0','T','T','T','T','T'],
  ['T','T','0','1','1','1','1','1','1','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','1','1','1','1','6','1','1','0','T','T','T'],
  ['0','1','1','6','6','1','1','1','6','6','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','1','1','5','1','1','1','1','5','1','1','1','0','T','T'],
  ['0','1','1','1','1','4','4','4','4','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['T','T','0','2','T','2','T','T','2','T','2','0','T','T','T','T'],
  ['T','0','2','T','T','2','T','T','2','T','T','2','0','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteWalkFrame1: PixelColor[][] = [
  ['T','T','T','0','0','0','0','0','0','0','0','T','T','T','T','T'],
  ['T','T','0','1','1','1','1','1','1','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','1','1','1','1','6','1','1','0','T','T','T'],
  ['0','1','1','6','6','1','1','1','6','6','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','1','1','5','1','1','1','1','5','1','1','1','0','T','T'],
  ['0','1','1','1','1','4','4','4','4','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','0','0','0','2','2','2','2','0','0','0','T','T','T','T'],
  ['T','T','0','2','T','2','T','T','2','T','2','0','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','0','2','T','T','2','T','T','2','T','T','2','0','T','T','T'],
];

const spriteWalkFrame2: PixelColor[][] = [
  ['T','T','T','0','0','0','0','0','0','0','0','T','T','T','T','T'],
  ['T','T','0','1','1','1','1','1','1','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','1','1','1','1','6','1','1','0','T','T','T'],
  ['0','1','1','6','6','1','1','1','6','6','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','1','1','5','1','1','1','1','5','1','1','1','0','T','T'],
  ['0','1','1','1','1','4','4','4','4','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['0','2','T','T','0','2','T','T','2','0','T','T','2','0','T','T'],
  ['T','0','2','T','T','2','T','T','2','T','T','2','0','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteWalkFrame3: PixelColor[][] = [
  ['T','T','T','0','0','0','0','0','0','0','0','T','T','T','T','T'],
  ['T','T','0','1','1','1','1','1','1','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','1','1','1','1','6','1','1','0','T','T','T'],
  ['0','1','1','6','6','1','1','1','6','6','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','1','1','5','1','1','1','1','5','1','1','1','0','T','T'],
  ['0','1','1','1','1','4','4','4','4','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['0','0','T','T','2','2','2','2','2','2','T','T','0','0','T','T'],
  ['T','0','2','T','2','T','T','T','T','2','T','2','0','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['0','2','T','T','T','2','T','T','2','T','T','T','T','2','0','T'],
];

const spriteEatFrame0: PixelColor[][] = [
  ['T','T','T','T','0','0','0','0','0','0','T','T','T','T','T','T'],
  ['T','T','T','0','1','1','1','1','1','1','0','T','T','T','T','T'],
  ['T','T','0','1','1','6','1','1','6','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','6','1','1','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','1','1','1','1','1','1','1','0','T','T','T'],
  ['0','1','1','1','1','5','1','1','5','1','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','3','3','1','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','3','3','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['0','1','1','6','6','6','6','6','6','6','6','1','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteEatFrame1: PixelColor[][] = [
  ['T','T','T','T','0','0','0','0','0','0','T','T','T','T','T','T'],
  ['T','T','T','0','1','1','1','1','1','1','0','T','T','T','T','T'],
  ['T','T','0','1','1','6','1','1','6','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','6','1','1','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','1','1','1','1','1','1','1','0','T','T','T'],
  ['0','1','1','1','1','5','5','5','5','1','1','1','1','0','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','3','3','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','3','3','1','1','6','6','1','0','T','T'],
  ['0','1','1','6','6','6','6','6','6','6','6','1','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteSleepFrame0: PixelColor[][] = [
  ['T','T','T','T','0','0','0','0','0','0','T','T','T','T','T','T'],
  ['T','T','T','0','1','1','1','1','1','1','0','T','T','T','T','T'],
  ['T','T','0','1','1','6','1','1','6','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','6','1','1','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','1','1','1','1','1','1','1','0','T','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','1','1','1','4','4','4','4','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['0','1','1','6','6','6','6','6','6','6','6','1','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','T','0','0','2','2','2','2','0','0','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const spriteSleepFrame1: PixelColor[][] = [
  ['T','T','T','T','0','0','0','0','0','0','T','T','T','T','T','T'],
  ['T','T','T','0','1','1','1','1','1','1','0','T','T','T','T','T'],
  ['T','T','0','1','1','6','1','1','6','1','1','0','T','T','T','T'],
  ['T','0','1','1','6','6','1','1','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','1','1','1','1','1','1','1','0','T','T','T'],
  ['0','1','1','1','1','1','1','1','1','1','1','1','1','0','T','T'],
  ['0','1','1','1','1','4','4','4','4','1','1','1','1','0','T','T'],
  ['0','1','6','1','1','1','1','1','1','1','1','6','1','0','T','T'],
  ['0','1','6','6','1','1','1','1','1','1','6','6','1','0','T','T'],
  ['0','1','1','6','6','6','6','6','6','6','6','1','1','0','T','T'],
  ['T','0','1','1','6','6','6','6','6','6','1','1','0','T','T','T'],
  ['T','0','1','1','1','2','2','2','2','1','1','1','0','T','T','T'],
  ['T','T','0','1','1','2','7','7','2','1','1','0','T','T','T','T'],
  ['T','T','0','0','0','2','2','2','2','0','0','0','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
  ['T','T','T','T','0','2','T','T','2','0','T','T','T','T','T','T'],
];

const SPRITES: Record<AnimationType, PixelColor[][][]> = {
  idle: [spriteIdleFrame0, spriteIdleFrame1],
  walk: [spriteWalkFrame0, spriteWalkFrame1, spriteWalkFrame2, spriteWalkFrame3],
  eat: [spriteEatFrame0, spriteEatFrame1],
  sleep: [spriteSleepFrame0, spriteSleepFrame1],
};

interface Star {
  x: number;
  y: number;
  baseBrightness: number;
  phase: number;
  speed: number;
}

interface PetCanvasProps {
  state: PetState;
  onFrameAdvance: () => void;
}

const PetCanvas: React.FC<PetCanvasProps> = ({ state, onFrameAdvance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const lastStateRef = useRef<PetState | null>(null);
  const needsRedrawRef = useRef<boolean>(true);
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT * 0.6),
        baseBrightness: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    needsRedrawRef.current = true;
  }, [state]);

  const drawSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    animation: AnimationType,
    frame: number,
    offsetX: number,
    offsetY: number
  ) => {
    const frames = SPRITES[animation];
    const spriteData = frames[frame % frames.length];
    const scaledSize = PET_SIZE * PET_SCALE;

    for (let y = 0; y < PET_SIZE; y++) {
      for (let x = 0; x < PET_SIZE; x++) {
        const pixel = spriteData[y][x];
        if (pixel !== 'T' && pixel !== null) {
          const color = P[pixel];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(
              offsetX + x * PET_SCALE,
              offsetY + y * PET_SCALE,
              PET_SCALE,
              PET_SCALE
            );
          }
        }
      }
    }
    return scaledSize;
  }, []);

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const stars = starsRef.current;
    for (const star of stars) {
      const brightness = star.baseBrightness * (0.5 + 0.5 * Math.sin(time * star.speed * 0.001 + star.phase));
      const size = 1 + Math.floor(brightness * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), size, size);
    }
  }, []);

  const drawGround = useCallback((ctx: CanvasRenderingContext2D, isNight: boolean) => {
    const groundY = CANVAS_HEIGHT - 40;
    if (isNight) {
      ctx.fillStyle = '#1a1a3e';
    } else {
      ctx.fillStyle = '#7a9c0a';
    }
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 40);

    if (!isNight) {
      ctx.fillStyle = '#6a8c0a';
      for (let x = 0; x < CANVAS_WIDTH; x += 16) {
        if (Math.random() > 0.5) {
          ctx.fillRect(x, groundY - 4, 4, 4);
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const render = (timestamp: number) => {
      const animConfig = ANIMATION_CONFIG[state.currentAnimation];
      if (timestamp - lastFrameTimeRef.current >= animConfig.interval) {
        onFrameAdvance();
        lastFrameTimeRef.current = timestamp;
      }

      if (needsRedrawRef.current || lastStateRef.current !== state) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (state.isNightMode) {
          ctx.fillStyle = PALETTE.nightBg;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          drawStars(ctx, timestamp);
        } else {
          ctx.fillStyle = PALETTE.dayBg;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        drawGround(ctx, state.isNightMode);

        const scaledSize = PET_SIZE * PET_SCALE;
        const petX = (CANVAS_WIDTH - scaledSize) / 2;
        const petY = (CANVAS_HEIGHT - scaledSize) / 2 - 20;

        drawSprite(ctx, state.currentAnimation, state.animationFrame, petX, petY);

        if (state.currentAnimation === 'sleep' || state.isNightMode) {
          ctx.fillStyle = PALETTE.white;
          ctx.font = `${12 * PET_SCALE / 8}px "Press Start 2P"`;
          const zOffset = Math.sin(timestamp * 0.003) * 3;
          ctx.fillText('Z', petX + scaledSize + 10, petY + 20 + zOffset);
          ctx.fillText('z', petX + scaledSize + 25, petY + 10 + zOffset * 0.8);
        }

        needsRedrawRef.current = false;
        lastStateRef.current = state;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state, onFrameAdvance, drawSprite, drawStars, drawGround]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: PALETTE.white,
          fontSize: '11px',
          fontFamily: "'Press Start 2P', cursive",
          whiteSpace: 'nowrap',
        }}
      >
        Pocket Pet
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          border: `2px solid ${PALETTE.border}`,
          borderRadius: '16px',
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
          display: 'block',
        }}
      />
    </div>
  );
};

export default PetCanvas;
