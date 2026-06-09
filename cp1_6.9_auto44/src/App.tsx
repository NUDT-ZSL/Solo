import { useCallback, useEffect, useRef, useState } from 'react';
import TextInput from './components/TextInput';
import BrushSelector from './components/BrushSelector';
import CanvasRenderer, { CanvasRendererHandle } from './components/CanvasRenderer';
import { BRUSH_PRESETS, BrushPreset, TextureParams } from './utils/textureEngine';

function App() {
  const [text, setText] = useState('质墨 Texture');
  const [fontFamily, setFontFamily] = useState('"Microsoft YaHei", "PingFang SC", sans-serif');
  const [preset, setPreset] = useState<BrushPreset>(BRUSH_PRESETS[0]);
  const [customParams, setCustomParams] = useState<Partial<TextureParams>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const renderRef = useRef<CanvasRendererHandle>(null);
  const debounceRef = useRef<number | null>(null);

  const handlePresetChange = useCallback((p: BrushPreset) => {
    setPreset(p);
    setCustomParams({});
  }, []);

  const handleParamChange = useCallback((key: keyof TextureParams, value: number) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setCustomParams(prev => {
        const next: Partial<TextureParams> = { ...prev };
        if (key === 'opacityMax') {
          next.opacityMax = value;
          next.opacityMin = Math.min(value, 0.3 + value * 0.3);
        } else {
          (next as Record<string, unknown>)[key] = value;
        }
        return next;
      });
    }, 480);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await renderRef.current?.exportHighRes(1920, 1080);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeText = (text || 'zhimo').replace(/[\\/:*?"<>|\s]/g, '_').slice(0, 20);
        a.download = `zhimo_${preset.name}_${safeText}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setTimeout(() => setExporting(false), 300);
    }
  }, [exporting, text, preset.name]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">质</div>
          <div className="logo-title">
            <h1>质墨</h1>
            <span>ZhiMo · 肌理艺术字</span>
          </div>
        </div>
        <div className="header-right">
          <div className="status-indicator">
            <span className={`status-dot ${redrawing ? 'busy' : 'idle'}`} />
            <span className="status-text">{redrawing ? '绘制中...' : '就绪'}</span>
          </div>
          <button
            className={`export-btn ${exporting ? 'exporting' : ''}`}
            onClick={handleExport}
            disabled={exporting}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? '导出中...' : '导出 PNG'}
          </button>
          <button
            className={`mobile-toggle ${panelOpen ? 'open' : ''}`}
            onClick={() => setPanelOpen(o => !o)}
            aria-label="控制面板"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className={`control-panel ${panelOpen ? 'open' : ''}`}>
          <div className="panel-scroll">
            <TextInput
              value={text}
              fontFamily={fontFamily}
              onTextChange={setText}
              onFontChange={setFontFamily}
            />
            <BrushSelector
              selected={preset}
              customParams={customParams}
              onSelectPreset={handlePresetChange}
              onParamChange={handleParamChange}
            />
            <div className="control-section info-section">
              <div className="section-header">
                <span className="section-title">操作提示</span>
              </div>
              <ul className="tips-list">
                <li>· 切换笔触会有 2 秒渐变过渡</li>
                <li>· 调整滑块会在 0.5 秒后重绘</li>
                <li>· 拖拽画布可平移检查纹理细节</li>
                <li>· 导出为 1920×1080 透明背景 PNG</li>
              </ul>
            </div>
          </div>
        </aside>

        <main className="canvas-area">
          <CanvasRenderer
            ref={renderRef}
            text={text}
            fontFamily={fontFamily}
            preset={preset}
            customParams={customParams}
            transitionDuration={2000}
            onRedrawStart={() => setRedrawing(true)}
            onRedrawEnd={() => setRedrawing(false)}
          />
        </main>
      </div>

      {panelOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
