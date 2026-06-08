import { useState, useEffect, useRef, useCallback } from 'react';
import { BookEngine } from './BookEngine';
import { AnnotationService } from './AnnotationService';
import { useReaderStore } from './store';
import ReaderPanel from './ReaderPanel';
import StickyNoteComponent from './StickyNoteComponent';
import type { BookData, HighlightColor } from './types';
import bookDataJson from './data/sample-book.json';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BookEngine | null>(null);
  const annotationServiceRef = useRef<AnnotationService>(new AnnotationService());
  const autoFlipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [highlightMode, setHighlightMode] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; start: number; end: number } | null>(null);

  const {
    pages,
    currentPage,
    totalPages,
    readingTime,
    fontSize,
    highlightColor,
    stickyNotes,
    autoFlip,
    autoFlipInterval,
    isReading,
    setPages,
    setBookInfo,
    setCurrentPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    setReadingTime,
    incrementReadingTime,
    setIsReading,
    setHighlights,
    setStickyNotes,
    setIsFlipping,
  } = useReaderStore();

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    const engine = new BookEngine({
      canvas: canvasRef.current,
      pageWidth: pageDimensions.width,
      pageHeight: pageDimensions.height,
      onFlipComplete: (direction) => {
        setIsFlipping(false);
        if (direction === 'next') {
          const nextPageNum = Math.min(currentPage + 1, totalPages - 1);
          setCurrentPage(nextPageNum);
          annotationServiceRef.current.updateProgress(nextPageNum, totalPages);
        } else {
          const prevPageNum = Math.max(currentPage - 1, 0);
          setCurrentPage(prevPageNum);
          annotationServiceRef.current.updateProgress(prevPageNum, totalPages);
        }
      },
      onCurrentPageChange: (page) => {
        setCurrentPage(page);
        annotationServiceRef.current.updateProgress(page, totalPages);
      },
    });
    engineRef.current = engine;
    if (pages.length > 0) {
      engine.loadPages(pages);
      engine.goToPage(currentPage);
    }
  }, [pageDimensions, currentPage, totalPages, pages, setCurrentPage, setIsFlipping]);

  useEffect(() => {
    const bookData = bookDataJson as BookData;
    setPages(bookData.pages);
    setBookInfo(bookData.title, bookData.author);
    annotationServiceRef.current.updateProgress(0, bookData.pages.length);

    const savedProgress = annotationServiceRef.current.getProgress();
    if (savedProgress.totalPages === bookData.pages.length) {
      setCurrentPage(savedProgress.currentPage);
      setReadingTime(savedProgress.totalReadingTime);
    }

    const savedHighlights = annotationServiceRef.current.getAllHighlights();
    if (savedHighlights.length > 0) setHighlights(savedHighlights);
    const savedNotes = annotationServiceRef.current.getAllStickyNotes();
    if (savedNotes.length > 0) setStickyNotes(savedNotes);

    setIsLoaded(true);
  }, [setPages, setBookInfo, setCurrentPage, setReadingTime, setHighlights, setStickyNotes]);

  useEffect(() => {
    if (isLoaded && pages.length > 0) {
      initEngine();
    }
    return () => {
      engineRef.current?.destroy();
    };
  }, [isLoaded, pages, initEngine]);

  useEffect(() => {
    const handleResize = () => {
      if (!bookContainerRef.current) return;
      const container = bookContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const a4Ratio = 595 / 842;
      let pageW: number;
      let pageH: number;
      if (containerWidth / containerHeight > a4Ratio) {
        pageH = Math.min(containerHeight - 40, 842);
        pageW = pageH * a4Ratio;
      } else {
        pageW = Math.min(containerWidth - 40, 595);
        pageH = pageW / a4Ratio;
      }
      setPageDimensions({ width: Math.floor(pageW), height: Math.floor(pageH) });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setFontSize(fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    if (isReading) {
      annotationServiceRef.current.startTimer();
      readingTimerRef.current = setInterval(() => {
        incrementReadingTime();
      }, 1000);
    } else {
      annotationServiceRef.current.stopTimer();
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
        readingTimerRef.current = null;
      }
    }
    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
    };
  }, [isReading, incrementReadingTime]);

  useEffect(() => {
    if (autoFlip) {
      autoFlipTimerRef.current = setInterval(() => {
        if (currentPage < totalPages - 1) {
          handleNextPage();
        } else {
          useReaderStore.getState().setAutoFlip(false);
        }
      }, autoFlipInterval * 1000);
    } else {
      if (autoFlipTimerRef.current) {
        clearInterval(autoFlipTimerRef.current);
        autoFlipTimerRef.current = null;
      }
    }
    return () => {
      if (autoFlipTimerRef.current) {
        clearInterval(autoFlipTimerRef.current);
      }
    };
  }, [autoFlip, autoFlipInterval, currentPage, totalPages]);

  const handleNextPage = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.flipTo('next');
    }
  }, []);

  const handlePrevPage = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.flipTo('prev');
    }
  }, []);

  const handleGoToFirst = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.goToPage(0);
      setCurrentPage(0);
      annotationServiceRef.current.updateProgress(0, totalPages);
    }
  }, [totalPages, setCurrentPage]);

  const handleGoToLast = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.goToPage(totalPages - 1);
      setCurrentPage(totalPages - 1);
      annotationServiceRef.current.updateProgress(totalPages - 1, totalPages);
    }
  }, [totalPages, setCurrentPage]);

  const handleAddStickyNote = useCallback(
    (pageId: number) => {
      const bookPageEl = document.querySelector('.book-page-area');
      if (!bookPageEl) return;
      const rect = bookPageEl.getBoundingClientRect();
      const x = rect.right - 180 + Math.random() * 40;
      const y = rect.top + 40 + Math.random() * 60;
      const note = annotationServiceRef.current.addStickyNote(pageId, x, y, '');
      useReaderStore.getState().addStickyNote(note);
    },
    []
  );

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionInfo(null);
      return;
    }
    const text = selection.toString().trim();
    const range = selection.getRangeAt(0);
    setSelectionInfo({
      text,
      start: 0,
      end: text.length,
    });
  }, []);

  const handleHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selectionInfo) return;
      const highlight = annotationServiceRef.current.addHighlight(
        currentPage + 1,
        selectionInfo.start,
        selectionInfo.end,
        color,
        selectionInfo.text
      );
      useReaderStore.getState().addHighlight(highlight);
      setSelectionInfo(null);
      window.getSelection()?.removeAllRanges();
    },
    [selectionInfo, currentPage]
  );

  const pageNotes = stickyNotes.filter((n) => n.pageId === currentPage + 1);

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-book">
          <div className="loading-page" />
          <div className="loading-page" />
        </div>
        <p className="loading-text">翻开书页...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="wooden-bg" />

      <div className="main-layout">
        <ReaderPanel
          annotationService={annotationServiceRef.current}
          onGoToFirst={handleGoToFirst}
          onGoToLast={handleGoToLast}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          onAddStickyNote={handleAddStickyNote}
        />

        <div className="book-area" ref={bookContainerRef}>
          <div className="book-page-area" style={{ width: pageDimensions.width, height: pageDimensions.height }}>
            <canvas
              ref={canvasRef}
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
            />
          </div>

          <div className="page-click-zone left" onClick={handlePrevPage} />
          <div className="page-click-zone right" onClick={handleNextPage} />
        </div>

        {pageNotes.map((note) => (
          <StickyNoteComponent
            key={note.id}
            note={note}
            annotationService={annotationServiceRef.current}
          />
        ))}

        {selectionInfo && (
          <div className="highlight-popup">
            <span className="highlight-popup-text">标注选中文字</span>
            <div className="highlight-color-options">
              {([
                { color: 'gold' as HighlightColor, label: '金黄', cls: 'bg-amber-400' },
                { color: 'blue' as HighlightColor, label: '淡蓝', cls: 'bg-sky-300' },
                { color: 'green' as HighlightColor, label: '浅绿', cls: 'bg-emerald-300' },
              ]).map((opt) => (
                <button
                  key={opt.color}
                  className={`highlight-color-btn ${opt.cls}`}
                  onClick={() => handleHighlight(opt.color)}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mobile-bottom-nav">
        <button className="mobile-nav-btn" onClick={handleGoToFirst}>
          首
        </button>
        <button className="mobile-nav-btn" onClick={handlePrevPage}>
          ←
        </button>
        <span className="mobile-page-info">
          {currentPage + 1}/{totalPages}
        </span>
        <button className="mobile-nav-btn" onClick={handleNextPage}>
          →
        </button>
        <button className="mobile-nav-btn" onClick={handleGoToLast}>
          末
        </button>
      </div>
    </div>
  );
}
