import React, { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import html2canvas from 'html2canvas';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type FontPair } from './fonts';

interface TextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

interface PreviewAreaProps {
  fontPairs: FontPair[];
  onReorderPairs: (pairs: FontPair[]) => void;
  textStyle: TextStyle;
  testText: string;
  loading: boolean;
  onScreenshotReady: (fn: () => Promise<void>) => void;
}

const RingLoader: React.FC = () => (
  <div className="ring-loader-overlay">
    <div className="ring-loader-container">
      <div className="ring-loader-ring ring-loader-ring-1" />
      <div className="ring-loader-ring ring-loader-ring-2" />
      <div className="ring-loader-ring ring-loader-ring-3" />
    </div>
  </div>
);

const ScreenshotOverlay: React.FC = () => (
  <div className="screenshot-overlay" />
);

interface SortableFontCardProps {
  pair: FontPair;
  textStyle: TextStyle;
  testText: string;
  isDragOverlay?: boolean;
}

const SortableFontCard: React.FC<SortableFontCardProps> = React.memo(({ pair, textStyle, testText, isDragOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pair.id, disabled: isDragOverlay });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const titleText = testText.split('\n')[0] || testText;
  const titleFontSize = Math.min(textStyle.fontSize * 1.25, 48);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
      className={`font-card ${isDragging ? 'font-card-dragging' : ''}`}
    >
      <div className="font-card-inner">
        <div className="font-card-tags">
          <span
            className="font-tag"
            style={{ fontFamily: pair.title.family }}
          >
            标题: {pair.title.name}
          </span>
          <span
            className="font-tag"
            style={{ fontFamily: pair.body.family }}
          >
            正文: {pair.body.name}
          </span>
        </div>

        <div
          className="font-card-title"
          style={{
            fontFamily: pair.title.family,
            fontSize: titleFontSize,
            lineHeight: textStyle.lineHeight,
            letterSpacing: textStyle.letterSpacing,
          }}
        >
          {titleText}
        </div>

        <div
          className="font-card-body"
          style={{
            fontFamily: pair.body.family,
            fontSize: textStyle.fontSize,
            lineHeight: textStyle.lineHeight,
            letterSpacing: textStyle.letterSpacing,
          }}
        >
          {testText}
        </div>

        <div className="font-card-hint">
          ⠿ 拖拽排序
        </div>
      </div>
    </div>
  );
});
SortableFontCard.displayName = 'SortableFontCard';

const PreviewArea = forwardRef<{ handleScreenshot: () => Promise<void> }, PreviewAreaProps>(({
  fontPairs,
  onReorderPairs,
  textStyle,
  testText,
  loading,
  onScreenshotReady,
}, ref) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [screenshotting, setScreenshotting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = fontPairs.findIndex((p) => p.id === active.id);
      const newIndex = fontPairs.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newPairs = arrayMove(fontPairs, oldIndex, newIndex);
        onReorderPairs(newPairs);
      }
    }
  }, [fontPairs, onReorderPairs]);

  const handleScreenshot = useCallback(async () => {
    if (!gridRef.current || screenshotting) return;

    setScreenshotting(true);

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 300);
    });

    try {
      const cards = gridRef.current.querySelectorAll('.font-card');
      let maxRight = 0;
      let maxBottom = 0;
      let minLeft = Infinity;
      let minTop = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const gridRect = gridRef.current!.getBoundingClientRect();
        const left = rect.left - gridRect.left;
        const top = rect.top - gridRect.top;
        minLeft = Math.min(minLeft, left);
        minTop = Math.min(minTop, top);
        maxRight = Math.max(maxRight, left + rect.width);
        maxBottom = Math.max(maxBottom, top + rect.height);
      });

      const padding = 24;
      const canvas = await html2canvas(gridRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        x: Math.max(0, minLeft - padding),
        y: Math.max(0, minTop - padding),
        width: maxRight - minLeft + padding * 2,
        height: maxBottom - minTop + padding * 2,
        windowWidth: gridRef.current.scrollWidth,
        windowHeight: gridRef.current.scrollHeight,
      });

      const names = fontPairs.map((p) => `${p.title.name}+${p.body.name}`).join('__');
      const safeName = names.replace(/[\\/:*?"<>|]/g, '_');
      const link = document.createElement('a');
      link.download = `字体对比_${safeName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setTimeout(() => setScreenshotting(false), 200);
    }
  }, [fontPairs, screenshotting]);

  useImperativeHandle(ref, () => ({
    handleScreenshot,
  }));

  useEffect(() => {
    onScreenshotReady(handleScreenshot);
  }, [handleScreenshot, onScreenshotReady]);

  const activePair = activeId ? fontPairs.find((p) => p.id === activeId) : null;

  return (
    <div className="preview-area">
      {loading && <RingLoader />}
      {screenshotting && <ScreenshotOverlay />}

      <div className="preview-area-inner">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fontPairs.map((p) => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div ref={gridRef} className="card-grid">
              {fontPairs.map((pair) => (
                <SortableFontCard
                  key={pair.id}
                  pair={pair}
                  textStyle={textStyle}
                  testText={testText}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlayWrapper activePair={activePair} textStyle={textStyle} testText={testText} />
        </DndContext>
      </div>

      <button
        onClick={handleScreenshot}
        className="screenshot-fab"
        title="一键截图"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </div>
  );
});

PreviewArea.displayName = 'PreviewArea';

const DragOverlayWrapper: React.FC<{
  activePair: FontPair | null | undefined;
  textStyle: TextStyle;
  testText: string;
}> = ({ activePair, textStyle, testText }) => {
  const DragOverlayComponent = (typeof window !== 'undefined'
    ? require('@dnd-kit/core').DragOverlay
    : null) as typeof import('@dnd-kit/core').DragOverlay | null;

  if (!DragOverlayComponent || !activePair) return null;

  return (
    <DragOverlayComponent>
      <div className="font-card font-card-drag-overlay">
        <div className="font-card-inner">
          <div className="font-card-tags">
            <span className="font-tag" style={{ fontFamily: activePair.title.family }}>
              标题: {activePair.title.name}
            </span>
            <span className="font-tag" style={{ fontFamily: activePair.body.family }}>
              正文: {activePair.body.name}
            </span>
          </div>

          <div
            className="font-card-title"
            style={{
              fontFamily: activePair.title.family,
              fontSize: Math.min(textStyle.fontSize * 1.25, 48),
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
            }}
          >
            {testText.split('\n')[0] || testText}
          </div>

          <div
            className="font-card-body"
            style={{
              fontFamily: activePair.body.family,
              fontSize: textStyle.fontSize,
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
            }}
          >
            {testText}
          </div>
        </div>
      </div>
    </DragOverlayComponent>
  );
};

export default PreviewArea;
