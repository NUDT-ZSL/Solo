import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StateNode, Transition, CurveType, LoopMode } from './StateMachineEditor';
import { SpriteService } from '../services/SpriteService';

const CURVE_FN: Record<CurveType, (t: number) => number> = {
  EaseInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  EaseOut: (t) => 1 - Math.pow(1 - t, 3),
  Linear: (t) => t,
};

interface Props {
  currentNode: StateNode | null;
  transition?: Transition;
}

const SpritePreview: React.FC<Props> = ({ currentNode, transition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [progress, setProgress] = useState(0);
  const stateRef = useRef<{
    node: StateNode | null;
    transition: Transition | undefined;
    playing: boolean;
    frameIndex: number;
    frameTimer: number;
    transitionTimer: number;
    transitioning: boolean;
    fromNode: StateNode | null;
    fromFrame: number;
    loopDir: number;
    lastTime: number;
    accumulatedTime: number;
  }>({
    node: null,
    transition: undefined,
    playing: false,
    frameIndex: 0,
    frameTimer: 0,
    transitionTimer: 0,
    transitioning: false,
    fromNode: null,
    fromFrame: 0,
    loopDir: 1,
    lastTime: 0,
    accumulatedTime: 0,
  });

  stateRef.current.node = currentNode;
  stateRef.current.transition = transition;

  useEffect(() => {
    if (transition && currentNode) {
      stateRef.current.transitioning = true;
      stateRef.current.transitionTimer = 0;
      stateRef.current.fromFrame = stateRef.current.frameIndex;
    }
  }, [transition, currentNode]);

  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      spriteId: number,
      frameIdx: number,
      alpha: number,
      offsetX: number
    ) => {
      const sprite = SpriteService.getSpriteById(spriteId);
      if (!sprite) return;
      const spriteCanvas = SpriteService.generateSpriteCanvas(sprite);
      const totalFrames = sprite.frames;
      const fi = ((frameIdx % totalFrames) + totalFrames) % totalFrames;

      ctx.globalAlpha = alpha;
      const scale = 1.5;
      const sw = sprite.width * scale;
      const sh = sprite.height * scale;
      const dx = (450 - sw) / 2 + offsetX;
      const dy = (300 - sh) / 2;

      ctx.drawImage(
        spriteCanvas,
        fi * sprite.width,
        0,
        sprite.width,
        sprite.height,
        dx,
        dy,
        sw,
        sh
      );
      ctx.globalAlpha = 1;
    },
    []
  );

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.node || !s.playing) return;

    const now = performance.now();
    const dt = s.lastTime ? now - s.lastTime : 16;
    s.lastTime = now;

    if (dt > 100) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }

    const targetFPS = 50;
    const frameInterval = 1000 / targetFPS;
    s.accumulatedTime = (s.accumulatedTime || 0) + dt;

    if (s.accumulatedTime < frameInterval) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }

    const ticks = Math.floor(s.accumulatedTime / frameInterval);
    s.accumulatedTime -= ticks * frameInterval;

    const sprite = SpriteService.getSpriteById(s.node.spriteId);
    if (!sprite) return;

    if (s.transitioning && s.transition) {
      s.transitionTimer += frameInterval * ticks;
      const duration = s.transition.duration || 300;
      let t = Math.min(s.transitionTimer / duration, 1);
      const curveFn = CURVE_FN[s.transition.curve];
      t = curveFn(t);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

          if (s.fromNode) {
            drawFrame(ctx, s.fromNode.spriteId, s.fromFrame, 1 - t, -t * 60);
          }
          drawFrame(ctx, s.node.spriteId, s.frameIndex, t, (1 - t) * 60);
        }
      }

      setProgress(Math.round(t * 100));

      if (s.transitionTimer >= duration) {
        s.transitioning = false;
        s.transitionTimer = 0;
      }

      animRef.current = requestAnimationFrame(tick);
      return;
    }

    s.frameTimer += frameInterval * ticks;

    if (s.frameTimer >= frameInterval * 4) {
      s.frameTimer = 0;
      const total = sprite.frames;

      switch (s.node.loopMode) {
        case 'once':
          if (s.frameIndex < total - 1) {
            s.frameIndex++;
          }
          break;
        case 'loop':
          s.frameIndex = (s.frameIndex + 1) % total;
          break;
        case 'pingpong':
          s.frameIndex += s.loopDir;
          if (s.frameIndex >= total - 1) s.loopDir = -1;
          if (s.frameIndex <= 0) s.loopDir = 1;
          break;
      }

      setCurrentFrame(s.frameIndex);
      setProgress(
        Math.round(((s.frameIndex + 1) / total) * 100)
      );
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        drawFrame(ctx, s.node.spriteId, s.frameIndex, 1, 0);
      }
    }

    animRef.current = requestAnimationFrame(tick);
  }, [drawFrame]);

  useEffect(() => {
    stateRef.current.playing = playing;
    if (playing) {
      stateRef.current.lastTime = 0;
      animRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, tick]);

  useEffect(() => {
    if (currentNode) {
      const sprite = SpriteService.getSpriteById(currentNode.spriteId);
      if (sprite) {
        stateRef.current.fromNode = stateRef.current.node;
        stateRef.current.fromFrame = stateRef.current.frameIndex;
      }
      stateRef.current.frameIndex = 0;
      stateRef.current.loopDir = 1;
      stateRef.current.frameTimer = 0;
      setCurrentFrame(0);
      setProgress(0);
    }
  }, [currentNode]);

  const stepForward = useCallback(() => {
    const s = stateRef.current;
    if (!s.node) return;
    const sprite = SpriteService.getSpriteById(s.node.spriteId);
    if (!sprite) return;
    s.frameIndex = (s.frameIndex + 1) % sprite.frames;
    setCurrentFrame(s.frameIndex);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        drawFrame(ctx, s.node.spriteId, s.frameIndex, 1, 0);
      }
    }
  }, [drawFrame]);

  const stepBackward = useCallback(() => {
    const s = stateRef.current;
    if (!s.node) return;
    const sprite = SpriteService.getSpriteById(s.node.spriteId);
    if (!sprite) return;
    s.frameIndex = (s.frameIndex - 1 + sprite.frames) % sprite.frames;
    setCurrentFrame(s.frameIndex);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        drawFrame(ctx, s.node.spriteId, s.frameIndex, 1, 0);
      }
    }
  }, [drawFrame]);

  const sprite = currentNode
    ? SpriteService.getSpriteById(currentNode.spriteId)
    : null;

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span className="preview-title">
          Preview: {currentNode?.name || 'None'}
        </span>
        <span className="preview-info">
          Frame {currentFrame + 1}/{sprite?.frames || 0} | {sprite?.name || '-'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={450 * (window.devicePixelRatio || 1)}
        height={300 * (window.devicePixelRatio || 1)}
        className="preview-canvas"
      />
      <div className="preview-controls">
        <button className="ctrl-btn" onClick={stepBackward} title="Previous Frame">
          ⏮
        </button>
        <button
          className={`ctrl-btn play-btn ${playing ? 'playing' : ''}`}
          onClick={() => setPlaying(!playing)}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={stepForward} title="Next Frame">
          ⏭
        </button>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
          <span className="progress-text">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default SpritePreview;
