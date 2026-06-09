import React, { useState, useCallback, useRef } from 'react';
import Canvas from './Canvas';
import ControlPanel from './ControlPanel';

export type WeaveRule = 'plain' | 'twill' | 'satin';

export const INITIAL_COLORS = [
  '#C9A07E',
  '#7EB8A0',
  '#B87E9E',
  '#A0C97E',
  '#7E8FB8',
  '#C9C97E',
];

const RULE_NAMES: Record<WeaveRule, string> = {
  plain: '平纹',
  twill: '斜纹',
  satin: '缎纹',
};

const App: React.FC = () => {
  const [weaveRule, setWeaveRule] = useState<WeaveRule>('plain');
  const [lineCount, setLineCount] = useState(0);
  const [mousePressure, setMousePressure] = useState(0);
  const canvasRef = useRef<{ reset: () => void; exportPNG: () => void } | null>(null);

  const handleLineAdded = useCallback(() => {
    setLineCount((prev) => prev + 1);
  }, []);

  const handleReset = useCallback(() => {
    canvasRef.current?.reset();
    setLineCount(0);
    setMousePressure(0);
  }, []);

  const handleExport = useCallback(() => {
    canvasRef.current?.exportPNG();
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>光流织机</h1>
      </header>
      <div className="main-content">
        <div className="canvas-wrapper">
          <Canvas
            ref={canvasRef}
            weaveRule={weaveRule}
            onLineAdded={handleLineAdded}
            onPressureChange={setMousePressure}
          />
          <div className="status-bar">
            <div className="status-item">
              <span className="status-label">编织规则</span>
              <span className="status-value">{RULE_NAMES[weaveRule]}</span>
            </div>
            <div className="status-item">
              <span className="status-label">已绘线条</span>
              <span className="status-value">{lineCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">鼠标压力</span>
              <span className="status-value">{mousePressure}%</span>
            </div>
          </div>
        </div>
        <ControlPanel
          weaveRule={weaveRule}
          onRuleChange={setWeaveRule}
          onReset={handleReset}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};

export default App;
