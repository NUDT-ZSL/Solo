import { useCallback, useEffect, useRef } from 'react';
import { useStore, VIEWPORTS } from './store';
import Toolbar from './components/Toolbar';
import PreviewPanel from './components/PreviewPanel';
import { captureAllPanels, computeDiff } from './utils/screenshot';
import { exportPDF } from './utils/exportPDF';
import { CircleOff, Crosshair, Loader } from 'lucide-react';

export default function App() {
  const {
    targetUrl,
    isRecording,
    captures,
    selectedFrameIndex,
    isPaused,
    isDiffMode,
    diffResult,
    diffSourceA,
    diffSourceB,
    isLoading,
    setRecording,
    addCapture,
    setSelectedFrameIndex,
    setPaused,
    setDiffMode,
    setDiffResult,
    setDiffSourceA,
    setDiffSourceB,
    setLoading,
    clearCaptures,
  } = useStore();

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const registerPanelRef = useCallback((name: string, el: HTMLDivElement | null) => {
    panelRefs.current[name] = el;
  }, []);

  const handleStartRecording = useCallback(() => {
    if (isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecording(false);
      return;
    }
    clearCaptures();
    setRecording(true);
    setPaused(false);
    recordingTimerRef.current = setInterval(async () => {
      const screenshots = await captureAllPanels(panelRefs.current);
      if (screenshots) {
        addCapture({
          timestamp: Date.now(),
          screenshots,
        });
      }
    }, 1000);
  }, [isRecording, setRecording, setPaused, clearCaptures, addCapture]);

  const handleDetectDiff = useCallback(async () => {
    if (isDiffMode) {
      setDiffMode(false);
      setDiffResult(null);
      return;
    }
    if (captures.length === 0) return;
    setDiffMode(true);
    setLoading(true);

    try {
      const frameIdx = selectedFrameIndex >= 0 ? selectedFrameIndex : captures.length - 1;
      const frame = captures[frameIdx];
      if (!frame) return;

      const imgA = frame.screenshots[diffSourceA];
      const imgB = frame.screenshots[diffSourceB];
      if (!imgA || !imgB) return;

      const result = await computeDiff(imgA, imgB);
      setDiffResult(result);
    } finally {
      setLoading(false);
    }
  }, [isDiffMode, captures, selectedFrameIndex, diffSourceA, diffSourceB, setDiffMode, setDiffResult, setLoading]);

  const handleExport = useCallback(async () => {
    if (captures.length === 0) return;
    setLoading(true);
    try {
      const frameIdx = selectedFrameIndex >= 0 ? selectedFrameIndex : captures.length - 1;
      const frame = captures[frameIdx];
      await exportPDF({
        url: targetUrl,
        screenshots: frame?.screenshots ?? {},
        diffResult,
        timestamp: frame?.timestamp ?? Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }, [captures, selectedFrameIndex, targetUrl, diffResult, setLoading]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        setPaused(!isPaused);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isPaused, setPaused]);

  useEffect(() => {
    if (isPaused && recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    } else if (isRecording && !isPaused && !recordingTimerRef.current) {
      recordingTimerRef.current = setInterval(async () => {
        const screenshots = await captureAllPanels(panelRefs.current);
        if (screenshots) {
          addCapture({
            timestamp: Date.now(),
            screenshots,
          });
        }
      }, 1000);
    }
  }, [isPaused, isRecording, addCapture]);

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
            <div className="diff-container">
              <div className="diff-preview-area">
                {viewports.map((vp) => (
                  <PreviewPanel
                    key={vp.name}
                    viewport={vp}
                    registerRef={registerPanelRef}
                    overrideScreenshot={
                      currentFrame ? currentFrame.screenshots[vp.name] : undefined
                    }
                    diffRegions={
                      diffResult
                        ? diffResult.regions.filter((r) =>
                            r.domPath.includes(vp.name)
                          )
                        : []
                    }
                  />
                ))}
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
                    <div className="diff-list">
                      {diffResult.regions.map((region, i) => (
                        <div
                          key={i}
                          className="diff-item"
                          onClick={() => {
                            const el = panelRefs.current[region.domPath];
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <span className="diff-item-coord">
                            ({region.x}, {region.y}) - {region.width}×{region.height}
                          </span>
                          <span className="diff-item-percent">
                            差异 {region.diffPercentage.toFixed(2)}%
                          </span>
                          <span className="diff-item-dom">{region.domPath}</span>
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
                />
              ))}
            </div>
          )}
        </div>

        {captures.length > 0 && (
          <div className="timeline-container">
            <div className="timeline-header">
              <span className="timeline-title">录制时间轴</span>
              <span className="timeline-status">
                {isRecording
                  ? isPaused
                    ? '已暂停 (按空格继续)'
                    : '录制中 (按空格暂停)'
                  : `共 ${captures.length} 帧`}
              </span>
            </div>
            <div className="timeline-scroll">
              {captures.map((frame, i) => {
                const firstScreenshot =
                  frame.screenshots[VIEWPORTS[0].name] ||
                  Object.values(frame.screenshots)[0];
                return (
                  <img
                    key={frame.timestamp}
                    className={`timeline-thumb ${selectedFrameIndex === i ? 'active' : ''}`}
                    src={firstScreenshot}
                    alt={`Frame ${i + 1}`}
                    onClick={() => setSelectedFrameIndex(i)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
