import React, { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { FragmentItem } from './FragmentItem';
import { checkCollision, getFragmentBounds } from '@/utils/collageEngine';
import { Shuffle } from 'lucide-react';
import { splitImage } from '@/utils/collageEngine';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

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
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origPositions: Map<string, { x: number; y: number }>;
    movingIds: string[];
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origPositions: new Map(),
    movingIds: [],
  });

  const handleCanvasClick = () => {
    setSelectedIds([]);
  };

  const handleDragStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      const isMulti = e.shiftKey;
      let movingIds: string[];
      if (selectedIds.includes(id)) {
        movingIds = selectedIds;
      } else {
        if (isMulti) {
          toggleSelected(id, true);
          movingIds = [...selectedIds, id];
        } else {
          toggleSelected(id, false);
          movingIds = [id];
        }
      }
      const origPositions = new Map<string, { x: number; y: number }>();
      movingIds.forEach((fid) => {
        const frag = fragments.find((f) => f.id === fid);
        if (frag) origPositions.set(fid, { x: frag.x, y: frag.y });
      });
      dragStateRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        origPositions,
        movingIds,
      };
    },
    [selectedIds, fragments, toggleSelected]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.dragging) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const collisions = new Set<string>();
      const newPositions = new Map<string, { x: number; y: number }>();
      state.movingIds.forEach((id) => {
        const orig = state.origPositions.get(id);
        if (!orig) return;
        const frag = fragments.find((f) => f.id === id);
        if (!frag) return;
        let nx = orig.x + dx;
        let ny = orig.y + dy;
        const bounds = getFragmentBounds({ ...frag, x: nx, y: ny });
        nx = Math.max(0, Math.min(CANVAS_WIDTH - bounds.width, nx));
        ny = Math.max(0, Math.min(CANVAS_HEIGHT - bounds.height, ny));
        newPositions.set(id, { x: nx, y: ny });
        fragments.forEach((other) => {
          if (state.movingIds.includes(other.id)) return;
          const moved = { ...frag, x: nx, y: ny };
          if (checkCollision(moved, other)) {
            collisions.add(id);
            collisions.add(other.id);
          }
        });
      });
      setFragments(
        fragments.map((f) => {
          const np = newPositions.get(f.id);
          if (np) {
            return { ...f, x: np.x, y: np.y, colliding: collisions.has(f.id) };
          }
          return { ...f, colliding: collisions.has(f.id) };
        })
      );
    };

    const handleMouseUp = () => {
      if (dragStateRef.current.dragging) {
        dragStateRef.current.dragging = false;
        setFragments((prev) => prev.map((f) => ({ ...f, colliding: false })));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fragments, setFragments]);

  const reshuffle = () => {
    if (!sourceImage) return;
    const count = Math.floor(Math.random() * 5) + 12;
    const newFragments = splitImage(sourceImage.width, sourceImage.height, count);
    setFragments(newFragments);
  };

  if (!sourceImage) {
    return (
      <div
        className="workspace-canvas"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8B7D6F',
        }}
        onClick={handleCanvasClick}
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
      {sortedFragments.map((fragment) => (
        <FragmentItem
          key={fragment.id}
          fragment={fragment}
          sourceImage={sourceImage}
          style={currentStyle}
          isSelected={selectedIds.includes(fragment.id)}
          onSelect={(e) => {
            e.stopPropagation();
            toggleSelected(fragment.id, e.shiftKey);
          }}
          onDragStart={handleDragStart}
          styleTransitioning={styleTransitioning}
        />
      ))}
      {sourceImage && fragments.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            reshuffle();
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
    </div>
  );
};
