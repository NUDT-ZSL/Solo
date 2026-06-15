import { useState, useCallback, useEffect, useRef } from 'react';
import { VIEWPORTS, type CaptureFrame, type DiffResult, type DiffRegion } from './types';
import Toolbar from './components/Toolbar';
import PreviewPanel from './components/PreviewPanel';
import Timeline from './components/Timeline';
import { captureAllPanels, computeDiff } from './utils/screenshot';
import { exportPDF } from './utils/exportPDF';
import { CircleOff, Crosshair } from 'lucide-react';

export default function App() {
  const [targetUrl, setTargetUrl] = useState('');
  const [crosshair, setCrosshair] = useState<{ nx: number; ny: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [captures, setCaptures] = useState<CaptureFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffSourceA, setDiffSourceA] = useState('Mobile');
  const [diffSourceB, setDiffSourceB] = useState('Desktop');
  const [isLoading, setIsLoading] = useState(false);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const diffPanelRef = useRef<HTMLDivElement | null>(null);

  const registerPanelRef = useCallback((name: string, el: HTMLDivElement | null) => {
    panelRefs.current[name] = el;
  }, []);

  const handleMouseMove = useCallback((_viewportName: string, nx: number, ny: number) => {
    setCrosshair({ nx, ny });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
  }, []);

  const handleStartRecording = useCallback(() => {
    if (isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }
    setCaptures([]);
    setSelectedFrameIndex(-1);
    setIsRecording(true);
    setIsPaused(false);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || isPaused) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const screenshots = await captureAllPanels(panelRefs.current);
      if (screenshots && !cancelled) {
        setCaptures((prev) => [...prev, { timestamp: Date.now(), screenshots }]);
      }
    };

    tick();
    recordingTimerRef.current = setInterval(tick, 1000);

    return () => {
      cancelled = true;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  const handleDetectDiff = useCallback(async () => {
    if (isDiffMode) {
      setIsDiffMode(false);
      setDiffResult(null);
      return;
    }
    if (captures.length === 0) return;
    setIsDiffMode(true);
    setIsLoading(true);

    try {
      const frameIdx = selectedFrameIndex >= 0 ? selectedFrameIndex : captures.length - 1;
      const frame = captures[frameIdx];
      if (!frame) return;

      const imgA = frame.screenshots[diffSourceA];
      const imgB = frame.screenshots[diffSourceB];
      if (!imgA || !imgB) return;

      const result = await computeDiff(imgA, imgB, diffSourceB);
      setDiffResult(result);
    } finally {
      setIsLoading(false);
    }
  }, [isDiffMode, captures, selectedFrameIndex, diffSourceA, diffSourceB]);

  const handleExport = useCallback(async () => {
    if (captures.length === 0) return;
    setIsLoading(true);
    try {
      const frameIdx = selectedFrameIndex >= 0 ? selectedFrameIndex : captures.length - 1;
      const frame = captures[frameIdx];
      await exportPDF({
        url: targetUrl,
        screenshots: frame?.screenshots ?? {},
        diffResult,
        timestamp: frame?.timestamp ?? Date.now(),
        diffSourceA,
        diffSourceB,
      });
    } finally {
      setIsLoading(false);
    }
  }, [captures, selectedFrameIndex, targetUrl, diffResult, diffSourceA, diffSourceB]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  const handleDiffItemClick = useCallback((_region: DiffRegion) => {
    const panel = panelRefs.current[diffSourceB];
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [diffSourceB]);

  const currentFrame = selectedFrameIndex >= 0 ? captures[selectedFrameIndex] : null;
  const viewports = VIEWPORTS;

  return (
    <div className="app-layout">
      <Toolbar
        onRecord={handleStartRecording}
        onDetect={handleDetectDiff}
        onExport={handleExport}
        isRecording={isRecording}
        isDiffMode={isDiffMode}
        isLoading={isLoading}
        targetUrl={targetUrl}
        setTargetUrl={setTargetUrl}
      />

      <div className="content-area">
        <div className="main-content">
          {!targetUrl ? (
            <div className="placeholder-panel">
              <div className="placeholder-icon">
                <Crosshair size={36} />
              </div>
              <div className="placeholder-text">
                输入URL开始验证响应式设计
              </div>
            </div>
          ) : isDiffMode ? (
            <div className="diff-container" ref={diffPanelRef}>
              <div className="diff-preview-area">
                {viewports.map((vp) => {
                  const showDiffOverlay = vp.name === diffSourceB && diffResult?.diffImage;
                  return (
                    <PreviewPanel
                      key={vp.name}
                      viewport={vp}
                      registerRef={registerPanelRef}
                      overrideScreenshot={
                        currentFrame ? currentFrame.screenshots[vp.name] : undefined
                      }
                      diffRegions={
                        vp.name === diffSourceB ? diffResult?.regions ?? [] : []
                      }
                      diffImage={showDiffOverlay ? diffResult!.diffImage : undefined}
                      crosshair={crosshair}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </div>
              <div className="diff-side-panel">
                <div className="diff-selector">
                  <label>对比</label>
                  <select
                    className="diff-select"
                    value={diffSourceA}
                    onChange={(e) => setDiffSourceA(e.target.value)}
                  >
                    {viewports.map((vp) => (
                      <option key={vp.name} value={vp.name}>
                        {vp.name} ({vp.width}×{vp.height})
                      </option>
                    ))}
                  </select>
                  <span className="diff-vs">vs</span>
                  <select
                    className="diff-select"
                    value={diffSourceB}
                    onChange={(e) => setDiffSourceB(e.target.value)}
                  >
                    {viewports.map((vp) => (
                      <option key={vp.name} value={vp.name}>
                        {vp.name} ({vp.width}×{vp.height})
                      </option>
                    ))}
                  </select>
                </div>

                {isLoading ? (
                  <div className="diff-empty">
                    <div className="loading-spinner" />
                    <div className="diff-empty-text">检测中...</div>
                  </div>
                ) : diffResult && diffResult.regions.length > 0 ? (
                  <>
                    <div className="diff-side-panel-header">
                      <div className="diff-side-panel-title">差异列表</div>
                      <div className="diff-side-panel-subtitle">
                        共 {diffResult.regionCount} 处差异
                      </div>
                    </div>
                    <div className="diff-list">
                      {diffResult.regions.map((region, i) => (
                        <div
                          key={i}
                          className="diff-item"
                          onClick={() => handleDiffItemClick(region)}
                        >
                          <span className="diff-item-coord">
                            #{i + 1} ({region.x}, {region.y}) - {region.width}×{region.height}
                          </span>
                          <span className="diff-item-percent">
                            差异占比 {region.diffPercentage.toFixed(2)}%
                          </span>
                          <span className="diff-item-dom" title={region.domPath}>
                            {region.domPath}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="diff-stats">
                      <div className="diff-stat-row">
                        <span className="diff-stat-label">总差异像素数</span>
                        <span className="diff-stat-value">
                          {diffResult.totalDiffPixels.toLocaleString()}
                        </span>
                      </div>
                      <div className="diff-stat-row">
                        <span className="diff-stat-label">差异区域数量</span>
                        <span className="diff-stat-value">{diffResult.regionCount}</span>
                      </div>
                      <div className="diff-stat-row">
                        <span className="diff-stat-label">最大差异区域面积</span>
                        <span className="diff-stat-value">
                          {diffResult.maxRegionArea.toLocaleString()}px²
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="diff-empty">
                    <div className="diff-empty-icon">
                      <CircleOff size={24} />
                    </div>
                    <div className="diff-empty-text">暂无差异检测结果</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="preview-grid">
              {viewports.map((vp) => (
                <PreviewPanel
                  key={vp.name}
                  viewport={vp}
                  registerRef={registerPanelRef}
                  overrideScreenshot={
                    currentFrame ? currentFrame.screenshots[vp.name] : undefined
                  }
                  crosshair={crosshair}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </div>
          )}
        </div>

        <Timeline
          captures={captures}
          selectedIndex={selectedFrameIndex}
          onSelect={setSelectedFrameIndex}
          isRecording={isRecording}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
}
