import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface DocumentPreviewProps {
  content: string;
  onClose: () => void;
}

function DocumentPreview({ content, onClose }: DocumentPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleCopy = async () => {
    if (contentRef.current) {
      await navigator.clipboard.writeText(contentRef.current.innerHTML);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .doc-preview-actions { display: none !important; }
          .doc-preview-close { display: none !important; }
          .doc-preview-overlay { background: #fff !important; position: static !important; }
          .doc-preview-container { box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <div
        className="doc-preview-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
        onClick={onClose}
      >
        <div
          className="doc-preview-container"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 8,
            width: '90vw',
            maxWidth: 800,
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            padding: '40px 48px',
          }}
        >
          <button
            className="doc-preview-close"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#95a5a6',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>

          <div
            ref={contentRef}
            style={{
              fontFamily: '"Georgia", "Times New Roman", serif',
              color: '#2C3E50',
              lineHeight: 1.8,
              fontSize: 16,
            }}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          <div
            className="doc-preview-actions"
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px solid #ecf0f1',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 20px',
                border: '1px solid #bdc3c7',
                borderRadius: 6,
                background: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                color: '#2C3E50',
              }}
            >
              复制到剪贴板
            </button>
            <button
              onClick={handleDownloadPDF}
              style={{
                padding: '8px 20px',
                border: '1px solid #bdc3c7',
                borderRadius: 6,
                background: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                color: '#2C3E50',
              }}
            >
              下载PDF
            </button>
            <button
              onClick={handleFullscreen}
              style={{
                padding: '8px 20px',
                border: '1px solid #bdc3c7',
                borderRadius: 6,
                background: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                color: '#2C3E50',
              }}
            >
              全屏切换
            </button>
          </div>

          <style>{`
            .doc-preview-container h1 { color: #2C3E50; font-size: 28px; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-top: 24px; }
            .doc-preview-container h2 { color: #2C3E50; font-size: 22px; margin-top: 20px; }
            .doc-preview-container h3 { color: #2C3E50; font-size: 18px; margin-top: 16px; }
            .doc-preview-container p { margin: 12px 0; }
            .doc-preview-container ul, .doc-preview-container ol { margin: 12px 0; padding-left: 24px; }
            .doc-preview-container blockquote { border-left: 4px solid #2C3E50; padding-left: 16px; color: #7f8c8d; margin: 16px 0; }
            .doc-preview-container code { background: #ecf0f1; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
            .doc-preview-container pre { background: #2c3e50; color: #ecf0f1; padding: 16px; border-radius: 6px; overflow-x: auto; }
            .doc-preview-container pre code { background: none; padding: 0; color: inherit; }
          `}</style>
        </div>
      </div>
    </>
  );
}

export default DocumentPreview;
