import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DocumentPreviewProps {
  content: string;
  onClose: () => void;
}

function DocumentPreview({ content, onClose }: DocumentPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const extractTitle = (md: string): string => {
    const match = md.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Document';
  };

  const inlineStyles = (element: Element): void => {
    const computed = window.getComputedStyle(element);
    const styleProps = [
      'font-family', 'font-size', 'font-weight', 'font-style',
      'color', 'background-color',
      'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'line-height', 'text-align', 'text-decoration',
      'border-top', 'border-right', 'border-bottom', 'border-left',
      'border-radius',
      'list-style-type', 'list-style-position',
    ];
    let inlineStyle = '';
    for (const prop of styleProps) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== 'initial') {
        inlineStyle += `${prop}: ${value}; `;
      }
    }
    if (inlineStyle) {
      element.setAttribute('style', inlineStyle);
    }
    for (const child of element.children) {
      inlineStyles(child);
    }
  };

  const handleCopy = async () => {
    if (!contentRef.current) return;

    const clone = contentRef.current.cloneNode(true) as HTMLElement;
    inlineStyles(clone);

    const htmlContent = clone.innerHTML;
    const plainText = contentRef.current.innerText;

    try {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([clipboardItem]);
    } catch {
      await navigator.clipboard.writeText(plainText);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    setIsGenerating(true);

    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 20;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pdfHeight - margin * 2;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const scaledImgHeight = imgHeight * ratio;

      if (scaledImgHeight <= contentHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, scaledImgHeight);
      } else {
        const pageHeightPx = contentHeight / ratio;
        let heightLeft = imgHeight;
        let position = 0;
        let page = 0;

        while (heightLeft > 0) {
          const srcY = page * pageHeightPx;
          const srcHeight = Math.min(pageHeightPx, heightLeft);
          const destHeight = srcHeight * ratio;

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = imgWidth;
          tempCanvas.height = srcHeight;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.fillStyle = '#fff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, srcY, imgWidth, srcHeight, 0, 0, imgWidth, srcHeight);
            const pageImgData = tempCanvas.toDataURL('image/png');

            if (page > 0) {
              pdf.addPage();
            }
            pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, destHeight);
          }

          heightLeft -= pageHeightPx;
          position -= contentHeight;
          page++;
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      pdf.save(`提案_${timestamp}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const title = extractTitle(content);

  const printStyle = `
    @media print {
      @page {
        size: A4;
        margin: 25mm 20mm 25mm 20mm;
        @top-center {
          content: "${title}";
          font-family: Georgia, "Times New Roman", serif;
          font-size: 10pt;
          color: #7f8c8d;
          border-bottom: 1px solid #ddd;
          padding-bottom: 4mm;
        }
        @bottom-center {
          content: "Page " counter(page) " of " counter(pages);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 9pt;
          color: #7f8c8d;
          border-top: 1px solid #ddd;
          padding-top: 4mm;
        }
      }
      body * {
        visibility: hidden;
      }
      .doc-print-area,
      .doc-print-area * {
        visibility: visible;
      }
      .doc-print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .doc-preview-actions { display: none !important; }
      .doc-preview-close { display: none !important; }
      .doc-preview-overlay { background: #fff !important; position: static !important; }
      .doc-preview-container {
        box-shadow: none !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        width: 100% !important;
      }
      .doc-content h1 { page-break-before: always; }
      .doc-content h1:first-of-type { page-break-before: avoid; }
      .doc-content h2 { page-break-after: avoid; }
      .doc-content h3 { page-break-after: avoid; }
      .doc-content pre { page-break-inside: avoid; }
      .doc-content blockquote { page-break-inside: avoid; }
      .doc-content table { page-break-inside: avoid; }
      .doc-content img { page-break-inside: avoid; }
      .doc-content ul, .doc-content ol { page-break-inside: avoid; }
    }
  `;

  return (
    <>
      <style>{printStyle}</style>

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
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
      >
        <div
          className={`doc-preview-container doc-print-area`}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: isFullscreen ? 0 : 8,
            width: isFullscreen ? '100vw' : '90vw',
            height: isFullscreen ? '100vh' : 'auto',
            maxWidth: isFullscreen ? '100vw' : 800,
            maxHeight: isFullscreen ? '100vh' : '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: isFullscreen ? 'none' : '0 8px 32px rgba(0,0,0,0.2)',
            padding: isFullscreen ? '60px 80px' : '40px 48px',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
          }}
        >
          <button
            className="doc-preview-close"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: isFullscreen ? 20 : 12,
              right: isFullscreen ? 24 : 12,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#95a5a6',
              lineHeight: 1,
              padding: 6,
              zIndex: 10,
              transition: 'color 0.2s, background 0.2s',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#2C3E50';
              e.currentTarget.style.background = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#95a5a6';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✕
          </button>

          <div
            ref={contentRef}
            className="doc-content"
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
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#95a5a6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#bdc3c7';
              }}
            >
              复制到剪贴板
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              style={{
                padding: '8px 20px',
                border: '1px solid #bdc3c7',
                borderRadius: 6,
                background: '#fff',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: 13,
                color: '#2C3E50',
                transition: 'all 0.2s',
                opacity: isGenerating ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#95a5a6';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#bdc3c7';
              }}
            >
              {isGenerating ? '生成中...' : '下载PDF'}
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
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#95a5a6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#bdc3c7';
              }}
            >
              {isFullscreen ? '退出全屏' : '全屏切换'}
            </button>
          </div>

          <style>{`
            .doc-content h1 { color: #2C3E50; font-size: 28px; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
            .doc-content h2 { color: #2C3E50; font-size: 22px; margin-top: 20px; margin-bottom: 12px; font-weight: 600; }
            .doc-content h3 { color: #2C3E50; font-size: 18px; margin-top: 16px; margin-bottom: 10px; font-weight: 600; }
            .doc-content h4 { color: #2C3E50; font-size: 16px; margin-top: 14px; margin-bottom: 8px; font-weight: 600; }
            .doc-content p { margin: 12px 0; line-height: 1.8; }
            .doc-content ul, .doc-content ol { margin: 12px 0; padding-left: 24px; line-height: 1.8; }
            .doc-content li { margin: 4px 0; }
            .doc-content blockquote { border-left: 4px solid #2C3E50; padding-left: 16px; color: #7f8c8d; margin: 16px 0; font-style: italic; background: #f8f9fa; padding-top: 8px; padding-bottom: 8px; padding-right: 12px; border-radius: 0 4px 4px 0; }
            .doc-content code { background: #ecf0f1; padding: 2px 6px; border-radius: 3px; font-size: 14px; font-family: "Courier New", Courier, monospace; }
            .doc-content pre { background: #2c3e50; color: #ecf0f1; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 16px 0; }
            .doc-content pre code { background: none; padding: 0; color: inherit; font-size: 13px; }
            .doc-content a { color: #3498db; text-decoration: none; }
            .doc-content a:hover { text-decoration: underline; }
            .doc-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            .doc-content th, .doc-content td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
            .doc-content th { background: #f8f9fa; font-weight: 600; }
            .doc-content hr { border: none; border-top: 1px solid #ecf0f1; margin: 24px 0; }
            .doc-content img { max-width: 100%; height: auto; }
            .doc-content strong { font-weight: 700; }
            .doc-content em { font-style: italic; }
          `}</style>
        </div>
      </div>
    </>
  );
}

export default DocumentPreview;
