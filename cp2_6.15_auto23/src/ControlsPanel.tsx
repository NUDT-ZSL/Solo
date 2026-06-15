import React, { useState, useEffect } from 'react';
import { useStore, type Rules } from './store';

export default function ControlsPanel() {
  const isRunning = useStore((state) => state.isRunning);
  const speed = useStore((state) => state.speed);
  const rules = useStore((state) => state.rules);
  const generation = useStore((state) => state.generation);
  const gridSize = useStore((state) => state.gridSize);
  const performanceMode = useStore((state) => state.performanceMode);
  const setRunning = useStore((state) => state.setRunning);
  const setSpeed = useStore((state) => state.setSpeed);
  const setRules = useStore((state) => state.setRules);
  const step = useStore((state) => state.step);
  const randomInit = useStore((state) => state.randomInit);
  const clear = useStore((state) => state.clear);
  const setPerformanceMode = useStore((state) => state.setPerformanceMode);

  const [surviveInput, setSurviveInput] = useState(rules.survive.join(','));
  const [birthInput, setBirthInput] = useState(rules.birth.join(','));
  const [showSizeWarning, setShowSizeWarning] = useState(gridSize > 16);

  useEffect(() => {
    setShowSizeWarning(gridSize > 16);
  }, [gridSize]);

  useEffect(() => {
    setSurviveInput(rules.survive.join(','));
    setBirthInput(rules.birth.join(','));
  }, [rules]);

  const parseRules = (input: string): number[] | null => {
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
    const nums = parts.map((p) => parseInt(p, 10));
    if (nums.some(isNaN) || nums.length < 1 || nums.length > 4) return null;
    if (nums.some((n) => n < 0 || n > 26)) return null;
    return [...new Set(nums)].sort((a, b) => a - b);
  };

  const handleApplyRules = () => {
    const survive = parseRules(surviveInput);
    const birth = parseRules(birthInput);
    if (survive && birth) {
      setRules({ survive, birth });
    }
  };

  const handleToggleRun = () => {
    setRunning(!isRunning);
  };

  const handleStep = () => {
    if (!isRunning) {
      step();
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseInt(e.target.value, 10);
    setSpeed(newSpeed);
  };

  const aliveCount = useStore((state) => {
    let count = 0;
    for (let x = 0; x < state.gridSize; x++) {
      for (let y = 0; y < state.gridSize; y++) {
        for (let z = 0; z < state.gridSize; z++) {
          if (state.grid[x][y][z].alive) count++;
        }
      }
    }
    return count;
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 280,
        height: '100vh',
        background: 'rgba(17, 17, 34, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        padding: '24px 20px',
        boxSizing: 'border-box',
        color: '#e0e0e0',
        overflowY: 'auto',
        zIndex: 100,
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .btn-base {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #ffffff;
          letter-spacing: 0.5px;
        }
        .btn-base:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.2);
        }
        .btn-base:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-start {
          background: linear-gradient(135deg, #00ff88 0%, #00cc66 100%);
          box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
        }
        .btn-pause {
          background: linear-gradient(135deg, #ff8844 0%, #cc6622 100%);
          box-shadow: 0 4px 15px rgba(255, 136, 68, 0.3);
        }
        .btn-secondary {
          background: linear-gradient(135deg, #3a3a5a 0%, #2a2a4a 100%);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .btn-danger {
          background: linear-gradient(135deg, #ff4466 0%, #cc2244 100%);
          box-shadow: 0 4px 15px rgba(255, 68, 102, 0.3);
        }
        .input-base {
          width: 100%;
          padding: 10px 12px;
          background: #2a2a3a;
          border: 1px solid #00ff88;
          border-radius: 6px;
          color: #e0e0e0;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-base:focus {
          outline: none;
          border-color: #00ffaa;
          box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
        }
        .label {
          display: block;
          font-size: 13px;
          margin-bottom: 6px;
          color: #a0a0c0;
          font-weight: 500;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #ffffff;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        }
        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .stat-label {
          color: #a0a0c0;
        }
        .stat-value {
          color: #00ff88;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        .warning-box {
          background: rgba(255, 136, 68, 0.15);
          border: 1px solid rgba(255, 136, 68, 0.5);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #ffaa77;
          animation: pulse 2s ease-in-out infinite;
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #2a2a3a;
          transition: 0.3s;
          border-radius: 24px;
          border: 1px solid #00ff88;
        }
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: #00ff88;
          transition: 0.3s;
          border-radius: 50%;
        }
        input:checked + .toggle-slider {
          background-color: #00ff88;
        }
        input:checked + .toggle-slider:before {
          transform: translateX(24px);
          background-color: #111122;
        }
      `}</style>

      <div className="section">
        <h1 style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#00ff88',
          margin: 0,
          letterSpacing: 1,
          textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
        }}>
          3D 生命游戏
        </h1>
        <p style={{ fontSize: 12, color: '#8080a0', marginTop: 4 }}>
          三维细胞自动机演化模拟器
        </p>
      </div>

      {showSizeWarning && (
        <div className="warning-box">
          ⚠️ 当前网格尺寸 {gridSize}×{gridSize}×{gridSize} 较大，可能影响性能。建议开启性能模式。
        </div>
      )}

      <div className="section">
        <div className="section-title">运行控制</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`btn-base ${isRunning ? 'btn-pause' : 'btn-start'}`}
            onClick={handleToggleRun}
            style={{ flex: 1 }}
          >
            {isRunning ? (
              <>
                <span className="spinner" />
                暂停
              </>
            ) : (
              '▶ 运行'
            )}
          </button>

          <button
            className="btn-base btn-secondary"
            onClick={handleStep}
            disabled={isRunning}
            style={{ width: 80 }}
          >
            步进
          </button>
        </div>

        <div>
          <span className="label">演化速度: {speed} 步/秒</span>
          <input
            type="range"
            min="1"
            max="10"
            value={speed}
            onChange={handleSpeedChange}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: '#2a2a3a',
              outline: 'none',
              WebkitAppearance: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#606080', marginTop: 2 }}>
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">演化规则</div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">存活规则 (2-4个数字，逗号分隔)</label>
          <input
            type="text"
            className="input-base"
            value={surviveInput}
            onChange={(e) => setSurviveInput(e.target.value)}
            placeholder="例如: 2,3"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">出生规则 (2-4个数字，逗号分隔)</label>
          <input
            type="text"
            className="input-base"
            value={birthInput}
            onChange={(e) => setBirthInput(e.target.value)}
            placeholder="例如: 3"
          />
        </div>

        <button
          className="btn-base btn-secondary"
          onClick={handleApplyRules}
        >
          ✓ 应用规则
        </button>

        <div style={{
          marginTop: 12,
          padding: 10,
          background: 'rgba(0, 255, 136, 0.05)',
          borderRadius: 6,
          fontSize: 12,
          color: '#80ffaa',
        }}>
          当前规则: B{rules.birth.join('')}/S{rules.survive.join('')}
        </div>
      </div>

      <div className="section">
        <div className="section-title">网格操作</div>

        <button
          className="btn-base btn-secondary"
          onClick={randomInit}
          style={{ marginBottom: 10 }}
        >
          🎲 随机初始化 (50%)
        </button>

        <button
          className="btn-base btn-danger"
          onClick={clear}
        >
          🗑 清空网格
        </button>
      </div>

      {showSizeWarning && (
        <div className="section">
          <div className="section-title">性能选项</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#a0a0c0' }}>性能模式 (点精灵)</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">统计信息</div>
        <div className="stat-item">
          <span className="stat-label">当前代数</span>
          <span className="stat-value">{generation}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">存活细胞</span>
          <span className="stat-value">{aliveCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">网格尺寸</span>
          <span className="stat-value">{gridSize}³</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">总细胞数</span>
          <span className="stat-value">{gridSize ** 3}</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">操作提示</div>
        <div style={{ fontSize: 12, color: '#8080a0', lineHeight: 1.6 }}>
          <p>• 拖拽鼠标旋转视角</p>
          <p>• 滚轮缩放</p>
          <p>• 点击细胞切换状态</p>
          <p>• Shift + 拖拽框选多个细胞</p>
        </div>
      </div>

      <div className="section">
        <div className="section-title">颜色说明</div>
        <div style={{ fontSize: 12, lineHeight: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12, height: 12,
              background: '#00ff88',
              borderRadius: 2,
              boxShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
            }} />
            <span style={{ color: '#a0a0c0' }}>新生细胞 (0-2代)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12, height: 12,
              background: '#ff8800',
              borderRadius: 2,
              boxShadow: '0 0 8px rgba(255, 136, 0, 0.5)',
            }} />
            <span style={{ color: '#a0a0c0' }}>成熟细胞 (3-9代)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12, height: 12,
              background: '#ff3355',
              borderRadius: 2,
              boxShadow: '0 0 8px rgba(255, 51, 85, 0.5)',
            }} />
            <span style={{ color: '#a0a0c0' }}>老年细胞 (10+代)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
