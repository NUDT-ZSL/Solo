import React, { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './Canvas';
import { ShapeData, ShapeType, NORDIC_COLORS } from './types';
import { patterns, flowerPattern, rocketPattern } from './data/patterns';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function getRandomColor() {
  return NORDIC_COLORS[Math.floor(Math.random() * NORDIC_COLORS.length)].value;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateInitialPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const corners = [
    { x: 100, y: 100 },
    { x: 700, y: 100 },
    { x: 100, y: 500 },
    { x: 700, y: 500 },
    { x: 400, y: 80 },
    { x: 400, y: 520 },
    { x: 80, y: 300 },
    { x: 720, y: 300 },
  ];

  for (let i = 0; i < count; i++) {
    if (i < corners.length) {
      positions.push({
        x: corners[i].x + (Math.random() - 0.5) * 40,
        y: corners[i].y + (Math.random() - 0.5) * 40,
      });
    } else {
      positions.push({
        x: 60 + Math.random() * (CANVAS_WIDTH - 120),
        y: 60 + Math.random() * (CANVAS_HEIGHT - 120),
      });
    }
  }
  return shuffle(positions);
}

function createShapesFromPattern(patternKey: string): ShapeData[] {
  const pattern = patterns[patternKey];
  if (!pattern) return [];

  const shuffledTypes = shuffle(pattern.availableShapes);
  const positions = generateInitialPositions(shuffledTypes.length);

  return shuffledTypes.map((type, idx) => {
    const targetShape = pattern.targetShapes.find((t) => t.type === type);
    const defaultSize = type === 'rectangle' ? { w: 70, h: 100 } : { w: 60, h: 60 };
    const size = targetShape
      ? { w: targetShape.width, h: targetShape.height }
      : defaultSize;

    return {
      id: generateId(),
      type,
      x: positions[idx]?.x ?? 400,
      y: positions[idx]?.y ?? 300,
      width: size.w,
      height: size.h,
      rotation: 0,
      color: getRandomColor(),
    };
  });
}

const SHAPE_TOOLS: { type: ShapeType; label: string }[] = [
  { type: 'circle', label: '圆形' },
  { type: 'rectangle', label: '矩形' },
  { type: 'triangle', label: '三角形' },
  { type: 'hexagon', label: '六边形' },
];

function renderToolShape(type: ShapeType, size: number = 36, color: string = '#9BB7D4') {
  switch (type) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={color} />
        </svg>
      );
    case 'rectangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={2} y={4} width={size - 4} height={size - 8} fill={color} rx={3} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`${size / 2},2 ${size - 2},${size - 2} 2,${size - 2}`} fill={color} />
        </svg>
      );
    case 'hexagon': {
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 2;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={pts} fill={color} />
        </svg>
      );
    }
  }
}

const App: React.FC = () => {
  const [currentPattern, setCurrentPattern] = useState<string>('flower');
  const [shapes, setShapes] = useState<ShapeData[]>(() =>
    createShapesFromPattern('flower'));
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successText, setSuccessText] = useState<string>('');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  const [hamburgerOpen, setHamburgerOpen] = useState<boolean>(false);
  const successIntervalRef = useRef<number | null>(null);

  const selectedShape = shapes.find((s) => s.id === selectedShapeId);

  const handlePatternChange = useCallback((patternKey: string) => {
    setCurrentPattern(patternKey);
    setShapes(createShapesFromPattern(patternKey));
    setSelectedShapeId(null);
    setProgress(0);
    setShowSuccess(false);
    setSuccessText('');
  }, []);

  const handleReset = useCallback(() => {
    setShapes(createShapesFromPattern(currentPattern));
    setSelectedShapeId(null);
    setProgress(0);
    setShowSuccess(false);
    setSuccessText('');
  }, [currentPattern]);

  const handleAddShape = useCallback((type: ShapeType) => {
    if (shapes.length >= 30) return;

    const positions = generateInitialPositions(1);
    const defaultSize = type === 'rectangle' ? { w: 70, h: 100 } : { w: 60, h: 60 };

    setShapes((prev) => [
      ...prev,
      {
        id: generateId(),
        type,
        x: positions[0]?.x ?? 400,
        y: positions[0]?.y ?? 300,
        width: defaultSize.w,
        height: defaultSize.h,
        rotation: 0,
        color: getRandomColor(),
      },
    ]);
  }, [shapes.length]);

  const handleToolDragStart = useCallback(
    (e: React.DragEvent, type: ShapeType) => {
      e.dataTransfer.setData('shapeType', type);
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  const updateShape = useCallback(
    (id: string, updates: Partial<ShapeData>) => {
      setShapes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const handleWidthChange = useCallback(
    (value: number) => {
      if (!selectedShapeId) return;
      updateShape(selectedShapeId, { width: value });
    },
    [selectedShapeId, updateShape]
  );

  const handleHeightChange = useCallback(
    (value: number) => {
      if (!selectedShapeId) return;
      updateShape(selectedShapeId, { height: value });
    },
    [selectedShapeId, updateShape]
  );

  const handleRotationChange = useCallback(
    (value: number) => {
      if (!selectedShapeId) return;
      const normalized = ((value % 360) + 360) % 360;
      updateShape(selectedShapeId, { rotation: normalized });
    },
    [selectedShapeId, updateShape]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!selectedShapeId) return;
      updateShape(selectedShapeId, { color });
    },
    [selectedShapeId, updateShape]
  );

  const handleRotationWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!selectedShapeId) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setShapes((prev) =>
        prev.map((s) =>
          s.id === selectedShapeId
            ? { ...s, rotation: ((s.rotation + delta) % 360 + 360) % 360 }
            : s
        )
      );
    },
    [selectedShapeId]
  );

  const handleComplete = useCallback(() => {
    if (showSuccess) return;
    setShowSuccess(true);
    setSuccessText('');

    const fullText = '太棒了！';
    let idx = 0;

    if (successIntervalRef.current) {
      clearInterval(successIntervalRef.current);
    }

    successIntervalRef.current = window.setInterval(() => {
      if (idx <= fullText.length) {
        setSuccessText(fullText.slice(0, idx));
        idx++;
      } else {
      if (successIntervalRef.current) {
        clearInterval(successIntervalRef.current);
      }
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessText('');
      }, 3000);
      }
    }, 200);
  }, [showSuccess]);

  useEffect(() => {
    return () => {
      if (successIntervalRef.current) {
        clearInterval(successIntervalRef.current);
      }
    };
  }, []);

  const currentPatternConfig = patterns[currentPattern];

  return (
    <div className="app-container">
      <div className="top-toolbar">
        <div className="toolbar-left">
          <span className="app-title">🎨 CSS形状拼图挑战</span>
          <select
            className="pattern-select"
            value={currentPattern}
            onChange={(e) => handlePatternChange(e.target.value)}
          >
            <option value="flower">🌸 花朵</option>
            <option value="rocket">🚀 火箭</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={handleReset}>
            重新排列
          </button>
          <button
            className="hamburger-menu"
            onClick={() => setHamburgerOpen(!hamburgerOpen)}
          >
            ☰
          </button>
          {hamburgerOpen && (
            <div style={{ position: 'absolute', right: 24, top: 60, background: 'white', padding: 12, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
              <button className="btn btn-primary" onClick={handleReset}>
                重新排列
              </button>
              <select
                className="pattern-select"
                value={currentPattern}
                onChange={(e) => handlePatternChange(e.target.value)}
              >
                <option value="flower">🌸 花朵</option>
                <option value="rocket">🚀 火箭</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="toolbar-left-panel">
          <span className="toolbar-section-title">图形工具</span>
          {SHAPE_TOOLS.map((tool) => (
            <div
              key={tool.type}
              className="shape-tool"
              draggable
              onDragStart={(e) => handleToolDragStart(e, tool.type)}
              onClick={() => handleAddShape(tool.type)}
              title={`添加${tool.label}`}
            >
              {renderToolShape(tool.type)}
              <span className="shape-tool-label">{tool.label}</span>
            </div>
          ))}
        </div>

        <div className="canvas-wrapper">
          <Canvas
            shapes={shapes}
            setShapes={setShapes}
            targetShapes={currentPatternConfig.targetShapes}
            selectedShapeId={selectedShapeId}
            setSelectedShapeId={setSelectedShapeId}
            onProgressChange={setProgress}
            onComplete={handleComplete}
          />

          <div className="preview-panel">
            <span className="preview-title">拼图进度</span>
            <div className="preview-content">
              {progress >= 95 ? (
              <span className="progress-text" style={{ color: '#7EC8B1' }}>
                ✨
              </span>
              ) : (
              <span className="progress-text">{progress}%</span>
              )}
            </div>
          </div>

          {showSuccess && (
            <div className="success-notification">
              {successText}
              <span className="cursor"></span>
            </div>
          )}
        </div>

        <div
          className={`right-panel${rightPanelCollapsed ? ' collapsed' : ''}`}
          style={{ position: 'relative' }}
        >
          <button
            className="panel-toggle-btn"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          >
            {rightPanelCollapsed ? '→' : '←'}
          </button>

          {!rightPanelCollapsed && (
            <>
              <div className="panel-section">
                <span className="panel-section-title">图形属性</span>
                {selectedShape ? (
                  <>
                    <div className="panel-label">
                      <span>类型</span>
                      <span className="panel-value">
                        {SHAPE_TOOLS.find((t) => t.type === selectedShape.type)?.label}
                      </span>
                    </div>

                    <div className="panel-section">
                      <div className="panel-label">
                        <span>宽度</span>
                        <span className="panel-value">{selectedShape.width}px</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={40}
                        max={120}
                        step={1}
                        value={selectedShape.width}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                      />
                    </div>

                    <div className="panel-section">
                      <div className="panel-label">
                        <span>高度</span>
                        <span className="panel-value">{selectedShape.height}px</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={40}
                        max={120}
                        step={1}
                        value={selectedShape.height}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                      />
                    </div>

                    <div
                      className="panel-section"
                      onWheel={handleRotationWheel}
                      style={{ cursor: 'ns-resize' }}
                    >
                      <div className="panel-label">
                        <span>旋转角度</span>
                        <span className="panel-value">{selectedShape.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={359}
                        step={1}
                        value={selectedShape.rotation}
                        onChange={(e) => handleRotationChange(Number(e.target.value))}
                      />
                      <span style={{ fontSize: 11, color: '#718096' }}>
                        💡 鼠标悬停滚轮微调
                      </span>
                    </div>

                    <div className="panel-section">
                      <span className="panel-section-title" style={{ marginTop: 8 }}>颜色</span>
                      <div className="color-palette">
                        {NORDIC_COLORS.map((c) => (
                          <div
                            key={c.value}
                            className={`color-swatch${
                              selectedShape.color === c.value ? ' selected' : ''
                            }`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => handleColorChange(c.value)}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: '#718096', lineHeight: 1.5 }}>
                  请在画布上选择一个图形来编辑它的属性
                </span>
              )}
              </div>

              <div className="panel-section">
                <span className="panel-section-title">操作提示</span>
                <span style={{ fontSize: 12, color: '#4A5568', lineHeight: 1.6 }}>
                  • 从左侧拖拽图形到画布
                  <br />• 点击图形选中并拖动
                  <br />• 松开鼠标自动吸附网格
                  <br />• 使用右侧面板调整属性
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
