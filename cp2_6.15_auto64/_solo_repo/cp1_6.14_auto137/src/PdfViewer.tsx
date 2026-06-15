import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PdfParser } from './PdfParser';
import type { Annotation, AnnotationType, AnnotationRect } from './types';

interface PdfViewerProps {
  parser: PdfParser | null;
  annotations: Annotation[];
  onAddAnnotation: (
    pageNumber: number,
    type: AnnotationType,
    text: string,
    rect: AnnotationRect,
    noteContent?: string
  ) => void;
  onDeleteAnnotation: (id: string) => void;
  highlightAnnotationId: string | null;
  currentPage: number;
  onPageChange: (page: number) => void;
}

interface ToolbarPosition {
  x: number;
  y: number;
}

interface SelectedTextInfo {
  pageNumber: number;
  text: string;
  rect: AnnotationRect;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  parser,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  highlightAnnotationId,
  currentPage,
  onPageChange,
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [displayPages, setDisplayPages] = useState<{ left: number; right: number }>({ left: 1, right: 2 });
  const [isSinglePage, setIsSinglePage] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition>({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState<SelectedTextInfo | null>(null);
  const [notePanelOpen, setNotePanelOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteAnnotationId, setNoteAnnotationId] = useState<string | null>(null);
  const [pageCanvases, setPageCanvases] = useState<Map<number, HTMLCanvasElement>>(new Map());
  const [pageDataCache, setPageDataCache] = useState<Map<number, { width: number; height: number }>>(new Map());

  const bookRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const checkWidth = () => {
      setIsSinglePage(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (!parser) return;
    const numPages = parser.numPages;
    if (numPages === 0) return;

    if (isSinglePage) {
      setDisplayPages({ left: currentPage, right: currentPage });
    } else {
      if (currentPage % 2 === 0) {
        setDisplayPages({ left: currentPage - 1, right: currentPage });
      } else {
        setDisplayPages({ left: currentPage, right: currentPage + 1 });
      }
    }
  }, [currentPage, isSinglePage, parser]);

  useEffect(() => {
    if (!parser) return;

    const pagesToLoad = new Set<number>();
    pagesToLoad.add(displayPages.left);
    if (!isSinglePage && displayPages.right <= parser.numPages) {
      pagesToLoad.add(displayPages.right);
    }
    if (displayPages.left > 1) pagesToLoad.add(displayPages.left - 1);
    if (displayPages.right < parser.numPages) pagesToLoad.add(displayPages.right + 1);
    if (displayPages.right + 1 < parser.numPages) pagesToLoad.add(displayPages.right + 2);

    for (const pn of pagesToLoad) {
      if (pn < 1 || pn > parser.numPages) continue;
      if (!pageCanvases.has(pn)) {
        parser.renderPage(pn).then((canvas) => {
          if (canvas) {
            setPageCanvases((prev) => {
              const next = new Map(prev);
              next.set(pn, canvas);
              return next;
            });
          }
        });
      }
      if (!pageDataCache.has(pn)) {
        parser.getPageData(pn).then((data) => {
          if (data) {
            setPageDataCache((prev) => {
              const next = new Map(prev);
              next.set(pn, { width: data.width, height: data.height });
              return next;
            });
          }
        });
      }
    }
  }, [displayPages, parser, isSinglePage, pageCanvases, pageDataCache]);

  const goToNextPage = useCallback(() => {
    if (!parser || isFlipping) return;
    const numPages = parser.numPages;
    const step = isSinglePage ? 1 : 2;
    const target = currentPage + step;
    if (target > numPages) return;

    setIsFlipping(true);
    setFlipDirection('next');

    setTimeout(() => {
      onPageChange(Math.min(target, numPages));
      setIsFlipping(false);
    }, 600);
  }, [parser, isFlipping, currentPage, isSinglePage, onPageChange]);

  const goToPrevPage = useCallback(() => {
    if (!parser || isFlipping) return;
    const step = isSinglePage ? 1 : 2;
    const target = currentPage - step;
    if (target < 1) return;

    setIsFlipping(true);
    setFlipDirection('prev');

    setTimeout(() => {
      onPageChange(Math.max(1, target));
      setIsFlipping(false);
    }, 600);
  }, [parser, isFlipping, currentPage, isSinglePage, onPageChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (notePanelOpen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, notePanelOpen]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (notePanelOpen) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setToolbarVisible(false);
      setSelectedText(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) {
      setToolbarVisible(false);
      setSelectedText(null);
      return;
    }

    const target = e.target as HTMLElement;
    const pageContainer = target.closest('[data-page-number]') as HTMLElement | null;
    if (!pageContainer) {
      setToolbarVisible(false);
      setSelectedText(null);
      return;
    }

    const pageNumber = parseInt(pageContainer.dataset.pageNumber || '1', 10);
    const pageRect = pageContainer.getBoundingClientRect();
    const selectionRect = range.getBoundingClientRect();

    const rect: AnnotationRect = {
      x: ((selectionRect.left - pageRect.left) / pageRect.width) * 100,
      y: ((selectionRect.top - pageRect.top) / pageRect.height) * 100,
      width: (selectionRect.width / pageRect.width) * 100,
      height: (selectionRect.height / pageRect.height) * 100,
    };

    setSelectedText({ pageNumber, text, rect });

    setToolbarPos({
      x: selectionRect.left + selectionRect.width / 2,
      y: selectionRect.top - 8,
    });
    setToolbarVisible(true);
  }, [notePanelOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!toolbarVisible) return;
      const target = e.target as HTMLElement;
      if (target.closest('.floating-toolbar') || target.closest('.note-panel')) {
        return;
      }
      setToolbarVisible(false);
      setSelectedText(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [toolbarVisible]);

  const applyAnnotation = useCallback((type: AnnotationType) => {
    if (!selectedText) return;

    if (type === 'note') {
      setNotePanelOpen(true);
      setNoteContent('');
      setNoteAnnotationId(null);
    } else {
      onAddAnnotation(selectedText.pageNumber, type, selectedText.text, selectedText.rect);
      window.getSelection()?.removeAllRanges();
      setToolbarVisible(false);
      setSelectedText(null);
    }
  }, [selectedText, onAddAnnotation]);

  const saveNote = useCallback(() => {
    if (!selectedText || !noteContent.trim()) {
      setNotePanelOpen(false);
      return;
    }
    onAddAnnotation(selectedText.pageNumber, 'note', selectedText.text, selectedText.rect, noteContent.trim());
    window.getSelection()?.removeAllRanges();
    setToolbarVisible(false);
    setSelectedText(null);
    setNotePanelOpen(false);
    setNoteContent('');
    setNoteAnnotationId(null);
  }, [selectedText, noteContent, onAddAnnotation]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    if (annotation.type === 'note') {
      setNotePanelOpen(true);
      setNoteContent(annotation.noteContent || '');
      setNoteAnnotationId(annotation.id);
    }
  }, []);

  const deleteCurrentNoteAnnotation = useCallback(() => {
    if (noteAnnotationId) {
      onDeleteAnnotation(noteAnnotationId);
    }
    setNotePanelOpen(false);
    setNoteContent('');
    setNoteAnnotationId(null);
  }, [noteAnnotationId, onDeleteAnnotation]);

  const closeNotePanel = useCallback(() => {
    setNotePanelOpen(false);
    setNoteContent('');
    setNoteAnnotationId(null);
  }, []);

  const getPageAnnotations = (pageNumber: number): Annotation[] => {
    return annotations.filter((a) => a.pageNumber === pageNumber);
  };

  const renderAnnotations = (pageNumber: number) => {
    const pageAnnotations = getPageAnnotations(pageNumber);

    return pageAnnotations.map((ann) => {
      const isHighlight = ann.type === 'highlight';
      const isUnderline = ann.type === 'underline';
      const isNote = ann.type === 'note';
      const isBlinking = highlightAnnotationId === ann.id;

      if (isHighlight) {
        return (
          <div
            key={ann.id}
            className={`annotation-highlight ${isBlinking ? 'annotation-blink' : ''}`}
            style={{
              left: `${ann.rect.x}%`,
              top: `${ann.rect.y}%`,
              width: `${ann.rect.width}%`,
              height: `${ann.rect.height}%`,
            }}
            onClick={() => handleAnnotationClick(ann)}
          />
        );
      }

      if (isUnderline) {
        return (
          <div
            key={ann.id}
            className={`annotation-underline ${isBlinking ? 'annotation-blink' : ''}`}
            style={{
              left: `${ann.rect.x}%`,
              top: `${ann.rect.y + ann.rect.height - 2}%`,
              width: `${ann.rect.width}%`,
            }}
            onClick={() => handleAnnotationClick(ann)}
          />
        );
      }

      if (isNote) {
        return (
          <div key={ann.id}>
            <div
              className={`annotation-highlight ${isBlinking ? 'annotation-blink' : ''}`}
              style={{
                left: `${ann.rect.x}%`,
                top: `${ann.rect.y}%`,
                width: `${ann.rect.width}%`,
                height: `${ann.rect.height}%`,
                background: 'rgba(96, 165, 250, 0.2)',
              }}
              onClick={() => handleAnnotationClick(ann)}
            />
            <div
              className="annotation-note-marker"
              style={{
                left: `${ann.rect.x + ann.rect.width}%`,
                top: `${ann.rect.y}%`,
              }}
              onClick={() => handleAnnotationClick(ann)}
            >
              💬
            </div>
          </div>
        );
      }

      return null;
    });
  };

  const renderPage = (pageNumber: number, side: 'left' | 'right') => {
    if (!parser || pageNumber < 1 || pageNumber > parser.numPages) {
      return (
        <div className="page-face" style={{ background: 'rgba(255,255,255,0.5)' }}>
          <div className="page-back">空白页</div>
        </div>
      );
    }

    const canvas = pageCanvases.get(pageNumber);
    const pageData = pageDataCache.get(pageNumber);

    const isFlippingPage = isFlipping && (
      (flipDirection === 'next' && side === 'left') ||
      (flipDirection === 'prev' && side === 'right')
    );

    const flipClass = isFlippingPage
      ? side === 'left' ? 'page-flip-left' : 'page-flip-right'
      : '';

    return (
      <div
        className={`page-wrapper ${flipClass}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="page-face"
          data-page-number={pageNumber}
          ref={(el) => {
            if (el) pageContainerRefs.current.set(pageNumber, el);
          }}
          onMouseUp={handleMouseUp}
          style={{
            aspectRatio: pageData ? `${pageData.width} / ${pageData.height}` : '3 / 4',
          }}
        >
          {canvas ? (
            <canvas
              ref={(c) => {
                if (c) {
                  const ctx = c.getContext('2d');
                  if (ctx && canvas.width > 0) {
                    c.width = canvas.width;
                    c.height = canvas.height;
                    ctx.drawImage(canvas, 0, 0);
                  }
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c4b99a',
                fontSize: '14px',
              }}
            >
              加载中...
            </div>
          )}
          <div className="annotations-layer">
            {renderAnnotations(pageNumber)}
          </div>
        </div>
        <div className="page-back">
          <span>第 {pageNumber} 页 背面</span>
        </div>
      </div>
    );
  };

  if (!parser || parser.numPages === 0) {
    return (
      <div className="book-area">
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">正在加载PDF...</div>
        </div>
      </div>
    );
  }

  const numPages = parser.numPages;

  return (
    <div className="book-area" ref={bookRef}>
      <div className={`book-container ${isSinglePage ? 'single-page' : ''}`}>
        {!isSinglePage && (
          <>
            {renderPage(displayPages.left, 'left')}
            <div className="book-spine">
              <div className="book-spine-line" />
            </div>
            {displayPages.right <= numPages ? (
              renderPage(displayPages.right, 'right')
            ) : (
              <div className="page-wrapper" style={{ visibility: 'hidden' }} />
            )}
          </>
        )}

        {isSinglePage && (
          <div style={{ width: '80%', position: 'relative' }}>
            <div
              data-page-number={currentPage}
              className="page-face"
              onMouseUp={handleMouseUp}
              style={{
                position: 'relative',
                aspectRatio: pageDataCache.get(currentPage)
                  ? `${pageDataCache.get(currentPage)!.width} / ${pageDataCache.get(currentPage)!.height}`
                  : '3 / 4',
              }}
            >
              {pageCanvases.get(currentPage) ? (
                <canvas
                  ref={(c) => {
                    const canvas = pageCanvases.get(currentPage);
                    if (c && canvas) {
                      const ctx = c.getContext('2d');
                      if (ctx) {
                        c.width = canvas.width;
                        c.height = canvas.height;
                        ctx.drawImage(canvas, 0, 0);
                      }
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c4b99a',
                  }}
                >
                  加载中...
                </div>
              )}
              <div className="annotations-layer">
                {renderAnnotations(currentPage)}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        className="page-nav page-nav-left"
        onClick={goToPrevPage}
        disabled={currentPage <= 1 || isFlipping}
        aria-label="上一页"
      >
        ◀
      </button>
      <button
        className="page-nav page-nav-right"
        onClick={goToNextPage}
        disabled={currentPage >= numPages || isFlipping}
        aria-label="下一页"
      >
        ▶
      </button>

      <div className="page-indicator">
        {currentPage} / {numPages}
      </div>

      {toolbarVisible && selectedText && (
        <div
          className="floating-toolbar"
          style={{
            left: `${toolbarPos.x}px`,
            top: `${toolbarPos.y - 44}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            className="toolbar-btn toolbar-btn-highlight"
            onClick={() => applyAnnotation('highlight')}
            title="高亮"
          >
            🖍️
          </button>
          <button
            className="toolbar-btn toolbar-btn-underline"
            onClick={() => applyAnnotation('underline')}
            title="下划线"
          >
            <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--color-underline)', textDecorationThickness: '2px' }}>
              A
            </span>
          </button>
          <button
            className="toolbar-btn toolbar-btn-note"
            onClick={() => applyAnnotation('note')}
            title="笔记"
          >
            💬
          </button>
        </div>
      )}

      <div className={`note-panel ${notePanelOpen ? 'open' : ''}`}>
        <div className="note-panel-header">
          <span className="note-panel-title">
            {noteAnnotationId ? '编辑笔记' : '添加笔记'}
          </span>
          <button className="note-panel-close" onClick={closeNotePanel}>
            ✕
          </button>
        </div>
        {selectedText && (
          <div className="note-text-preview">{selectedText.text}</div>
        )}
        <textarea
          className="note-textarea"
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="在这里写下你的想法..."
          autoFocus
        />
        <div className="note-actions">
          <button className="note-btn note-btn-save" onClick={saveNote}>
            保存
          </button>
          <button className="note-btn note-btn-delete" onClick={deleteCurrentNoteAnnotation}>
            {noteAnnotationId ? '删除' : '取消'}
          </button>
        </div>
      </div>
    </div>
  );
};
