import React, { useCallback, useRef, useState } from 'react';
import { useStore } from './store';
import {
  ComponentData,
  ButtonProps,
  CardProps,
  InputProps,
  snapToGrid,
  ComponentType,
  getComponentLabel,
  MAX_COMPONENTS,
} from './types';

interface CanvasProps {
  onDrop: (type: ComponentType, x: number, y: number) => void;
}

const ButtonRenderer: React.FC<{ data: ComponentData }> = React.memo(({ data }) => {
  const props = data.props as ButtonProps;
  return (
    <div
      className="component-transition"
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
      className="component-transition"
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
      className="component-transition"
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
    deleteComponent,
    bringToFront,
  } = useStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [zDraggingId, setZDraggingId] = useState<string | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
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

      const defaultProps = { button: { width: 160, height: 48 }, card: { width: 280, height: 220 }, input: { width: 300, height: 44 } };
      const dims = defaultProps[type];
      const rawX = e.clientX - rect.left - dims.width / 2;
      const rawY = e.clientY - rect.top - dims.height / 2;
      const x = snapToGrid(Math.max(0, rawX));
      const y = snapToGrid(Math.max(0, rawY));

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
        const comp = components.find((c) => c.id === zDraggingId);
        if (!comp) return;
        const deltaY = e.movementY;
        const newZ = lastZRef.current + Math.round(deltaY / 5);
        if (newZ >= 1) {
          useStore.getState().updateComponentZIndex(zDraggingId, newZ);
        }
        return;
      }

      if (!draggingId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const comp = components.find((c) => c.id === draggingId);
      if (!comp) return;

      const rawX = e.clientX - rect.left - dragOffsetRef.current.x;
      const rawY = e.clientY - rect.top - dragOffsetRef.current.y;
      const x = snapToGrid(Math.max(0, rawX));
      const y = snapToGrid(Math.max(0, rawY));

      updateComponentPosition(draggingId, x, y);
    },
    [draggingId, zDraggingId, components, updateComponentPosition]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (zDraggingId) {
        setZDraggingId(null);
        return;
      }
      if (draggingId) {
        setNewlyAddedId(draggingId);
        setTimeout(() => setNewlyAddedId(null), 300);
        setDraggingId(null);
      }
    },
    [draggingId, zDraggingId]
  );

  const renderComponent = (comp: ComponentData) => {
    const isSelected = comp.id === selectedId;
    const isDeleting = deletingIds.has(comp.id);
    const isDragging = comp.id === draggingId;
    const isZDragging = comp.id === zDraggingId;
    const isNew = comp.id === newlyAddedId;

    let className = 'canvas-component';
    if (isSelected && !isZDragging) className += ' selected';
    if (isZDragging) className += ' z-dragging';
    if (isDragging) className += ' dragging';
    if (isDeleting) className += ' animate-fade-out';
    if (isNew && !isDragging) className += ' animate-drop-in';

    const renderer = (() => {
      switch (comp.type) {
        case 'button': return <ButtonRenderer data={comp} />;
        case 'card': return <CardRenderer data={comp} />;
        case 'input': return <InputRenderer data={comp} />;
      }
    })();

    return (
      <div
        key={comp.id}
        className={className}
        style={{
          left: comp.x,
          top: comp.y,
          zIndex: isDragging ? 9999 : comp.zIndex,
        }}
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
        backgroundSize: '20px 20px',
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
