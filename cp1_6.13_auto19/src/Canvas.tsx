import React, { useCallback, useRef, useState } from 'react';
import { useStore } from './store';
import {
  ComponentData,
  ButtonProps,
  CardProps,
  InputProps,
  ComponentType,
  getComponentLabel,
  MAX_COMPONENTS,
} from './types';

const GRID_SIZE = 20;

function snap(pos: number): number {
  return Math.round(pos / GRID_SIZE) * GRID_SIZE;
}

interface CanvasProps {
  onDrop: (type: ComponentType, x: number, y: number) => void;
}

const COMPONENT_DEFAULT_SIZE: Record<ComponentType, { width: number; height: number }> = {
  button: { width: 160, height: 48 },
  card: { width: 280, height: 220 },
  input: { width: 300, height: 44 },
};

const ButtonRenderer: React.FC<{ data: ComponentData }> = React.memo(({ data }) => {
  const props = data.props as ButtonProps;
  return (
    <div
      style={{
        width: props.width,
        height: props.height,
        borderRadius: props.borderRadius,
        backgroundColor: props.backgroundColor,
        color: props.textColor,
        fontSize: props.fontSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        boxShadow: props.shadowDepth > 0
          ? `0 ${props.shadowDepth / 2}px ${props.shadowDepth}px rgba(0,0,0,0.15)`
          : 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
      }}
    >
      {getComponentLabel('button')}
    </div>
  );
});
ButtonRenderer.displayName = 'ButtonRenderer';

const CardRenderer: React.FC<{ data: ComponentData }> = React.memo(({ data }) => {
  const props = data.props as CardProps;
  return (
    <div
      style={{
        width: props.width,
        height: props.height,
        borderRadius: props.borderRadius,
        backgroundColor: props.backgroundColor,
        border: `${props.borderWidth}px solid ${props.borderColor}`,
        boxShadow: props.shadowDepth > 0
          ? `0 ${props.shadowDepth / 2}px ${props.shadowDepth}px rgba(0,0,0,0.1)`
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
        {getComponentLabel('card')}
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
        这是一个示例卡片组件的内容区域
      </div>
    </div>
  );
});
CardRenderer.displayName = 'CardRenderer';

const InputRenderer: React.FC<{ data: ComponentData }> = React.memo(({ data }) => {
  const props = data.props as InputProps;
  return (
    <div
      style={{
        width: props.width,
        height: props.height,
        borderRadius: props.borderRadius,
        border: `1px solid ${props.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: props.padding,
        paddingRight: props.padding,
        background: '#ffffff',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: 13, color: props.placeholderColor }}>请输入内容...</span>
    </div>
  );
});
InputRenderer.displayName = 'InputRenderer';

const Canvas: React.FC<CanvasProps> = ({ onDrop }) => {
  const {
    components,
    selectedId,
    canvasBg,
    deletingIds,
    selectComponent,
    updateComponentPosition,
    bringToFront,
  } = useStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [zDraggingId, setZDraggingId] = useState<string | null>(null);
  const [animateInIds, setAnimateInIds] = useState<Set<string>>(new Set());
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastZRef = useRef<number>(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('component-type') as ComponentType;
      if (!type) return;
      if (components.length >= MAX_COMPONENTS) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dims = COMPONENT_DEFAULT_SIZE[type];
      const rawX = e.clientX - rect.left - dims.width / 2;
      const rawY = e.clientY - rect.top - dims.height / 2;
      const x = snap(Math.max(0, rawX));
      const y = snap(Math.max(0, rawY));

      onDrop(type, x, y);
    },
    [components.length, onDrop]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        selectComponent(null);
      }
    },
    [selectComponent]
  );

  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, comp: ComponentData) => {
      e.stopPropagation();
      if (e.button === 1) {
        e.preventDefault();
        setZDraggingId(comp.id);
        lastZRef.current = comp.zIndex;
        selectComponent(comp.id);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;
      selectComponent(comp.id);
      bringToFront(comp.id);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragOffsetRef.current = {
        x: e.clientX - rect.left - comp.x,
        y: e.clientY - rect.top - comp.y,
      };
      setDraggingId(comp.id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [selectComponent, bringToFront]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (zDraggingId) {
        const deltaY = e.movementY;
        const newZ = Math.max(1, lastZRef.current + Math.round(deltaY / 5));
        useStore.getState().updateComponentZIndex(zDraggingId, newZ);
        return;
      }

      if (!draggingId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const rawX = e.clientX - rect.left - dragOffsetRef.current.x;
      const rawY = e.clientY - rect.top - dragOffsetRef.current.y;
      const x = snap(Math.max(0, rawX));
      const y = snap(Math.max(0, rawY));

      updateComponentPosition(draggingId, x, y);
    },
    [draggingId, zDraggingId, updateComponentPosition]
  );

  const handlePointerUp = useCallback(() => {
    if (zDraggingId) {
      setZDraggingId(null);
      return;
    }
    if (draggingId) {
      setAnimateInIds((prev) => {
        const next = new Set(prev);
        next.add(draggingId);
        return next;
      });
      setTimeout(() => {
        setAnimateInIds((prev) => {
          const next = new Set(prev);
          next.delete(draggingId);
          return next;
        });
      }, 300);
      setDraggingId(null);
    }
  }, [draggingId, zDraggingId]);

  const renderComponent = (comp: ComponentData) => {
    const isSelected = comp.id === selectedId;
    const isDeleting = deletingIds.has(comp.id);
    const isDragging = comp.id === draggingId;
    const isZDragging = comp.id === zDraggingId;
    const isAnimateIn = animateInIds.has(comp.id);

    const renderer = (() => {
      switch (comp.type) {
        case 'button': return <ButtonRenderer data={comp} />;
        case 'card': return <CardRenderer data={comp} />;
        case 'input': return <InputRenderer data={comp} />;
      }
    })();

    const wrapperStyle: React.CSSProperties = {
      position: 'absolute',
      left: comp.x,
      top: comp.y,
      zIndex: isDragging ? 9999 : comp.zIndex,
      cursor: 'move',
      userSelect: 'none',
      transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
      outline: isSelected && !isZDragging
        ? '3px solid #3b82f6'
        : isZDragging
          ? '3px solid #f97316'
          : 'none',
      outlineOffset: '2px',
      borderRadius: 2,
      opacity: isDeleting ? 0 : isDragging ? 0.6 : 1,
      transform: isDeleting
        ? 'scale(0.5)'
        : isDragging
          ? 'rotate(3deg)'
          : 'scale(1) rotate(0deg)',
      animation: isAnimateIn && !isDragging
        ? 'dropIn 0.3s ease-out forwards'
        : isDeleting
          ? 'fadeOut 0.25s ease-out forwards'
          : undefined,
    };

    return (
      <div
        key={comp.id}
        style={wrapperStyle}
        onPointerDown={(e) => handleComponentPointerDown(e, comp)}
      >
        {renderer}
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        flex: 1,
        minHeight: 0,
        background: canvasBg,
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.5s ease',
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        cursor: 'default',
      }}
    >
      {components.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>⬜</div>
            <div>从左侧拖拽组件到此处</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
              最多可放置 {MAX_COMPONENTS} 个组件
            </div>
          </div>
        </div>
      )}
      {components.map(renderComponent)}
    </div>
  );
};

export default Canvas;
