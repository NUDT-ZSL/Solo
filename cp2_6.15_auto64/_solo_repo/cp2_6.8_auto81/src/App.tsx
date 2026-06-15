import { useCallback, useRef, useState } from 'react';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAppStore } from '@/store';
import { TopToolbar } from '@/components/TopToolbar';
import { AnnotationToolbar } from '@/components/AnnotationToolbar';
import { ThumbnailPanel } from '@/components/ThumbnailPanel';
import { PDFViewer, getExportCanvas, PAGE_WIDTH, PAGE_HEIGHT } from '@/components/PDFViewer';
import { VersionCompare } from '@/components/VersionCompare';
import { SAMPLE_PAGE_COUNT } from '@/utils/samplePDF';
import { exportPageToPNG } from '@/utils/canvasUtils';

export default function App() {
  const { send } = useWebSocket();
  const [pageCanvasRef, setPageCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const wsSendRef = useRef(send);
  wsSendRef.current = send;

  const showThumbnails = useAppStore((s) => s.showThumbnails);
  const setShowThumbnails = useAppStore((s) => s.setShowThumbnails);
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const annotations = useAppStore((s) => s.annotations);

  const handlePageCanvasReady = useCallback((canvas: HTMLCanvasElement, pageNumber: number) => {
    if (pageNumber === currentPage) {
      setPageCanvasRef(canvas);
    }
  }, [currentPage]);

  const handleExport = useCallback(() => {
    const baseCanvas = getExportCanvas(currentPage);
    if (!baseCanvas) return;
    const dataUrl = exportPageToPNG(baseCanvas, annotations, currentPage);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `page-${currentPage}-annotated.png`;
    link.href = dataUrl;
    link.click();
  }, [currentPage, annotations]);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < SAMPLE_PAGE_COUNT) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="app">
      <TopToolbar wsSend={send} onExport={handleExport} />

      <div className="main-layout">
        <div className={`thumb-wrapper ${showThumbnails ? 'expanded' : ''}`}>
          <button
            className="hamburger-btn"
            onClick={() => setShowThumbnails(!showThumbnails)}
            title={showThumbnails ? '收起缩略图' : '展开缩略图'}
          >
            <Menu size={20} />
          </button>
          <ThumbnailPanel numPages={SAMPLE_PAGE_COUNT} />
        </div>

        <div className="viewer-area">
          <button
            className="page-nav prev-page"
            onClick={goToPrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={28} />
          </button>

          <PDFViewer
            wsSend={send}
            onPageCanvasReady={handlePageCanvasReady}
          />

          <button
            className="page-nav next-page"
            onClick={goToNextPage}
            disabled={currentPage === SAMPLE_PAGE_COUNT}
          >
            <ChevronRight size={28} />
          </button>
        </div>

        <AnnotationToolbar />
      </div>

      <VersionCompare />
    </div>
  );
}
