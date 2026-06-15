import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { generateSamplePage, A4_ASPECT_RATIO } from '@/utils/samplePDF';

interface ThumbnailPanelProps {
  numPages: number;
}

export function ThumbnailPanel({ numPages }: ThumbnailPanelProps) {
  const showThumbnails = useAppStore((s) => s.showThumbnails);
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    thumbRefs.current.forEach((canvas, i) => {
      if (canvas) {
        canvas.width = 100;
        canvas.height = Math.floor(100 * A4_ASPECT_RATIO);
        generateSamplePage(canvas, i + 1);
      }
    });
  }, [numPages, showThumbnails]);

  if (!showThumbnails) return null;

  return (
    <div className="thumbnail-panel">
      <div className="thumbnail-list">
        {Array.from({ length: numPages }).map((_, i) => (
          <div
            key={i}
            className={`thumbnail-item ${currentPage === i + 1 ? 'thumbnail-active' : ''}`}
            onClick={() => setCurrentPage(i + 1)}
          >
            <canvas
              ref={(el) => { thumbRefs.current[i] = el; }}
              className="thumbnail-canvas"
            />
            <span className="thumbnail-label">第 {i + 1} 页</span>
          </div>
        ))}
      </div>
    </div>
  );
}
