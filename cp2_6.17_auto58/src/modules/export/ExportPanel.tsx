import React, { useState } from 'react';

export type ScrollStyle = 'plain' | 'vintage' | 'red';

export interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export interface ExportOptions {
  scrollStyle: ScrollStyle;
  showSeal: boolean;
  sealText: string;
}

const SCROLL_STYLES: { key: ScrollStyle; label: string; className: string }[] = [
  { key: 'plain', label: '素白', className: 'plain' },
  { key: 'vintage', label: '仿古黄', className: 'vintage' },
  { key: 'red', label: '金边红', className: 'red' },
];

const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose, onExport }) => {
  const [scrollStyle, setScrollStyle] = useState<ScrollStyle>('plain');
  const [showSeal, setShowSeal] = useState(false);
  const [sealText, setSealText] = useState('墨');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      onExport({ scrollStyle, showSeal, sealText });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`export-panel ${!isOpen ? 'collapsed' : ''}`}>
      <div className="export-panel-header">
        <div className="export-panel-title">导出卷轴</div>
        <button className="close-btn" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>

      <div className="export-panel-content">
        <div className="export-section">
          <div className="export-section-title">选择卷轴背景</div>
          <div className="scroll-options">
            {SCROLL_STYLES.map(style => (
            <div
                key={style.key}
                className={`scroll-option ${style.className} ${scrollStyle === style.key ? 'active' : ''}`}
                onClick={() => setScrollStyle(style.key)}
              >
                {style.label}
              </div>
            ))}
          </div>
        </div>

        <div className="export-section">
          <div className="export-section-title">个人印章</div>
          <div className="seal-toggle" onClick={() => setShowSeal(!showSeal)}>
            <span className="seal-label">添加印章</span>
            <div className={`switch ${showSeal ? 'active' : ''}`}>
              <div className="switch-knob" />
            </div>
          </div>

          {showSeal && (
            <div className="seal-preview" style={{ marginTop: '10px' }}>
              <div className="seal-preview-circle">
                {sealText ? sealText.charAt(0) : '印'}
              </div>
              <input
                type="text"
                className="seal-input"
                placeholder="输入印章文字（取首字）"
                value={sealText}
                onChange={(e) => setSealText(e.target.value)}
                maxLength={4}
              />
            </div>
          )}
        </div>

        <button
          className="export-btn"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? '导出中...' : '导出 SVG 并下载'}
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
