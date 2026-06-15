import React, { useState, useCallback } from 'react';
import type { TextAnalysis } from '../types';

interface InputPanelProps {
  onAnalyze: (text: string, level: number) => void;
  analysis: TextAnalysis | null;
  gaugeValue: number;
  isAnalyzing: boolean;
  selectedLevel: number;
  onLevelChange: (level: number) => void;
}

const levels = [
  { level: 1, label: 'L1', desc: '入门级' },
  { level: 2, label: 'L2', desc: '基础级' },
  { level: 3, label: 'L3', desc: '进阶级' },
  { level: 4, label: 'L4', desc: '高级' },
  { level: 5, label: 'L5', desc: '原文' },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, endAngle);
  const e = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

const GaugeChart: React.FC<{ value: number; fkScore: number }> = ({ value, fkScore }) => {
  const W = 220;
  const cx = W / 2;
  const cy = W / 2;
  const R = 85;
  const SW = 14;
  const INNER_R = R - SW / 2;
  const pointerLen = R - SW - 10;
  const rotationDeg = (value / 100) * 180;

  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = 180 + i * 18;
    const o = polarToCartesian(cx, cy, INNER_R, a);
    const n = polarToCartesian(cx, cy, INNER_R - 8, a);
    ticks.push(
      <line key={i} x1={n.x} y1={n.y} x2={o.x} y2={o.y} stroke="#ccc" strokeWidth="1.5" />
    );
  }

  const labels = [
    { angle: 180, text: '0' },
    { angle: 225, text: '5' },
    { angle: 270, text: '10' },
    { angle: 315, text: '15' },
    { angle: 360, text: '20' },
  ];

  return (
    <div className="gauge-wrap">
      <svg
        width={W}
        height={W / 2 + 40}
        viewBox={`0 0 ${W} ${W / 2 + 40}`}
        className="gauge-svg"
      >
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="40%" stopColor="#FFC107" />
            <stop offset="75%" stopColor="#FF9800" />
            <stop offset="100%" stopColor="#F44336" />
          </linearGradient>
        </defs>

        <path
          d={describeArc(cx, cy, R, 180, 360)}
          fill="none"
          stroke="#eee"
          strokeWidth={SW}
          strokeLinecap="round"
        />
        <path
          d={describeArc(cx, cy, R, 180, 360)}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={SW}
          strokeLinecap="round"
          opacity={0.25}
        />

        {ticks}

        {labels.map((l, i) => {
          const p = polarToCartesian(cx, cy, INNER_R - 18, l.angle);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: '10px', fill: '#aaa' }}
            >
              {l.text}
            </text>
          );
        })}

        <g
          className="gauge-pointer"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx - pointerLen}
            y2={cy}
            stroke="#4A90D9"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="8" fill="#4A90D9" />
          <circle cx={cx} cy={cy} r="4" fill="#fff" />
        </g>

        <text
          x={cx}
          y={cy + 32}
          textAnchor="middle"
          style={{ fontSize: '26px', fontWeight: 'bold', fill: '#333' }}
        >
          {fkScore.toFixed(1)}
        </text>
        <text
          x={cx}
          y={cy + 50}
          textAnchor="middle"
          style={{ fontSize: '11px', fill: '#999' }}
        >
          FK Grade Level
        </text>
      </svg>
    </div>
  );
};

export const InputPanel: React.FC<InputPanelProps> = ({
  onAnalyze,
  analysis,
  gaugeValue,
  isAnalyzing,
  selectedLevel,
  onLevelChange,
}) => {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 100) {
      setError('文章至少需要100个单词，请输入更长的英文文章。');
      return;
    }
    setError(null);
    onAnalyze(text, selectedLevel);
  }, [text, selectedLevel, onAnalyze]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (error) setError(null);
  }, [error]);

  const getLevelDescription = (score: number) => {
    if (score >= 90) return { text: '5年级水平', color: '#4CAF50' };
    if (score >= 80) return { text: '6年级水平', color: '#4CAF50' };
    if (score >= 70) return { text: '8年级水平', color: '#8BC34A' };
    if (score >= 60) return { text: '9年级水平', color: '#FFC107' };
    if (score >= 50) return { text: '高中水平', color: '#FF9800' };
    if (score >= 30) return { text: '大学水平', color: '#FF5722' };
    return { text: '研究生水平', color: '#F44336' };
  };

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="input-panel">
      <div className="input-section">
        <div className="input-header">
          <h2>文章输入</h2>
          <span className="word-count">{wordCount} 词</span>
        </div>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="请在此粘贴英文文章（至少100词）..."
          className="text-input"
        />
        {error && <div className="error-message">{error}</div>}

        <div className="level-selector">
          <span className="level-label">选择难度级别：</span>
          <div className="level-buttons">
            {levels.map(({ level, label, desc }) => (
              <button
                key={level}
                className={`level-btn ${selectedLevel === level ? 'active' : ''}`}
                onClick={() => onLevelChange(level)}
                title={desc}
              >
                <span className="level-num">{label}</span>
                <span className="level-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="analyze-btn" onClick={handleSubmit} disabled={isAnalyzing}>
          {isAnalyzing ? '分析中...' : '开始分析'}
        </button>
      </div>

      {analysis && (
        <div className="analysis-section">
          <h2>难度分析</h2>
          <div className="gauge-container">
            <GaugeChart value={gaugeValue} fkScore={analysis.fleschKincaid} />
            <div
              className="difficulty-label"
              style={{ color: getLevelDescription(analysis.fleschKincaid).color }}
            >
              {getLevelDescription(analysis.fleschKincaid).text}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{analysis.totalWords}</div>
              <div className="stat-label">总词数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analysis.uniqueWords}</div>
              <div className="stat-label">不重复词数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analysis.avgSentenceLength}</div>
              <div className="stat-label">平均句长</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-panel {
          display: flex;
          gap: 24px;
          padding: 24px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .input-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .input-header h2 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        .word-count {
          font-size: 13px;
          color: #999;
        }
        .text-input {
          width: 100%;
          min-height: 180px;
          padding: 14px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .text-input:focus {
          outline: none;
          border-color: #4A90D9;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
        }
        .error-message {
          color: #f44336;
          font-size: 13px;
          margin-top: -8px;
        }
        .level-selector {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .level-label {
          font-size: 14px;
          color: #666;
        }
        .level-buttons {
          display: flex;
          gap: 8px;
        }
        .level-btn {
          flex: 1;
          padding: 10px 8px;
          border: 1px solid #e0e0e0;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: all 0.25s ease;
        }
        .level-btn:hover {
          border-color: #4A90D9;
          background: #f0f7ff;
        }
        .level-btn.active {
          border-color: #4A90D9;
          background: #4A90D9;
          color: #fff;
        }
        .level-num {
          font-size: 16px;
          font-weight: 600;
        }
        .level-desc {
          font-size: 11px;
          opacity: 0.8;
        }
        .analyze-btn {
          padding: 12px 24px;
          background: #4A90D9;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .analyze-btn:hover:not(:disabled) {
          background: #3a7bc8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 217, 0.3);
        }
        .analyze-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .analyze-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .analysis-section {
          width: 300px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-left: 1px solid #f0f0f0;
          padding-left: 24px;
        }
        .analysis-section h2 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        .gauge-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .gauge-wrap {
          display: flex;
          justify-content: center;
        }
        .gauge-svg {
          overflow: visible;
        }
        .gauge-pointer {
          will-change: transform;
        }
        .difficulty-label {
          font-size: 14px;
          font-weight: 500;
          margin-top: 4px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .stat-card {
          text-align: center;
          padding: 12px 8px;
          background: #f8f9fa;
          border-radius: 8px;
          transition: background 0.2s ease;
        }
        .stat-card:hover {
          background: #f0f7ff;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #4A90D9;
        }
        .stat-label {
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};
