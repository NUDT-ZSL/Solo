import { useState } from 'react';
import type { Icon, GenerateResponse } from './types';
import './SvgGenerator.css';

interface SvgGeneratorProps {
  onGenerate: (icons: Icon[]) => void;
  totalCount: number;
  selectedCount: number;
  exportCount: number;
}

function SvgGenerator({ onGenerate, totalCount, selectedCount, exportCount }: SvgGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        throw new Error('生成失败');
      }
      
      const data: GenerateResponse = await response.json();
      onGenerate(data.icons);
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="svg-generator">
      <div className="input-section">
        <label className="input-label">图标描述</label>
        <textarea
          className="prompt-input"
          placeholder="请输入图标描述，例如：一只带着太阳镜的猫"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
        />
        <button
          className="generate-button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? '生成中...' : '生成图标'}
        </button>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">图标统计</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{totalCount}</span>
            <span className="stat-label">总图标数</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{selectedCount}</span>
            <span className="stat-label">选中数</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{exportCount}</span>
            <span className="stat-label">导出数</span>
          </div>
        </div>
      </div>

      <div className="instructions-section">
        <button
          className="instructions-toggle"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          使用说明
          <span className={`toggle-icon ${showInstructions ? 'open' : ''}`}>▼</span>
        </button>
        {showInstructions && (
          <div className="instructions-content">
            <p>1. 在上方输入框中描述你想要的图标</p>
            <p>2. 点击「生成图标」按钮，系统将生成4个风格一致的图标</p>
            <p>3. 点击卡片左上角复选框可选中图标</p>
            <p>4. 点击编辑按钮可修改SVG路径代码</p>
            <p>5. 拖拽图标卡片可调整顺序</p>
            <p>6. 选中多个图标后可批量导出</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SvgGenerator;
