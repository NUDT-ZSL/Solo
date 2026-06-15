import React, { useState } from 'react';
import { ExportFormat, ExportProgress, exportAsPNG, exportAsGIF, exportAsVideo, downloadBlob } from '../utils/exporter';

interface ExportModalProps {
  canvas: HTMLCanvasElement | null;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ canvas, onClose }) => {
  const [progress, setProgress] = useState<ExportProgress>({ percent: 0, stage: '' });
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (!canvas || exporting) return;
    setExporting(true);

    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'png':
          blob = await exportAsPNG(canvas, setProgress);
          filename = 'codecanvas.png';
          break;
        case 'gif':
          blob = await exportAsGIF(canvas, setProgress, 15, 3);
          filename = 'codecanvas.gif';
          break;
        case 'video':
          blob = await exportAsVideo(canvas, setProgress, 30, 3);
          filename = 'codecanvas.webm';
          break;
      }

      downloadBlob(blob, filename);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
      setProgress({ percent: 0, stage: '' });
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1f1f3a',
          borderRadius: '20px',
          width: '400px',
          padding: '32px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.1s ease-out',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        <h3 style={{ color: '#e5e7f0', fontSize: '18px', marginBottom: '24px', letterSpacing: '0.5px' }}>
          导出
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => handleExport('png')}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #374151',
              background: '#2d2d4a',
              color: '#e5e7f0',
              fontSize: '14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease-out, transform 0.1s ease-out',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (!exporting) (e.currentTarget as HTMLElement).style.background = '#3d3d5a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2d2d4a';
            }}
          >
            导出为 PNG
          </button>

          <button
            onClick={() => handleExport('gif')}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #374151',
              background: '#2d2d4a',
              color: '#e5e7f0',
              fontSize: '14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease-out, transform 0.1s ease-out',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (!exporting) (e.currentTarget as HTMLElement).style.background = '#3d3d5a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2d2d4a';
            }}
          >
            导出为 GIF (15fps, 3s)
          </button>

          <button
            onClick={() => handleExport('video')}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #374151',
              background: '#2d2d4a',
              color: '#e5e7f0',
              fontSize: '14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease-out, transform 0.1s ease-out',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (!exporting) (e.currentTarget as HTMLElement).style.background = '#3d3d5a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2d2d4a';
            }}
          >
            导出为视频 (VP9, 30fps)
          </button>
        </div>

        {exporting && (
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              <span>{progress.stage}</span>
              <span>{progress.percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: '#374151',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  background: '#22c55e',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease-out',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportModal;
