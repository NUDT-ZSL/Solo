import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { checkCollision, getFragmentBounds, splitImage } from '@/utils/collageEngine';
import { Shuffle } from 'lucide-react';
import type { Fragment } from '@/types';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const COLLISION_THRESHOLD = 5;

interface DragState {
  isDragging: boolean;
  startMouseX: number;
  startMouseY: number;
  fragmentStartPositions: Map<string, { x: number; y: number; zIndex: number }>;
  draggingIds: string[];
  lastFrameTime: number;
  frameCount: number;
  fps: number;
}

export const Workspace: React.FC = () => {
  const {
    sourceImage,
    fragments,
    selectedIds,
    currentStyle,
    styleTransitioning,
    setFragments,
    updateFragment,
    setSelectedIds,
    toggleSelected,
  } = useStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({
    isDragging: false,
    startMouseX: 0,
    startMouseY: 0,
    fragmentStartPositions: new Map(),
    draggingIds: [],
    lastFrameTime: 0,
    frameCount: 0,
    fps: 0,
  });

  const [animatingCollisions, setAnimatingCollisions] = useState<Set<string>>(new Set());

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedIds([]);
    }
  };

  const handleFragmentMouseDown = useCallback(
    (e: React.MouseEvent, fragmentId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const isMultiSelect = e.shiftKey;
      let draggingIds: string[];

      if (selectedIds.includes(fragmentId)) {
        draggingIds = selectedIds;
      } else {
        toggleSelected(fragmentId, isMultiSelect);
        draggingIds = isMultiSelect ? [...selectedIds, fragmentId] : [fragmentId];
      }

      const maxZ = Math.max(...fragments.map((f) => f.zIndex), 0);
      const startPositions = new Map<string, { x: number; y: number; zIndex: number }>();

      draggingIds.forEach((id, idx) => {
        const frag = fragments.find((f) => f.id === id);
        if (frag) {
          startPositions.set(id, {
            x: frag.x,
            y: frag.y,
            zIndex: maxZ + idx + 1,
          });
        }
      });

      dragRef.current = {
        isDragging: true,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        fragmentStartPositions: startPositions,
        draggingIds,
        lastFrameTime: performance.now(),
        frameCount: 0,
        fps: 0,
      };
    },
    [selectedIds, fragments, toggleSelected]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag.isDragging) return;

      drag.frameCount++;
      const now = performance.now();
      if (now - drag.lastFrameTime >= 1000) {
        drag.fps = drag.frameCount;
        drag.frameCount = 0;
        drag.lastFrameTime = now;
      }

      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;

      const collisionIds = new Set<string>();
      const updates = new Map<string, Partial<Fragment>>();

      drag.draggingIds.forEach((id) => {
        const startPos = drag.fragmentStartPositions.get(id);
        if (!startPos) return;

        const frag = fragments.find((f) => f.id === id);
        if (!frag) return;

        let newX = startPos.x + dx;
        let newY = startPos.y + dy;

        const bounds = getFragmentBounds({ ...frag, x: newX, y: newY });
        newX = Math.max(0, Math.min(CANVAS_WIDTH - bounds.width, newX));
        newY = Math.max(0, Math.min(CANVAS_HEIGHT - bounds.height, newY));

        updates.set(id, {
          x: newX,
          y: newY,
          zIndex: startPos.zIndex,
          colliding: false,
        });

        fragments.forEach((otherFrag) => {
          if (drag.draggingIds.includes(otherFrag.id)) return;
          const testFrag = { ...frag, x: newX, y: newY };
          if (checkCollision(testFrag, otherFrag, COLLISION_THRESHOLD)) {
            collisionIds.add(id);
            collisionIds.add(otherFrag.id);
          }
        });
      });

      if (collisionIds.size > 0) {
        setAnimatingCollisions((prev) => {
          const next = new Set(prev);
          collisionIds.forEach((id) => next.add(id));
          return next;
        });

        setTimeout(() => {
          setAnimatingCollisions((prev) => {
            const next = new Set(prev);
            collisionIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 200);
      }

      if (updates.size > 0) {
        setFragments(
          fragments.map((f) => {
            const update = updates.get(f.id);
            if (update) {
              return {
                ...f,
                ...update,
                colliding: collisionIds.has(f.id),
              };
            }
            return {
              ...f,
              colliding: collisionIds.has(f.id),
            };
          })
        );
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
        setFragments((prev) => prev.map((f) => ({ ...f, colliding: false })));
        setAnimatingCollisions(new Set());
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fragments, setFragments]);

  const handleReshuffle = () => {
    if (!sourceImage) return;
    const count = Math.floor(Math.random() * 5) + 12;
    const newFragments = splitImage(sourceImage.width, sourceImage.height, count);
    setFragments(newFragments);
    setSelectedIds([]);
  };

  if (!sourceImage) {
    return (
      <div
        className="workspace-canvas"
        onClick={handleCanvasClick}
        ref={canvasRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8B7D6F',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(212, 139, 96, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Shuffle size={36} color="#D48B60" />
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
            fontSize: 28,
            fontWeight: 600,
            color: '#4A3F35',
            marginBottom: 12,
          }}
        >
          开始你的拼贴创作
        </h2>
        <p style={{ fontSize: 15, opacity: 0.7, maxWidth: 400, textAlign: 'center', lineHeight: 1.7 }}>
          上传一张图片，系统会将它自动分割为多块风格化碎片。
          <br />
          拖动每块碎片到任意位置，调整大小、旋转角度，
          <br />
          叠加滤镜与文字，创造独一无二的数字拼贴作品。
        </p>
      </div>
    );
  }

  const sortedFragments = [...fragments].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={canvasRef}
      className="workspace-canvas"
      onClick={handleCanvasClick}
      style={{ position: 'relative' }}
    >
      {sortedFragments.map((fragment) => {
        const maxX = Math.max(...fragment.points.map((p) => p.x));
        const maxY = Math.max(...fragment.points.map((p) => p.y));
        const clipPath = `polygon(${fragment.points
          .map((p) => `${(p.x / maxX) * 100}% ${(p.y / maxY) * 100}%`)
          .join(', ')})`;
        const isSelected = selectedIds.includes(fragment.id);
        const isColliding = fragment.colliding || animatingCollisions.has(fragment.id);

        const fragStyle: React.CSSProperties = {
          position: 'absolute',
          left: fragment.x,
          top: fragment.y,
          width: maxX * fragment.scale,
          height: maxY * fragment.scale,
          zIndex: fragment.zIndex + 10,
          transform: `rotate(${fragment.rotation}deg)`,
          transformOrigin: 'center center',
          cursor: 'move',
          userSelect: 'none',
          transition: styleTransitioning ? 'opacity 0.3s ease-in-out' : 'none',
          opacity: styleTransitioning ? 0 : 1,
          filter: isColliding
            ? 'drop-shadow(0 0 6px #EF4444) drop-shadow(0 0 3px #EF4444)'
            : 'drop-shadow(2px 4px 8px rgba(0,0,0,0.2))',
        };

        return (
          <div
            key={fragment.id}
            style={fragStyle}
            className={isColliding ? 'collision-shake' : ''}
            onMouseDown={(e) => handleFragmentMouseDown(e, fragment.id)}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelected(fragment.id, e.shiftKey);
            }}
          >
            <FragmentCanvas
              fragment={fragment}
              sourceImage={sourceImage}
              style={currentStyle}
            />

            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath,
                  outline: '2px dashed #C5A55A',
                  outlineOffset: '2px',
                  pointerEvents: 'none',
                }}
              />
            )}

            {isColliding && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath,
                  boxShadow: 'inset 0 0 0 3px #EF4444',
                  pointerEvents: 'none',
                }}
              />
            )}

            {fragment.textOverlay && fragment.textOverlay.content.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  fontFamily:
                    fragment.textOverlay.fontFamily === 'serif'
                      ? "'Playfair Display', 'Noto Serif SC', serif"
                      : "'Inter', sans-serif",
                  fontSize: fragment.textOverlay.fontSize * fragment.scale,
                  color: 'rgba(74, 63, 53, 0.9)',
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                  lineHeight: 1.2,
                  padding: '8px',
                  textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                }}
              >
                {fragment.textOverlay.content}
              </div>
            )}
          </div>
        );
      })}

      {sourceImage && fragments.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReshuffle();
          }}
          className="hover-lift"
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(74,63,53,0.15)',
            fontSize: 13,
            fontWeight: 500,
            color: '#4A3F35',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 5,
          }}
        >
          <Shuffle size={14} />
          重新分割
        </button>
      )}

      <style>{`
        @keyframes collision-shake {
          0%, 100% { margin-left: 0; }
          25% { margin-left: -4px; }
          50% { margin-left: 4px; }
          75% { margin-left: -4px; }
        }
        .collision-shake {
          animation: collision-shake 0.2s ease-in-out !important;
        }
      `}</style>
    </div>
  );
};

const FragmentCanvas: React.FC<{
  fragment: Fragment;
  sourceImage: HTMLImageElement;
  style: string;
}> = React.memo(({ fragment, sourceImage, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxX = Math.max(...fragment.points.map((p) => p.x));
    const maxY = Math.max(...fragment.points.map((p) => p.y));
    canvas.width = Math.max(1, Math.ceil(maxX));
    canvas.height = Math.max(1, Math.ceil(maxY));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    if (fragment.points.length > 0) {
      ctx.moveTo(fragment.points[0].x, fragment.points[0].y);
      for (let i = 1; i < fragment.points.length; i++) {
        ctx.lineTo(fragment.points[i].x, fragment.points[i].y);
      }
      ctx.closePath();
    }
    ctx.clip();

    if (
      fragment.sourceWidth > 0 &&
      fragment.sourceHeight > 0 &&
      canvas.width > 0 &&
      canvas.height > 0
    ) {
      ctx.drawImage(
        sourceImage,
        fragment.sourceX,
        fragment.sourceY,
        fragment.sourceWidth,
        fragment.sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
    ctx.restore();

    const clipPath = `polygon(${fragment.points
      .map((p) => `${(p.x / maxX) * 100}% ${(p.y / maxY) * 100}%`)
      .join(', ')})`;
    canvas.style.clipPath = clipPath;
  }, [fragment, sourceImage, style]);

  const maxX = Math.max(...fragment.points.map((p) => p.x));
  const maxY = Math.max(...fragment.points.map((p) => p.y));
  const clipPath = `polygon(${fragment.points
    .map((p) => `${(p.x / maxX) * 100}% ${(p.y / maxY) * 100}%`)
    .join(', ')})`;

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        clipPath,
        display: 'block',
      }}
    />
  );
});

FragmentCanvas.displayName = 'FragmentCanvas';
