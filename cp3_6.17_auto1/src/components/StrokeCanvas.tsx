import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  getCharacterStrokes,
  type CharacterStrokes,
  type Stroke,
  type StrokePoint,
} from '../utils/strokeData';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const THUMB_SIZE = 80;
const STROKE_WIDTH = 3;
const MARKER_RADIUS = 6;
const HOVER_THRESHOLD = 10;

const SPEED_MAP: Record<string, number> = {
  slow: 800,
  normal: 500,
  fast: 300,
};

const COLOR = {
  background: '#ffffff',
  strokeActive: '#000000',
  strokeDone: '#9e9e9e',
  strokePending: '#f0e6d2',
  marker: '#1565c0',
  markerText: '#ffffff',
  thumbBg: '#f5f5f5',
  thumbDone: '#9e9e9e',
  thumbPending: '#e8dcc8',
  infoText: '#424242',
  shadow: '#e0d8c8',
  hoverStroke: '#1565c0',
};

interface StrokeCanvasProps {
  characters: string;
  speed: 'slow' | 'normal' | 'fast';
  isPlaying: boolean;
  onPlayStateChange?: (state: {
    currentStrokeGlobal: number;
    totalStrokes: number;
    completed: boolean;
  }) => void;
  onComplete?: () => void;
}

interface HoverInfo {
  stroke: Stroke;
  globalIndex: number;
  mouseX: number;
  mouseY: number;
}

interface FlatStroke {
  stroke: Stroke;
  charIdx: number;
  localIdx: number;
  globalIdx: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpPoint = (a: StrokePoint, b: StrokePoint, t: number): StrokePoint => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

const quadBezier = (
  p0: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint,
  t: number,
): StrokePoint => {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
};

const buildPolyline = (stroke: Stroke): StrokePoint[] => {
  const pts: StrokePoint[] = [stroke.startPoint];
  if (stroke.type === 'curve') {
    if (stroke.controlPoints && stroke.controlPoints.length > 0) {
      pts.push(...stroke.controlPoints);
    }
  } else {
    if (stroke.controlPoints && stroke.controlPoints.length > 0) {
      pts.push(...stroke.controlPoints);
    }
  }
  pts.push(stroke.endPoint);
  return pts;
};

const pointAtProgress = (stroke: Stroke, progress: number): StrokePoint => {
  const pts = buildPolyline(stroke);
  if (pts.length === 1) return pts[0];
  if (stroke.type === 'curve' && stroke.controlPoints && stroke.controlPoints.length === 1) {
    return quadBezier(pts[0], pts[1], pts[2], progress);
  }
  const segs = pts.length - 1;
  const totalT = progress * segs;
  const segIdx = Math.min(Math.floor(totalT), segs - 1);
  const segT = totalT - segIdx;
  return lerpPoint(pts[segIdx], pts[segIdx + 1], segT);
};

const sampleCurveDistance = (
  px: number,
  py: number,
  stroke: Stroke,
  samples = 40,
): number => {
  let minDist = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = pointAtProgress(stroke, t);
    const d = Math.hypot(px - pt.x, py - pt.y);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

const drawStrokeSegment = (
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  progress: number,
  color: string,
  lineWidth: number,
) => {
  if (progress <= 0) return;
  const clamped = Math.min(1, progress);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  const pts = buildPolyline(stroke);

  if (stroke.type === 'curve' && stroke.controlPoints && stroke.controlPoints.length === 1) {
    if (clamped >= 1) {
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    } else {
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * clamped;
        const pt = quadBezier(pts[0], pts[1], pts[2], t);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
    }
  } else {
    const segs = pts.length - 1;
    const totalT = clamped * segs;
    const fullSegs = Math.floor(totalT);
    const lastSegT = totalT - fullSegs;

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < fullSegs && i < segs; i++) {
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    }
    if (fullSegs < segs) {
      const cur = lerpPoint(pts[fullSegs], pts[fullSegs + 1], lastSegT);
      ctx.lineTo(cur.x, cur.y);
    }
  }

  ctx.stroke();
  ctx.restore();
};

const drawMarker = (
  ctx: CanvasRenderingContext2D,
  point: StrokePoint,
  label: string,
  scale = 1,
  alpha = 1,
) => {
  const r = MARKER_RADIUS * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLOR.marker;
  ctx.beginPath();
  ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLOR.markerText;
  ctx.font = `bold ${Math.round(10 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, point.x, point.y + 0.5);
  ctx.restore();
};

export default function StrokeCanvas({
  characters,
  speed,
  isPlaying,
  onPlayStateChange,
  onComplete,
}: StrokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [isPausedState, setIsPausedState] = useState(false);

  const charsData = useMemo<CharacterStrokes[]>(
    () => getCharacterStrokes(characters),
    [characters],
  );

  const flatStrokes = useMemo<FlatStroke[]>(() => {
    const list: FlatStroke[] = [];
    let global = 0;
    charsData.forEach((cd, ci) => {
      cd.strokes.forEach((s, li) => {
        list.push({ stroke: s, charIdx: ci, localIdx: li, globalIdx: global });
        global++;
      });
    });
    return list;
  }, [charsData]);

  const totalStrokes = flatStrokes.length;
  const animRef = useRef<{
    rafId: number | null;
    lastTime: number;
    currentIdx: number;
    progress: number;
    completed: boolean;
  }>({
    rafId: null,
    lastTime: 0,
    currentIdx: 0,
    progress: 0,
    completed: false,
  });

  const resetAnimation = useCallback(() => {
    animRef.current.currentIdx = 0;
    animRef.current.progress = 0;
    animRef.current.completed = false;
    animRef.current.lastTime = 0;
    setIsPausedState(false);
  }, []);

  useEffect(() => {
    resetAnimation();
  }, [characters, resetAnimation]);

  const notifyState = useCallback(() => {
    if (!onPlayStateChange) return;
    onPlayStateChange({
      currentStrokeGlobal:
        animRef.current.currentIdx + (animRef.current.progress > 0 ? 1 : 0),
      totalStrokes,
      completed: animRef.current.completed,
    });
  }, [onPlayStateChange, totalStrokes]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const thumb = thumbRef.current;
    if (!canvas || !thumb) return;

    const ctx = canvas.getContext('2d');
    const tctx = thumb.getContext('2d');
    if (!ctx || !tctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_WIDTH * dpr) {
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLOR.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const anim = animRef.current;

    flatStrokes.forEach(({ stroke, globalIdx }) => {
      let state: 'done' | 'active' | 'pending';
      let drawProgress = 0;
      if (globalIdx < anim.currentIdx) {
        state = 'done';
        drawProgress = 1;
      } else if (globalIdx === anim.currentIdx) {
        state = 'active';
        drawProgress = anim.progress;
      } else {
        state = 'pending';
        drawProgress = 0;
      }

      const isHover =
        hoverInfo &&
        hoverInfo.globalIndex === globalIdx &&
        (isPausedState || anim.completed);
      const scaleEff = isHover ? 1.15 : 1;
      const color = isHover
        ? COLOR.hoverStroke
        : state === 'done'
          ? COLOR.strokeDone
          : state === 'active'
            ? COLOR.strokeActive
            : 'transparent';

      if (state !== 'pending') {
        drawStrokeSegment(ctx, stroke, drawProgress, color, STROKE_WIDTH * scaleEff);
      }

      if (isHover) {
        drawStrokeSegment(
          ctx,
          stroke,
          1,
          'rgba(21, 101, 192, 0.25)',
          STROKE_WIDTH * 2.5,
        );
      }

      if (state !== 'pending' || isPausedState || anim.completed) {
        if (state === 'done') {
          drawMarker(ctx, stroke.startPoint, String(stroke.id));
        } else if (state === 'active') {
          drawMarker(ctx, stroke.startPoint, String(stroke.id));
        } else if (isPausedState || anim.completed) {
          drawMarker(ctx, stroke.startPoint, String(stroke.id), 1, 0.5);
        }
      }
    });

    if (!anim.completed && totalStrokes === 0 && characters.length > 0) {
      ctx.fillStyle = COLOR.infoText;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `暂不支持的汉字「${characters}」，请尝试：大小上中下 人水火山石 田日月明 子女子学 国我你他她们 是的了不在 有和也就这那 前后里外 左右`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        CANVAS_WIDTH - 40,
      );
    }

    if (characters.length === 0) {
      ctx.fillStyle = '#9e9e9e';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请在上方输入框输入简体汉字', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    const tDpr = window.devicePixelRatio || 1;
    if (thumb.width !== THUMB_SIZE * tDpr) {
      thumb.width = THUMB_SIZE * tDpr;
      thumb.height = THUMB_SIZE * tDpr;
      thumb.style.width = `${THUMB_SIZE}px`;
      thumb.style.height = `${THUMB_SIZE}px`;
      tctx.setTransform(tDpr, 0, 0, tDpr, 0, 0);
    }

    tctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    tctx.fillStyle = COLOR.thumbBg;
    tctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    const tScale = THUMB_SIZE / CANVAS_WIDTH;
    const tStrokeW = Math.max(1, STROKE_WIDTH * tScale);

    flatStrokes.forEach(({ stroke, globalIdx }) => {
      let state: 'done' | 'active' | 'pending';
      let p = 0;
      if (globalIdx < anim.currentIdx) {
        state = 'done';
        p = 1;
      } else if (globalIdx === anim.currentIdx) {
        state = 'active';
        p = anim.progress;
      } else {
        state = 'pending';
        p = 0;
      }
      if (state === 'pending') return;

      const scaledStroke: Stroke = {
        ...stroke,
        startPoint: { x: stroke.startPoint.x * tScale, y: stroke.startPoint.y * tScale },
        endPoint: { x: stroke.endPoint.x * tScale, y: stroke.endPoint.y * tScale },
        controlPoints: stroke.controlPoints?.map((cp) => ({
          x: cp.x * tScale,
          y: cp.y * tScale,
        })),
      };

      drawStrokeSegment(
        tctx,
        scaledStroke,
        p,
        state === 'done' ? COLOR.thumbDone : COLOR.strokeActive,
        tStrokeW,
      );
    });
  }, [flatStrokes, hoverInfo, isPausedState, totalStrokes, characters]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const anim = animRef.current;
    const duration = SPEED_MAP[speed];

    if (animRef.current.rafId) {
      cancelAnimationFrame(animRef.current.rafId);
      animRef.current.rafId = null;
    }

    if (!isPlaying || totalStrokes === 0) {
      setIsPausedState(!isPlaying);
      return;
    }

    setIsPausedState(false);

    if (anim.completed) {
      anim.currentIdx = 0;
      anim.progress = 0;
      anim.completed = false;
    }

    anim.lastTime = 0;

    const tick = (time: number) => {
      if (anim.lastTime === 0) anim.lastTime = time;
      const dt = time - anim.lastTime;
      anim.lastTime = time;

      if (anim.currentIdx < totalStrokes) {
        anim.progress += dt / duration;
        while (anim.progress >= 1 && anim.currentIdx < totalStrokes) {
          anim.progress -= 1;
          anim.currentIdx += 1;
          if (anim.currentIdx >= totalStrokes) {
            anim.progress = 0;
            anim.completed = true;
            break;
          }
        }
      } else {
        anim.completed = true;
      }

      notifyState();
      render();

      if (anim.completed) {
        anim.rafId = null;
        onComplete?.();
        return;
      }

      anim.rafId = requestAnimationFrame(tick);
    };

    anim.rafId = requestAnimationFrame(tick);

    return () => {
      if (anim.rafId) {
        cancelAnimationFrame(anim.rafId);
        anim.rafId = null;
      }
    };
  }, [isPlaying, speed, totalStrokes, render, notifyState, onComplete]);

  useEffect(() => {
    notifyState();
  }, [notifyState]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPausedState && !animRef.current.completed) {
      if (hoverInfo) setHoverInfo(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const my = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    let found: HoverInfo | null = null;
    let minD = HOVER_THRESHOLD;
    for (const { stroke, globalIdx } of flatStrokes) {
      const d = sampleCurveDistance(mx, my, stroke);
      if (d < minD) {
        minD = d;
        found = {
          stroke,
          globalIndex: globalIdx,
          mouseX: e.clientX - rect.left,
          mouseY: e.clientY - rect.top,
        };
      }
    }
    setHoverInfo(found);
  };

  const handleMouseLeave = () => setHoverInfo(null);

  const currentDisplayNum =
    totalStrokes > 0
      ? Math.min(
          animRef.current.currentIdx + (animRef.current.progress > 0 ? 1 : 0),
          totalStrokes,
        )
      : 0;

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          maxWidth: '100%',
          height: CANVAS_HEIGHT,
          background: COLOR.background,
          borderRadius: '12px',
          boxShadow: `inset 0 0 0 8px ${COLOR.shadow}`,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: isPausedState || animRef.current.completed ? 'pointer' : 'default',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '16px',
            bottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'none',
          }}
        >
          <canvas
            ref={thumbRef}
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: '8px',
              border: `2px solid ${COLOR.shadow}`,
              background: COLOR.thumbBg,
            }}
          />
          <div
            style={{
              fontSize: '14px',
              color: COLOR.infoText,
              fontFamily: 'sans-serif',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            <div>
              第{' '}
              <span style={{ color: COLOR.marker, fontWeight: 700 }}>
                {currentDisplayNum}
              </span>{' '}
              笔 / 共 {totalStrokes} 笔
            </div>
            {characters && (
              <div style={{ marginTop: '2px', fontSize: '12px', opacity: 0.7 }}>
                字：{characters}
              </div>
            )}
          </div>
        </div>

        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hoverInfo.mouseX + 12, CANVAS_WIDTH - 260),
              top: Math.max(hoverInfo.mouseY - 74, 8),
              background: 'rgba(33, 33, 33, 0.94)',
              color: '#ffffff',
              fontSize: '13px',
              padding: '10px 14px',
              borderRadius: '10px',
              pointerEvents: 'none',
              whiteSpace: 'normal',
              maxWidth: '260px',
              transform: hoverInfo ? 'scale(1)' : 'scale(0.9)',
              transformOrigin: 'left bottom',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
              fontFamily: 'sans-serif',
              zIndex: 10,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, color: '#90caf9', marginBottom: 4 }}>
              第 {hoverInfo.globalIndex + 1} 笔 · 编号 {hoverInfo.stroke.id}
            </div>
            <div style={{ color: '#ffe0b2' }}>笔画类型：{hoverInfo.stroke.kind}</div>
            <div style={{ marginTop: 4, opacity: 0.92 }}>
              方向：{hoverInfo.stroke.hint}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
