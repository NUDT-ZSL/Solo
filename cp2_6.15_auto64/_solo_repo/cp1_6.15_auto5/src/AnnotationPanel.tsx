import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import { Annotation } from './App';

interface AnnotationPanelProps {
  text: string;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  flashId: string | null;
}

interface PopupState {
  visible: boolean;
  x: number;
  y: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

interface TextSegment {
  text: string;
  start: number;
  annotationIds: string[];
}

function computeSegments(text: string, annotations: Annotation[]): TextSegment[] {
  if (annotations.length === 0) {
    return [{ text, start: 0, annotationIds: [] }];
  }

  const points = new Set<number>([0, text.length]);
  for (let i = 0; i < annotations.length; i++) {
    const a = annotations[i];
    points.add(a.startOffset);
    points.add(a.endOffset);
  }
  const sorted = Array.from(points).sort((a, b) => a - b);

  const segments: TextSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;
    const overlapping: string[] = [];
    for (let j = 0; j < annotations.length; j++) {
      const a = annotations[j];
      if (a.startOffset <= start && a.endOffset >= end) {
        overlapping.push(a.id);
      }
    }
    segments.push({
      text: text.slice(start, end),
      start,
      annotationIds: overlapping,
    });
  }
  return segments;
}

const AnnotationPanel = forwardRef<
  { scrollToAnnotation: (id: string) => void },
  AnnotationPanelProps
>(({ text, annotations, onAddAnnotation, flashId }, ref) => {
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    x: 0,
    y: 0,
    startOffset: 0,
    endOffset: 0,
    selectedText: '',
  });
  const [commentText, setCommentText] = useState('');
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSelectingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const flashTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const segments = useMemo(() => computeSegments(text, annotations), [text, annotations]);

  const paragraphs = useMemo(() => {
    const paras = text.split('\n\n');
    const offsets: { start: number; end: number }[] = [];
    let currentOffset = 0;
    for (const p of paras) {
      const start = currentOffset;
      const end = start + p.length;
      offsets.push({ start, end });
      currentOffset = end + 2;
    }
    return { paras, offsets };
  }, [text]);

  useEffect(() => {
    if (!flashId) return;

    setFlashingIds((prev) => {
      if (prev.has(flashId)) return prev;
      const next = new Set(prev);
      next.add(flashId);
      return next;
    });

    if (flashTimersRef.current.has(flashId)) {
      clearTimeout(flashTimersRef.current.get(flashId)!);
    }

    const timer = setTimeout(() => {
      setFlashingIds((prev) => {
        const next = new Set(prev);
        next.delete(flashId);
        return next;
      });
      flashTimersRef.current.delete(flashId);
    }, 500);

    flashTimersRef.current.set(flashId, timer);
  }, [flashId]);

  useEffect(() => {
    if (popup.visible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [popup.visible]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToAnnotation: (id: string) => {
        const el = containerRef.current?.querySelector(
          `[data-annotation-ids*="${id}"]`
        ) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
    }),
    []
  );

  const handleSelectionComplete = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const range = selection.getRangeAt(0);
    const startInContainer = containerRef.current.contains(range.startContainer);
    const endInContainer = containerRef.current.contains(range.endContainer);

    if (!startInContainer && !endInContainer) {
      isSelectingRef.current = false;
      return;
    }

    const beforeRange = document.createRange();
    beforeRange.setStart(containerRef.current, 0);

    let startOffset = 0;
    let endOffset = 0;

    if (startInContainer) {
      beforeRange.setEnd(range.startContainer, range.startOffset);
      startOffset = beforeRange.toString().length;
    }

    const afterRange = document.createRange();
    afterRange.setStart(containerRef.current, 0);
    if (endInContainer) {
      afterRange.setEnd(range.endContainer, range.endOffset);
      endOffset = afterRange.toString().length;
    } else {
      endOffset = containerRef.current.textContent?.length || 0;
    }

    if (!startInContainer) {
      startOffset = 0;
    }

    if (startOffset < 0) startOffset = 0;
    if (endOffset > text.length) endOffset = text.length;
    if (startOffset >= endOffset) {
      isSelectingRef.current = false;
      return;
    }

    const selectedText = text.slice(startOffset, endOffset);

    if (!selectedText.trim()) {
      isSelectingRef.current = false;
      return;
    }

    const displayRange = document.createRange();
    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT, null);
    let currentNode: Node | null = walker.nextNode();
    let charCount = 0;
    let startNode: Node | null = null;
    let startNodeOffset = 0;
    let endNode: Node | null = null;
    let endNodeOffset = 0;

    while (currentNode) {
      const nodeText = currentNode.textContent || '';
      const nodeLength = nodeText.length;

      if (!startNode && charCount + nodeLength >= startOffset) {
        startNode = currentNode;
        startNodeOffset = startOffset - charCount;
      }

      if (charCount + nodeLength >= endOffset) {
        endNode = currentNode;
        endNodeOffset = endOffset - charCount;
        break;
      }

      charCount += nodeLength;
      currentNode = walker.nextNode();
    }

    let rect: DOMRect;
    if (startNode && endNode && startNode instanceof CharacterData && endNode instanceof CharacterData) {
      try {
        displayRange.setStart(startNode, startNodeOffset);
        displayRange.setEnd(endNode, endNodeOffset);
        rect = displayRange.getBoundingClientRect();
      } catch {
        rect = containerRef.current.getBoundingClientRect();
      }
    } else {
      rect = containerRef.current.getBoundingClientRect();
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const popupX = rect.left - containerRect.left + rect.width / 2 - 130;
    const popupY = rect.top - containerRect.top;

    setPopup({
      visible: true,
      x: Math.max(0, popupX),
      y: popupY,
      startOffset,
      endOffset,
      selectedText,
    });
    setCommentText('');

    selection.removeAllRanges();
    isSelectingRef.current = false;
  }, [text]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const target = e.target as Node;
    if (containerRef.current.contains(target)) {
      isSelectingRef.current = true;
      if (popup.visible) {
        setPopup((prev) => ({ ...prev, visible: false }));
      }
    }
  }, [popup.visible]);

  const handleMouseUp = useCallback(() => {
    if (!isSelectingRef.current) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(handleSelectionComplete);
  }, [handleSelectionComplete]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelectingRef.current) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(handleSelectionComplete);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleSelectionComplete]);

  const handleSave = useCallback(() => {
    if (!popup.selectedText.trim()) return;
    onAddAnnotation({
      startOffset: popup.startOffset,
      endOffset: popup.endOffset,
      selectedText: popup.selectedText,
      comment: commentText,
    });
    setPopup((prev) => ({ ...prev, visible: false }));
    setCommentText('');
  }, [popup, commentText, onAddAnnotation]);

  const handleCancel = useCallback(() => {
    setPopup((prev) => ({ ...prev, visible: false }));
    setCommentText('');
  }, []);

  const { paras, offsets } = paragraphs;

  return (
    <div
      className="text-area"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ position: 'relative' }}
    >
      {paras.map((para, pIdx) => {
        const pStart = offsets[pIdx].start;
        const pEnd = offsets[pIdx].end;
        const pSegments = segments.filter((s) => s.start < pEnd && s.end > pStart);

        return (
          <p key={pIdx}>
            {pSegments.map((seg, sIdx) => {
              const segText = text.slice(
                Math.max(seg.start, pStart),
                Math.min(seg.start + seg.text.length, pEnd)
              );

              const isHighlighted = seg.annotationIds.length > 0;
              const isFlashing = seg.annotationIds.some((id) => flashingIds.has(id));
              const dataAttr = seg.annotationIds.join(',');

              if (isHighlighted) {
                return (
                  <span
                    key={sIdx}
                    data-annotation-ids={dataAttr}
                    className={`highlight-mark${isFlashing ? ' flash' : ''}`}
                  >
                    {segText}
                  </span>
                );
              }
              return <span key={sIdx}>{segText}</span>;
            })}
          </p>
        );
      })}

      {popup.visible && (
        <div
          className="annotation-popup"
          style={{ left: Math.max(0, popup.x), top: popup.y - 80 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="输入评语..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
          <div className="annotation-popup-actions">
            <button onClick={handleCancel}>取消</button>
            <button className="btn-save" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

AnnotationPanel.displayName = 'AnnotationPanel';

export default AnnotationPanel;
