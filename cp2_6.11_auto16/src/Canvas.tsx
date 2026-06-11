import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from './store';
import { CollageElement, ImageElement, TextElement, FONT_FAMILIES, COLOR_PALETTE } from './types';

type InteractionType = 'idle' | 'dragging' | 'resizing' | 'rotating' | 'panning';

interface InteractionState {
  type: InteractionType;
  elementId?: string;
  startX: number;
  startY: number;
  elStartX?: number;
  elStartY?: number;
  elStartW?: number;
  elStartH?: number;
  elStartRotation?: number;
  panStartX?: number;
  panStartY?: number;
  corner?: string;
}

export default function Canvas() {
  const {
    elements, zoom, panX, panY, selectedId, bgColor,
    updateElement, setSelectedId, setZoom, setPan,
    removeElement, bringToFront, newlyAddedId, clearNewlyAdded,
  } = useCanvasStore();

  const viewportRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<InteractionState>({ type: 'idle', startX: 0, startY: 0 });
  const spaceRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRef = useRef<HTMLDivElement>(null);

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: 0, y: 0 };
    const r = vp.getBoundingClientRect();
    return {
      x: (sx - r.left - panX) / zoom,
      y: (sy - r.top - panY) / zoom,
    };
  }, [zoom, panX, panY]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const nz = Math.max(0.25, Math.min(4, zoom * factor));
      const npx = mx - (mx - panX) * (nz / zoom);
      const npy = my - (my - panY) * (nz / zoom);
      setZoom(nz);
      setPan(npx, npy);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoom, panX, panY, setZoom, setPan]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingId) { e.preventDefault(); spaceRef.current = true; }
      if (e.code === 'Delete' && selectedId && !editingId) { removeElement(selectedId); }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceRef.current = false; }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [selectedId, removeElement, editingId]);

  useEffect(() => {
    if (newlyAddedId) {
      const t = setTimeout(clearNewlyAdded, 350);
      return () => clearTimeout(t);
    }
  }, [newlyAddedId, clearNewlyAdded]);

  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === viewportRef.current || (e.target as HTMLElement).classList.contains('canvas-world')) {
      if (spaceRef.current) {
        interactionRef.current = { type: 'panning', startX: e.clientX, startY: e.clientY, panStartX: panX, panStartY: panY };
      } else {
        setSelectedId(null);
        setEditingId(null);
      }
    }
  }, [panX, panY, setSelectedId]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, el: CollageElement) => {
    e.stopPropagation();
    if (editingId === el.id) return;
    setSelectedId(el.id);
    bringToFront(el.id);
    if (spaceRef.current) {
      interactionRef.current = { type: 'panning', startX: e.clientX, startY: e.clientY, panStartX: panX, panStartY: panY };
    } else {
      interactionRef.current = { type: 'dragging', elementId: el.id, startX: e.clientX, startY: e.clientY, elStartX: el.x, elStartY: el.y };
    }
  }, [panX, panY, setSelectedId, bringToFront, editingId]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: CollageElement, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = {
      type: 'resizing', elementId: el.id, startX: e.clientX, startY: e.clientY,
      elStartX: el.x, elStartY: el.y, elStartW: el.width, elStartH: el.height, corner,
    };
  }, []);

  const handleRotateMouseDown = useCallback((e: React.MouseEvent, el: CollageElement) => {
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = {
      type: 'rotating', elementId: el.id, startX: e.clientX, startY: e.clientY,
      elStartRotation: el.rotation, elStartX: el.x, elStartY: el.y,
      elStartW: el.width, elStartH: el.height,
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const st = interactionRef.current;
      if (st.type === 'idle') return;

      if (st.type === 'panning') {
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        setPan((st.panStartX ?? 0) + dx, (st.panStartY ?? 0) + dy);
        return;
      }

      if (st.type === 'dragging' && st.elementId) {
        const dx = (e.clientX - st.startX) / zoom;
        const dy = (e.clientY - st.startY) / zoom;
        updateElement(st.elementId, { x: (st.elStartX ?? 0) + dx, y: (st.elStartY ?? 0) + dy });
        return;
      }

      if (st.type === 'resizing' && st.elementId) {
        const dx = (e.clientX - st.startX) / zoom;
        const dy = (e.clientY - st.startY) / zoom;
        const sw = st.elStartW ?? 100;
        const sh = st.elStartH ?? 100;
        let nw = sw;
        let nh = sh;
        let nx = st.elStartX ?? 0;
        let ny = st.elStartY ?? 0;
        const corner = st.corner ?? 'bottom-right';

        if (corner === 'bottom-right') {
          nw = Math.max(30, sw + dx);
          nh = Math.max(30, sh + dy);
        } else if (corner === 'bottom-left') {
          nw = Math.max(30, sw - dx);
          nh = Math.max(30, sh + dy);
          nx = (st.elStartX ?? 0) + sw - nw;
        } else if (corner === 'top-right') {
          nw = Math.max(30, sw + dx);
          nh = Math.max(30, sh - dy);
          ny = (st.elStartY ?? 0) + sh - nh;
        } else if (corner === 'top-left') {
          nw = Math.max(30, sw - dx);
          nh = Math.max(30, sh - dy);
          nx = (st.elStartX ?? 0) + sw - nw;
          ny = (st.elStartY ?? 0) + sh - nh;
        }
        updateElement(st.elementId, { x: nx, y: ny, width: nw, height: nh });
        return;
      }

      if (st.type === 'rotating' && st.elementId) {
        const el = elements.find((e) => e.id === st.elementId);
        if (!el) return;
        const vp = viewportRef.current;
        if (!vp) return;
        const vpr = vp.getBoundingClientRect();
        const cx = vpr.left + panX + (el.x + el.width / 2) * zoom;
        const cy = vpr.top + panY + (el.y + el.height / 2) * zoom;
        const angle = Math.atan2(e.clientX - cx, -(e.clientY - cy)) * (180 / Math.PI);
        updateElement(st.elementId, { rotation: Math.round(angle) });
      }
    };

    const onUp = () => {
      interactionRef.current = { type: 'idle', startX: 0, startY: 0 };
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [zoom, panX, panY, elements, updateElement, setPan]);

  const handleDoubleClick = useCallback((el: TextElement) => {
    setEditingId(el.id);
    setSelectedId(el.id);
    setTimeout(() => {
      if (editingRef.current) {
        editingRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editingRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 50);
  }, [setSelectedId]);

  const handleTextBlur = useCallback((el: TextElement) => {
    if (editingRef.current) {
      const text = editingRef.current.innerText || '双击编辑';
      updateElement(el.id, { content: text, width: Math.max(el.width, editingRef.current.offsetWidth + 16) });
    }
    setEditingId(null);
  }, [updateElement]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/collage-image');
    if (!data) return;
    try {
      const { src } = JSON.parse(data);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const img = new Image();
      img.onload = () => {
        const maxDim = 300;
        const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
        const w = img.naturalWidth * ratio;
        const h = img.naturalHeight * ratio;
        const id = crypto.randomUUID();
        const newEl: ImageElement = {
          id, type: 'image', src,
          x: pos.x - w / 2, y: pos.y - h / 2,
          width: w, height: h, rotation: 0,
          zIndex: elements.length,
        };
        useCanvasStore.getState().addElement(newEl);
        setSelectedId(id);
      };
      img.src = src;
    } catch { /* ignore */ }
  }, [screenToCanvas, elements.length, setSelectedId]);

  const cursorStyle = spaceRef.current ? 'grab' : 'default';

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      style={{ cursor: cursorStyle }}
      onMouseDown={handleViewportMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="canvas-world"
        style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
      >
        <div
          style={{
            position: 'absolute', top: -5000, left: -5000,
            width: 10000, height: 10000,
            background: bgColor,
            pointerEvents: 'none', zIndex: -1,
          }}
        />
        {elements.map((el) => {
          const isSelected = el.id === selectedId;
          const isNew = el.id === newlyAddedId;
          return (
            <div
              key={el.id}
              className={`canvas-element${isSelected ? ' selected' : ''}${isNew ? ' newly-added' : ''}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                transform: `rotate(${el.rotation || 0}deg)`,
                zIndex: el.zIndex,
              }}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
            >
              {el.type === 'image' && (
                <img
                  src={(el as ImageElement).src}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', borderRadius: 4 }}
                />
              )}
              {el.type === 'text' && (
                <div
                  ref={editingId === el.id ? editingRef : undefined}
                  className={`text-element-content${editingId === el.id ? ' editing' : ''}`}
                  style={{
                    fontFamily: (el as TextElement).fontFamily,
                    fontSize: (el as TextElement).fontSize,
                    color: (el as TextElement).color,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1.3,
                  }}
                  contentEditable={editingId === el.id}
                  suppressContentEditableWarning
                  onDoubleClick={() => handleDoubleClick(el as TextElement)}
                  onBlur={() => handleTextBlur(el as TextElement)}
                  onMouseDown={(e) => { if (editingId === el.id) e.stopPropagation(); }}
                >
                  {(el as TextElement).content}
                </div>
              )}
              {isSelected && (
                <>
                  <div className="rotate-line" />
                  <div
                    className="rotate-handle"
                    onMouseDown={(e) => handleRotateMouseDown(e, el)}
                  />
                  <div className="resize-handle top-left" onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-left')} />
                  <div className="resize-handle top-right" onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-right')} />
                  <div className="resize-handle bottom-left" onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-left')} />
                  <div className="resize-handle bottom-right" onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-right')} />
                </>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute', bottom: 12, right: 12,
          background: 'rgba(255,255,255,0.85)', borderRadius: 8,
          padding: '4px 10px', fontSize: 12, color: '#3D3D3D',
          pointerEvents: 'none', fontFamily: 'Nunito, sans-serif',
          backdropFilter: 'blur(4px)',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
