import { useState } from 'react';
import { LanguageName, LANGUAGES, LANGUAGE_COLORS } from '../types';
import './ControlPanel.css';

interface ControlPanelProps {
  selectedLanguage: LanguageName;
  onLanguageChange: (lang: LanguageName) => void;
  onRefresh: () => void;
}

function ControlPanel({ selectedLanguage, onLanguageChange, onRefresh }: ControlPanelProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const languageOptions: { value: LanguageName; label: string }[] = [
    { value: 'all', label: '所有语言（平均）' },
    ...LANGUAGES.map(lang => ({ value: lang, label: lang }))
  ];

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h1 className="panel-title">
          <span className="title-icon">📊</span>
          语言趋势 3D
        </h1>
        <p className="panel-subtitle">GitHub 编程语言演变可视化</p>
      </div>

      <div className="panel-section">
        <label className="section-label">数据视图</label>
        <div className="custom-dropdown">
          <button
            className="dropdown-toggle"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span
              className="dropdown-color-dot"
              style={{
                backgroundColor: selectedLanguage === 'all' ? '#00d2ff' : LANGUAGE_COLORS[selectedLanguage]
              }}
            />
            <span className="dropdown-text">
              {languageOptions.find(opt => opt.value === selectedLanguage)?.label}
            </span>
            <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {languageOptions.map(option => (
                <button
                  key={option.value}
                  className={`dropdown-item ${selectedLanguage === option.value ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange(option.value);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span
                    className="dropdown-color-dot"
                    style={{
                      backgroundColor: option.value === 'all' ? '#00d2ff' : LANGUAGE_COLORS[option.value]
                    }}
                  />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">图例说明</label>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color heatmap-legend" />
            <span>曲面热力图：仓库数量</span>
          </div>
          <div className="legend-item">
            <div className="legend-color line-legend" />
            <span>折线图：贡献者活跃度</span>
          </div>
          <div className="legend-item">
            <div className="legend-color bar-legend" />
            <span>柱状图：Issue 解决比例</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">语言色卡</label>
        <div className="language-colors">
          {LANGUAGES.map(lang => (
            <div key={lang} className="language-color-item">
              <div
                className="language-color-dot"
                style={{ backgroundColor: LANGUAGE_COLORS[lang] }}
              />
              <span className="language-color-label">{lang}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <button className="refresh-button" onClick={onRefresh}>
          🔄 刷新数据
        </button>
      </div>

      <div className="panel-footer">
        <p className="tip-text">💡 点击柱状图切换语言</p>
        <p className="tip-text">🖱️ 拖拽旋转视角</p>
        <p className="tip-text">🔍 滚轮缩放</p>
      </div>
    </div>
  );
}

export default ControlPanel;
