import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  for (const a of annotations) {
    points.add(a.startOffset);
    points.add(a.endOffset);
  }
  const sorted = Array.from(points).sort((a, b) => a - b);

  const segments: TextSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;
    const overlapping = annotations
      .filter((a) => a.startOffset <= start && a.endOffset >= end)
      .map((a) => a.id);
    segments.push({
      text: text.slice(start, end),
      start,
      annotationIds: overlapping,
    });
  }
  return segments;
}

const AnnotationPanel = forwardRef<{ scrollToAnnotation: (id: string) => void }, AnnotationPanelProps>(
  ({ text, annotations, onAddAnnotation, flashId }, ref) => {
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

    useEffect(() => {
      if (flashId && !flashingIds.has(flashId)) {
        setFlashingIds((prev) => new Set(prev).add(flashId));
        const timer = setTimeout(() => {
          setFlashingIds((prev) => {
            const next = new Set(prev);
            next.delete(flashId);
            return next;
          });
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [flashId]);

    useEffect(() => {
      if (popup.visible && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [popup.visible]);

    useImperativeHandle(ref, () => ({
      scrollToAnnotation: (id: string) => {
        const el = containerRef.current?.querySelector(`[data-annotation-ids*="${id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
    }));

    const handleMouseUp = useCallback(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) return;

      const range = selection.getRangeAt(0);
      if (!containerRef.current.contains(range.startContainer)) return;

      const beforeRange = document.createRange();
      beforeRange.setStart(containerRef.current, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = beforeRange.toString().length;

      const selectedText = selection.toString();
      const endOffset = startOffset + selectedText.length;

      if (selectedText.trim().length === 0) return;

      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setPopup({
        visible: true,
        x: rect.left - containerRect.left + rect.width / 2 - 130,
        y: rect.top - containerRect.top - 10,
        startOffset,
        endOffset,
        selectedText,
      });
      setCommentText('');

      selection.removeAllRanges();
    }, []);

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

    const segments = computeSegments(text, annotations);
    const paragraphs = text.split('\n\n');

    const paragraphOffsets: { start: number; end: number }[] = [];
    let currentOffset = 0;
    for (const p of paragraphs) {
      const start = currentOffset;
      const end = start + p.length;
      paragraphOffsets.push({ start, end });
      currentOffset = end + 2;
    }

    return (
      <div
        className="text-area"
        ref={containerRef}
        onMouseUp={handleMouseUp}
        style={{ position: 'relative' }}
      >
        {paragraphs.map((para, pIdx) => {
          const pStart = paragraphOffsets[pIdx].start;
          const pEnd = paragraphOffsets[pIdx].end;
          const pSegments = segments.filter(
            (s) => s.start < pEnd && s.end > pStart
          );

          return (
            <p key={pIdx}>
              {pSegments.map((seg, sIdx) => {
                const segStartInPara = Math.max(seg.start - pStart, 0);
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
  }
);

AnnotationPanel.displayName = 'AnnotationPanel';

export default AnnotationPanel;
