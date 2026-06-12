import React, { useState, useCallback, useMemo, memo } from 'react';
import { Shape } from '../types';
import { generateFullSvg, exportAsZip, copyToClipboard, downloadBlob } from '../utils/exportUtils';

interface ExportDialogProps {
  shapes: Shape[];
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = memo(function ExportDialog({
  shapes,
  onClose,
}) {
  const [format, setFormat] = useState<'svg' | 'png'>('svg');
  const [scale, setScale] = useState<1 | 2 | 4>(2);
  const [includeSvg, setIncludeSvg] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const svgContent = useMemo(() => {
    return generateFullSvg(shapes);
  }, [shapes]);

  const handleCopySvg = useCallback(async () => {
    try {
      await copyToClipboard(svgContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportStatus('复制失败，请手动复制');
    }
  }, [svgContent]);

  const handleExport = useCallback(async () => {
    if (shapes.length === 0) {
      setExportStatus('请先添加形状再导出');
      return;
    }

    setIsExporting(true);
    setExportStatus(null);

    try {
      if (format === 'svg') {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        downloadBlob(blob, 'logolab_design.svg');
        setExportStatus('SVG导出成功！');
      } else {
        const zipBlob = await exportAsZip(shapes, { scale, includeSvg });
        downloadBlob(zipBlob, `logolab_export_${scale}x.zip`);
        setExportStatus(`PNG ${scale}x导出成功！`);
      }
    } catch {
      setExportStatus('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [format, scale, includeSvg, shapes, svgContent]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>导出设计</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {format === 'svg' ? (
            <>
              <div className="export-options">
                <div className="option-group">
                  <label>导出格式</label>
                  <div className="option-buttons">
                    <button
                      className={`option-btn ${format === 'svg' ? 'active' : ''}`}
                      onClick={() => setFormat('svg')}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="14 3 14 9 20 9" />
                      </svg>
                      SVG
                    </button>
                    <button
                      className={`option-btn ${format === 'png' ? 'active' : ''}`}
                      onClick={() => setFormat('png')}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      PNG
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '8px' }}>
                  SVG代码预览
                </div>
                <div className="code-block">
                  <button className="copy-btn" onClick={handleCopySvg}>
                    {copied ? '已复制!' : '复制代码'}
                  </button>
                  <pre>{svgContent}</pre>
                </div>
              </div>
            </>
          ) : (
            <div className="export-options">
              <div className="option-group">
                <label>导出格式</label>
                <div className="option-buttons">
                  <button
                    className={`option-btn ${format === 'svg' ? 'active' : ''}`}
                    onClick={() => setFormat('svg')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="14 3 14 9 20 9" />
                    </svg>
                    SVG
                  </button>
                  <button
                    className={`option-btn ${format === 'png' ? 'active' : ''}`}
                    onClick={() => setFormat('png')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    PNG
                  </button>
                </div>
              </div>
              
              <div className="option-group">
                <label>缩放比例</label>
                <div className="option-buttons">
                  {([1, 2, 4] as const).map((s) => (
                    <button
                      key={s}
                      className={`option-btn ${scale === s ? 'active' : ''}`}
                      onClick={() => setScale(s)}
                    >
                      <span style={{ fontSize: '16px', fontWeight: '700' }}>{s}x</span>
                      <span>{s === 1 ? '标准' : s === 2 ? '高清' : '超高清'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeSvg}
                    onChange={(e) => setIncludeSvg(e.target.checked)}
                  />
                  同时包含SVG源文件
                </label>
              </div>

              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                提示：PNG导出时会自动考虑设备像素比，确保高DPI屏幕显示清晰
              </div>
            </div>
          )}

          {exportStatus && (
            <div className="export-status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {exportStatus}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || shapes.length === 0}
          >
            {isExporting ? '导出中...' : format === 'svg' ? '下载SVG' : `下载PNG ${scale}x`}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ExportDialog;
