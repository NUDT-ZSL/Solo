import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

type ExportFormat = 'png' | 'pdf';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      generatePreview();
    }
  }, [isOpen, canvasRef]);

  const generatePreview = async () => {
    if (!canvasRef.current) return;
    
    setIsGeneratingPreview(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 0.5,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('预览生成失败:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      if (format === 'png') {
        canvas.toBlob((blob) => {
          if (blob) {
            const fileName = `magazine-cover-${Date.now()}.png`;
            saveAs(blob, fileName);
            onClose();
          }
        }, 'image/png');
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        const fileName = `magazine-cover-${Date.now()}.pdf`;
        pdf.save(fileName);
        onClose();
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">导出封面</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="export-preview">
            {isGeneratingPreview ? (
              <div style={{ color: '#a0a0b0', fontSize: 14 }}>生成预览中...</div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="预览" />
            ) : (
              <div style={{ color: '#a0a0b0', fontSize: 14 }}>暂无预览</div>
            )}
          </div>

          <div className="export-options">
            <div className="form-label" style={{ marginBottom: 8, display: 'block' }}>
              选择导出格式
            </div>
            <div className="format-buttons">
              <button
                className={`format-btn ${format === 'png' ? 'active' : ''}`}
                onClick={() => setFormat('png')}
              >
                <span className="format-icon">🖼️</span>
                <span>PNG 图片</span>
                <span style={{ fontSize: 11, color: '#a0a0b0' }}>高清位图</span>
              </button>
              <button
                className={`format-btn ${format === 'pdf' ? 'active' : ''}`}
                onClick={() => setFormat('pdf')}
              >
                <span className="format-icon">📄</span>
                <span>PDF 文档</span>
                <span style={{ fontSize: 11, color: '#a0a0b0' }}>适合打印</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || !previewUrl}
          >
            {isExporting ? '导出中...' : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  );
};
