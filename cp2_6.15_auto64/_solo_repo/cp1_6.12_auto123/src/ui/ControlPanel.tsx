import { useState } from 'react';
import { useStore } from '../store/useStore';
import { COLORS, BG_COLORS } from '../types';
import { hexToRgbaString } from '../utils/colorUtils';
import './ControlPanel.css';

type TabKey = 'particles' | 'connections' | 'background';

const colorNames: Record<string, string> = {
  '#00f0ff': '青',
  '#ff6b9d': '粉',
  '#ffd93d': '黄',
  '#6bcb77': '绿',
  '#6a4c93': '紫',
  '#fca311': '橙',
};

export function ControlPanel({ onReset }: { onReset: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('particles');
  const [isVisible, setIsVisible] = useState(true);

  const { particleConfig, connectionConfig, backgroundConfig,
    setParticleConfig, setConnectionConfig, setBackgroundConfig } = useStore();

  const toggleColor = (color: string) => {
    const colors = particleConfig.colors;
    if (colors.includes(color)) {
      if (colors.length > 1) {
        setParticleConfig({ colors: colors.filter(c => c !== color) });
      }
    } else {
      setParticleConfig({ colors: [...colors, color] });
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'particles', label: '粒子' },
    { key: 'connections', label: '连接' },
    { key: 'background', label: '背景' },
  ];

  return (
    <div className={`control-panel ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="panel-header">
        <div className="panel-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="reset-btn" onClick={onReset} title="重置">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'particles' && (
          <div className="tab-content fade-in">
            <div className="control-group">
              <label className="control-label">粒子数量: {particleConfig.count}</label>
              <input
                type="range"
                min="100"
                max="500"
                step="50"
                value={particleConfig.count}
                onChange={(e) => setParticleConfig({ count: Number(e.target.value) })}
                className="slider"
              />
            </div>

            <div className="control-group">
              <label className="control-label">粒子大小: {particleConfig.sizeMin}-{particleConfig.sizeMax}px</label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={particleConfig.sizeMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setParticleConfig({ sizeMin: Math.max(1, val - 2), sizeMax: val });
                }}
                className="slider"
              />
            </div>

            <div className="control-group">
              <label className="control-label">颜色</label>
              <div className="color-list">
                {COLORS.map(color => (
                  <div
                    key={color}
                    className={`color-item ${particleConfig.colors.includes(color) ? 'selected' : ''}`}
                    onClick={() => toggleColor(color)}
                  >
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: color, boxShadow: `0 0 8px ${hexToRgbaString(color, 0.6)}` }}
                    />
                    <span className="color-name">{colorNames[color] || color}</span>
                    <div className="color-checkbox">
                      {particleConfig.colors.includes(color) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="tab-content fade-in">
            <div className="control-group">
              <label className="control-label">连接距离: {connectionConfig.maxDistance}px</label>
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                value={connectionConfig.maxDistance}
                onChange={(e) => setConnectionConfig({ maxDistance: Number(e.target.value) })}
                className="slider"
              />
            </div>

            <div className="control-group">
              <label className="control-label">透明度强度: {connectionConfig.opacityMax.toFixed(1)}</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={connectionConfig.opacityMax}
                onChange={(e) => setConnectionConfig({ opacityMax: Number(e.target.value) })}
                className="slider"
              />
            </div>

            <div className="control-group">
              <div className="toggle-row">
                <span className="control-label">荧光线条效果</span>
                <button
                  className={`toggle-switch ${connectionConfig.glowEnabled ? 'on' : 'off'}`}
                  onClick={() => setConnectionConfig({ glowEnabled: !connectionConfig.glowEnabled })}
                >
                  <div className="toggle-knob" />
                </button>
              </div>
              <p className="hint-text">开启后性能约降为 70%</p>
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="tab-content fade-in">
            <div className="control-group">
              <label className="control-label">模式</label>
              <div className="mode-buttons">
                {(['solid', 'gradient', 'stars'] as const).map(mode => (
                  <button
                    key={mode}
                    className={`mode-btn ${backgroundConfig.mode === mode ? 'active' : ''}`}
                    onClick={() => setBackgroundConfig({ mode })}
                  >
                    {mode === 'solid' ? '纯色' : mode === 'gradient' ? '渐变' : '星空'}
                  </button>
                ))}
              </div>
            </div>

            {backgroundConfig.mode === 'solid' && (
              <div className="control-group">
                <label className="control-label">背景色</label>
                <div className="bg-color-list">
                  {BG_COLORS.map(color => (
                    <button
                      key={color}
                      className={`bg-color-btn ${backgroundConfig.solidColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color, border: backgroundConfig.solidColor === color ? '2px solid #00f0ff' : '2px solid transparent' }}
                      onClick={() => setBackgroundConfig({ solidColor: color })}
                    />
                  ))}
                </div>
              </div>
            )}

            {backgroundConfig.mode === 'gradient' && (
              <div className="control-group">
                <label className="control-label">渐变颜色</label>
                <div className="gradient-picker">
                  <div className="gradient-item">
                    <span>顶部</span>
                    <input
                      type="color"
                      value={backgroundConfig.gradientTop}
                      onChange={(e) => setBackgroundConfig({ gradientTop: e.target.value })}
                    />
                  </div>
                  <div className="gradient-item">
                    <span>底部</span>
                    <input
                      type="color"
                      value={backgroundConfig.gradientBottom}
                      onChange={(e) => setBackgroundConfig({ gradientBottom: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {backgroundConfig.mode === 'stars' && (
              <div className="control-group">
                <label className="control-label">星星数量: {backgroundConfig.starCount}</label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={backgroundConfig.starCount}
                  onChange={(e) => setBackgroundConfig({ starCount: Number(e.target.value) })}
                  className="slider"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
