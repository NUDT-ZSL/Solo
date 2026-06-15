import React, { useState, useCallback } from 'react';
import type { TextAnalysis } from '../types';

interface InputPanelProps {
  onAnalyze: (text: string, level: number) => void;
  analysis: TextAnalysis | null;
  gaugeAngle: number;
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

const GaugeChart: React.FC<{ value: number; angle: number }> = ({ value, angle }) => {
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 180;
  const endAngle = 360;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };

  const getColor = (val: number) => {
    if (val >= 80) return '#4CAF50';
    if (val >= 60) return '#8BC34A';
    if (val >= 40) return '#FFC107';
    if (val >= 20) return '#FF9800';
    return '#F44336';
  };

  const pointerLength = radius - strokeWidth - 15;
  const pointerAngle = startAngle + angle;
  const pointerEnd = polarToCartesian(cx, cy, pointerLength, pointerAngle);

  const tickMarks = [];
  for (let i = 0; i <= 10; i++) {
    const tickAngle = startAngle + (i / 10) * 180;
    const outerPos = polarToCartesian(cx, cy, radius - strokeWidth / 2, tickAngle);
    const innerPos = polarToCartesian(cx, cy, radius - strokeWidth - 5, tickAngle);
    tickMarks.push(
      <line
        key={i}
        x1={innerPos.x}
        y1={innerPos.y}
        x2={outerPos.x}
        y2={outerPos.y}
        stroke="#ccc"
        strokeWidth="2"
      />
    );
  }

  return (
    <svg width={size} height={size / 2 + 20} viewBox={`0 ${size / 2 - 20} ${size} ${size / 2 + 20}`}>
      <path
        d={describeArc(cx, cy, radius, startAngle, endAngle)}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      
      {tickMarks}
      
      <g style={{ transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)', transformOrigin: `${cx}px ${cy}px` }}>
        <line
          x1={cx}
          y1={cy}
          x2={pointerEnd.x}
          y2={pointerEnd.y}
          stroke="#4A90D9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="8" fill="#4A90D9" />
        <circle cx={cx} cy={cy} r="4" fill="#fff" />
      </g>
      
      <text
        x={cx}
        y={cy + 30}
        textAnchor="middle"
        style={{ fontSize: '28px', fontWeight: 'bold', fill: '#333' }}
      >
        {value.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 50}
        textAnchor="middle"
        style={{ fontSize: '12px', fill: '#999' }}
      >
        Flesch-Kincaid
      </text>
    </svg>
  );
};

export const InputPanel: React.FC<InputPanelProps> = ({
  onAnalyze,
  analysis,
  gaugeAngle,
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
    if (error) {
      setError(null);
    }
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

  return (
    <div className="input-panel">
      <div className="input-section">
        <div className="input-header">
          <h2>文章输入</h2>
          <span className="word-count">
            {text.trim().split(/\s+/).filter(w => w.length > 0).length} 词
          </span>
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
        
        <button
          className="analyze-btn"
          onClick={handleSubmit}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? '分析中...' : '开始分析'}
        </button>
      </div>

      {analysis && (
        <div className="analysis-section">
          <h2>难度分析</h2>
          <div className="gauge-container">
            <GaugeChart value={analysis.fleschKincaid} angle={gaugeAngle} />
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
          width: 280px;
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
        
        .difficulty-label {
          font-size: 14px;
          font-weight: 500;
          margin-top: 8px;
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
