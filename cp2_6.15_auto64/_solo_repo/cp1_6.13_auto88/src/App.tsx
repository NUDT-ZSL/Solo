import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useColorStore } from './store/useColorStore';
import { Timeline } from './timeline/Timeline';
import { SwatchPanel } from './components/SwatchPanel';
import { exportToCSS, exportToJSON } from './utils/exportUtils';
import './App.css';

type ExportFormat = 'css' | 'json';

export default function App() {
  const { currentHour, colors, exportPanelOpen, exportSuccess, setCurrentHour, toggleExportPanel, closeExportPanel, triggerExportSuccess } = useColorStore(
    useShallow((state) => ({
      currentHour: state.currentHour,
      colors: state.colors,
      exportPanelOpen: state.exportPanelOpen,
      exportSuccess: state.exportSuccess,
      setCurrentHour: state.setCurrentHour,
      toggleExportPanel: state.toggleExportPanel,
      closeExportPanel: state.closeExportPanel,
      triggerExportSuccess: state.triggerExportSuccess,
    }))
  );

  const [exportFormat, setExportFormat] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);

  const exportContent = exportFormat === 'css' ? exportToCSS(colors) : exportToJSON(colors);

  const handleExportClick = useCallback(() => {
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 150);
    toggleExportPanel();
    triggerExportSuccess();
  }, [toggleExportPanel, triggerExportSuccess]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('复制失败', e);
    }
  }, [exportContent]);

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">
          <span className="app-title-gradient">ColorChron</span>
        </h1>
        <p className="app-subtitle">时间序列色彩主题生成器</p>
      </div>

      <div className="app-main">
        <div className="app-left">
          <Timeline currentHour={currentHour} onHourChange={setCurrentHour} />
        </div>

        <div className="app-right">
          <div className="preview-header">
            <h2 className="preview-title">配色预览</h2>
            <div className="preview-time">
              <span className="preview-time-label">当前时间</span>
              <span className="preview-time-value">
                {String(Math.floor(currentHour)).padStart(2, '0')}:
                {String(Math.floor((currentHour % 1) * 60)).padStart(2, '0')}
              </span>
            </div>
          </div>

          <SwatchPanel colors={colors} />

          <div className="export-section">
            <button
              className={`export-button ${buttonPressed ? 'pressed' : ''} ${exportSuccess ? 'success' : ''}`}
              onClick={handleExportClick}
            >
              <span className="export-button-content">
                {exportSuccess ? (
                  <>
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="export-button-text success-text">已就绪</span>
                  </>
                ) : (
                  <>
                    <svg className="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span className="export-button-text">导出配色</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {exportPanelOpen && (
        <div className="export-modal-overlay" onClick={closeExportPanel}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <h3 className="export-modal-title">导出配色方案</h3>
              <button className="export-modal-close" onClick={closeExportPanel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="export-format-tabs">
              <button
                className={`export-format-tab ${exportFormat === 'css' ? 'active' : ''}`}
                onClick={() => setExportFormat('css')}
              >
                CSS 变量
              </button>
              <button
                className={`export-format-tab ${exportFormat === 'json' ? 'active' : ''}`}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
            </div>

            <div className="export-code-wrapper">
              <pre className="export-code">{exportContent}</pre>
            </div>

            <div className="export-modal-footer">
              <button className="copy-button" onClick={handleCopy}>
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    复制到剪贴板
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
