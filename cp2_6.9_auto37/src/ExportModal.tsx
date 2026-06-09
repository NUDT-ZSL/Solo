import React, { useState, useEffect, useMemo } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  svgElement: SVGSVGElement | null;
}

const formatDate = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, svgElement }) => {
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setClosing(false);
      setCopied(false);
    }
  }, [isOpen]);

  const svgCode = useMemo(() => {
    if (!svgElement) return '';
    const serializer = new XMLSerializer();
    const cloned = svgElement.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(cloned);
  }, [svgElement, isOpen]);

  const previewSvg = useMemo(() => {
    if (!svgElement) return null;
    const serializer = new XMLSerializer();
    const cloned = svgElement.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return serializer.serializeToString(cloned);
  }, [svgElement, isOpen]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = svgCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!svgCode) return;
    const startTime = performance.now();
    const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `art_${formatDate()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const elapsed = performance.now() - startTime;
    if (elapsed > 200) {
      console.warn(`SVG export took ${elapsed.toFixed(1)}ms (target: <200ms)`);
    }

    const hint = document.getElementById('export-hint');
    if (hint) {
      hint.textContent = 'SVG 导出成功！';
      hint.classList.add('show');
      setTimeout(() => hint.classList.remove('show'), 2000);
    }

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`export-modal-overlay ${closing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">导出 SVG</span>
          <button className="modal-close" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="preview-section">
            <span className="preview-label">预览 Preview</span>
            <div className="preview-box">
              {previewSvg && (
                <svg
                  viewBox={svgElement?.getAttribute('viewBox') || '0 0 528 528'}
                  xmlns="http://www.w3.org/2000/svg"
                  dangerouslySetInnerHTML={{ __html: previewSvg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>|<\/svg>/g, '') }}
                />
              )}
            </div>
          </div>

          <div className="code-section">
            <div className="code-header">
              <span className="code-label">SVG 代码</span>
              <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '已复制 ✓' : '复制代码'}
              </button>
            </div>
            <pre className="code-box">{svgCode}</pre>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleClose}>
            取消
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDownload}>
            💾 下载 SVG
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
