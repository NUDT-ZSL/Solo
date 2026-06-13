import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GridConfig,
  FlexConfig,
  LayoutConfig,
  defaultGridConfig,
  defaultFlexConfig,
  getLayoutStyle,
  generateRandomColors,
} from './layoutDebugger';
import { perfMonitor, PerfMetrics } from './perfMonitor';

interface CardData {
  id: number;
  number: number;
  color: string;
}

function App() {
  const [layoutType, setLayoutType] = useState<'grid' | 'flex'>('grid');
  const [gridConfig, setGridConfig] = useState<GridConfig>(defaultGridConfig);
  const [flexConfig, setFlexConfig] = useState<FlexConfig>(defaultFlexConfig);
  const [cards, setCards] = useState<CardData[]>([]);
  const [highlightedCard, setHighlightedCard] = useState<number | null>(null);
  const [perfPanelExpanded, setPerfPanelExpanded] = useState(false);
  const [metrics, setMetrics] = useState<PerfMetrics>({
    fps: 0,
    layoutDuration: 0,
    reflowCount: 0,
    timestamp: 0,
  });
  const [metricsHistory, setMetricsHistory] = useState<PerfMetrics[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [floatingVisible, setFloatingVisible] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({ x: 0, y: 0 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [dragOverCard, setDragOverCard] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const colors = generateRandomColors(12, 30);
    const initialCards: CardData[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      number: i + 1,
      color: colors[i],
    }));
    setCards(initialCards);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    perfMonitor.start((newMetrics) => {
      setMetrics(newMetrics);
      setMetricsHistory(perfMonitor.getMetricsHistory());
    });

    return () => {
      perfMonitor.stop();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawChart = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const padding = { top: 10, right: 10, bottom: 20, left: 35 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 0.5;
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#94a3b8';

      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const value = Math.round(16 - i * 4);
        ctx.textAlign = 'right';
        ctx.fillText(`${value}ms`, padding.left - 4, y + 3);
      }

      const timeWindow = 60000;
      const now = performance.now();
      const visibleMetrics = metricsHistory.filter(
        (m) => now - m.timestamp <= timeWindow
      );

      if (visibleMetrics.length > 1) {
        const points: { x: number; y: number }[] = [];
        const maxValue = 16;

        visibleMetrics.forEach((m, i) => {
          const x =
            padding.left +
            ((m.timestamp - (now - timeWindow)) / timeWindow) * chartWidth;
          const y =
            padding.top +
            chartHeight -
            Math.min(m.layoutDuration / maxValue, 1) * chartHeight;
          points.push({ x, y });
        });

        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, '#60a5fa20');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartHeight);
        points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.5;
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('-60s', padding.left, height - 5);
      ctx.fillText('now', width - padding.right, height - 5);
    };

    drawChart();
    const interval = setInterval(drawChart, 500);

    return () => clearInterval(interval);
  }, [metricsHistory]);

  const currentConfig: LayoutConfig =
    layoutType === 'grid' ? gridConfig : flexConfig;

  const handleGridChange = <K extends keyof GridConfig>(
    key: K,
    value: GridConfig[K]
  ) => {
    setGridConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleFlexChange = <K extends keyof FlexConfig>(
    key: K,
    value: FlexConfig[K]
  ) => {
    setFlexConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleCardClick = useCallback((id: number) => {
    setHighlightedCard(id);
    perfMonitor.recordSelectEvent();
    setTimeout(() => {
      setHighlightedCard((current) => (current === id ? null : current));
    }, 2000);
  }, []);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedCard(id);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedCard(null);
    setDragOverCard(null);
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedCard !== null && draggedCard !== id) {
      setDragOverCard(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverCard(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedCard === null || draggedCard === targetId) return;

    setCards((prev) => {
      const newCards = [...prev];
      const draggedIndex = newCards.findIndex((c) => c.id === draggedCard);
      const targetIndex = newCards.findIndex((c) => c.id === targetId);
      const [removed] = newCards.splice(draggedIndex, 1);
      newCards.splice(targetIndex, 0, removed);
      return newCards;
    });

    setDraggedCard(null);
    setDragOverCard(null);
  };

  const handleExport = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      layoutType,
      layoutConfig: currentConfig,
      performance: perfMonitor.getSnapshot(),
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `gridrush_snapshot_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    if (isMobile) {
      setIsDraggingPanel(true);
      const rect = panelRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  useEffect(() => {
    if (!isDraggingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      setFloatingPosition({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPanel, dragOffset]);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'success';
    if (fps >= 30) return 'warning';
    return 'danger';
  };

  const ControlPanelContent = () => (
    <>
      <div className="panel-section">
        <div className="section-tabs">
          <button
            className={`section-tab ${layoutType === 'grid' ? 'active' : ''}`}
            onClick={() => setLayoutType('grid')}
          >
            Grid
          </button>
          <button
            className={`section-tab ${layoutType === 'flex' ? 'active' : ''}`}
            onClick={() => setLayoutType('flex')}
          >
            Flexbox
          </button>
        </div>
      </div>

      {layoutType === 'grid' ? (
        <>
          <div className="panel-header">Grid 布局设置</div>
          <div className="panel-section">
            <div className="control-row">
              <label className="control-label">
                行数 <span className="control-value">{gridConfig.rows}</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={gridConfig.rows}
                onChange={(e) =>
                  handleGridChange('rows', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))
                }
              />
            </div>
            <div className="control-row">
              <label className="control-label">
                列数 <span className="control-value">{gridConfig.columns}</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={gridConfig.columns}
                onChange={(e) =>
                  handleGridChange('columns', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))
                }
              />
            </div>
            <div className="control-row">
              <label className="control-label">
                间距 <span className="control-value">{gridConfig.gap}px</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={gridConfig.gap}
                onChange={(e) => handleGridChange('gap', parseInt(e.target.value))}
              />
            </div>
            <div className="control-row">
              <label className="control-label">水平对齐</label>
              <select
                value={gridConfig.justifyItems}
                onChange={(e) =>
                  handleGridChange(
                    'justifyItems',
                    e.target.value as GridConfig['justifyItems']
                  )
                }
              >
                <option value="start">start</option>
                <option value="center">center</option>
                <option value="end">end</option>
                <option value="stretch">stretch</option>
              </select>
            </div>
            <div className="control-row">
              <label className="control-label">垂直对齐</label>
              <select
                value={gridConfig.alignItems}
                onChange={(e) =>
                  handleGridChange(
                    'alignItems',
                    e.target.value as GridConfig['alignItems']
                  )
                }
              >
                <option value="start">start</option>
                <option value="center">center</option>
                <option value="end">end</option>
                <option value="stretch">stretch</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="panel-header">Flexbox 布局设置</div>
          <div className="panel-section">
            <div className="control-row">
              <label className="control-label">方向</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${flexConfig.direction === 'row' ? 'active' : ''}`}
                  onClick={() => handleFlexChange('direction', 'row')}
                >
                  row
                </button>
                <button
                  className={`toggle-btn ${flexConfig.direction === 'column' ? 'active' : ''}`}
                  onClick={() => handleFlexChange('direction', 'column')}
                >
                  column
                </button>
              </div>
            </div>
            <div className="control-row">
              <label className="control-label">换行</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${flexConfig.wrap === 'nowrap' ? 'active' : ''}`}
                  onClick={() => handleFlexChange('wrap', 'nowrap')}
                >
                  nowrap
                </button>
                <button
                  className={`toggle-btn ${flexConfig.wrap === 'wrap' ? 'active' : ''}`}
                  onClick={() => handleFlexChange('wrap', 'wrap')}
                >
                  wrap
                </button>
              </div>
            </div>
            <div className="control-row">
              <label className="control-label">
                间距 <span className="control-value">{flexConfig.gap}px</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={flexConfig.gap}
                onChange={(e) => handleFlexChange('gap', parseInt(e.target.value))}
              />
            </div>
            <div className="control-row">
              <label className="control-label">主轴对齐</label>
              <select
                value={flexConfig.justifyContent}
                onChange={(e) =>
                  handleFlexChange(
                    'justifyContent',
                    e.target.value as FlexConfig['justifyContent']
                  )
                }
              >
                <option value="flex-start">flex-start</option>
                <option value="center">center</option>
                <option value="flex-end">flex-end</option>
                <option value="space-between">space-between</option>
                <option value="space-around">space-around</option>
              </select>
            </div>
            <div className="control-row">
              <label className="control-label">交叉轴对齐</label>
              <select
                value={flexConfig.alignItems}
                onChange={(e) =>
                  handleFlexChange(
                    'alignItems',
                    e.target.value as FlexConfig['alignItems']
                  )
                }
              >
                <option value="stretch">stretch</option>
                <option value="flex-start">flex-start</option>
                <option value="center">center</option>
                <option value="flex-end">flex-end</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="perf-panel">
        <div
          className="perf-panel-header"
          onClick={() => setPerfPanelExpanded(!perfPanelExpanded)}
        >
          <span className="perf-panel-title">
            <span
              className={`perf-panel-expand-icon ${perfPanelExpanded ? 'expanded' : ''}`}
            >
              ▼
            </span>
            性能监控
          </span>
          <span className={`metric-value ${getFpsColor(metrics.fps)}`} style={{ fontSize: '14px' }}>
            {metrics.fps} FPS
          </span>
        </div>
        <div className={`perf-panel-content ${perfPanelExpanded ? '' : 'collapsed'}`}>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className={`metric-value ${getFpsColor(metrics.fps)}`}>
                {metrics.fps}
              </div>
              <div className="metric-label">FPS</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">
                {metrics.layoutDuration.toFixed(2)}
              </div>
              <div className="metric-label">布局耗时 (ms)</div>
            </div>
            <div className="metric-card" style={{ gridColumn: 'span 2' }}>
              <div className="metric-value" style={{ fontSize: '16px' }}>
                {metrics.reflowCount}
              </div>
              <div className="metric-label">重排次数</div>
            </div>
          </div>
          <div className="chart-container">
            <canvas ref={canvasRef} className="chart-canvas" />
          </div>
        </div>
      </div>

      <button className="export-btn" onClick={handleExport}>
        导出快照 JSON
      </button>
    </>
  );

  return (
    <div className="app">
      {!isMobile && (
        <div className="control-panel">
          <ControlPanelContent />
        </div>
      )}

      <div className="preview-area">
        <div className="preview-container" style={getLayoutStyle(currentConfig)}>
          {cards.map((card) => (
            <div
              key={card.id}
              className={`card ${
                highlightedCard === card.id ? 'highlighted' : ''
              } ${draggedCard === card.id ? 'dragging' : ''} ${
                dragOverCard === card.id ? 'drag-over' : ''
              }`}
              style={{
                backgroundColor: card.color,
                ...(layoutType === 'flex' && flexConfig.wrap === 'wrap'
                  ? { flex: '1 1 calc(25% - ' + (flexConfig.gap * 0.75) + 'px)', minWidth: '120px' }
                  : {}),
              }}
              draggable
              onClick={() => handleCardClick(card.id)}
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, card.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, card.id)}
            >
              {card.number}
            </div>
          ))}
        </div>
      </div>

      {isMobile && !floatingVisible && (
        <div
          className="floating-panel-toggle"
          onClick={() => setFloatingVisible(true)}
        >
          ⚙
        </div>
      )}

      {isMobile && floatingVisible && (
        <div
          ref={panelRef}
          className="floating-panel"
          style={
            floatingPosition.x || floatingPosition.y
              ? { right: 'auto', bottom: 'auto', left: floatingPosition.x, top: floatingPosition.y }
              : {}
          }
        >
          <div className="floating-panel-header" onMouseDown={handlePanelMouseDown}>
            <span className="floating-panel-title">GridRush</span>
            <div
              className="floating-panel-close"
              onClick={() => setFloatingVisible(false)}
            >
              ×
            </div>
          </div>
          <div className="floating-panel-body">
            <ControlPanelContent />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
