import React from 'react';
import type { WeaveRule } from './App';
import { INITIAL_COLORS } from './App';

interface ControlPanelProps {
  weaveRule: WeaveRule;
  onRuleChange: (rule: WeaveRule) => void;
  onReset: () => void;
  onExport: () => void;
}

interface RuleOption {
  key: WeaveRule;
  name: string;
  description: string;
}

const RULE_OPTIONS: RuleOption[] = [
  { key: 'plain', name: '平纹', description: '每两根交错一次' },
  { key: 'twill', name: '斜纹', description: '每三根交错一次' },
  { key: 'satin', name: '缎纹', description: '每五根交错一次' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  weaveRule,
  onRuleChange,
  onReset,
  onExport,
}) => {
  return (
    <aside className="control-panel">
      <div className="panel-section">
        <h2 className="panel-title">编织规则</h2>
        <div className="rule-buttons">
          {RULE_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`rule-btn ${weaveRule === option.key ? 'active' : ''}`}
              onClick={() => onRuleChange(option.key)}
              title={option.description}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h2 className="panel-title">色板</h2>
        <div className="palette-section">
          <div className="palette">
            {INITIAL_COLORS.map((color, index) => (
              <div
                key={index}
                className="palette-item"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h2 className="panel-title">操作</h2>
        <div className="action-buttons">
          <button className="action-btn" onClick={onReset}>
            重置画布
          </button>
          <button className="action-btn" onClick={onExport}>
            导出PNG
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h2 className="panel-title">使用说明</h2>
        <div style={{ fontSize: '13px', color: '#7A6B5A', lineHeight: '1.8' }}>
          <p>• 按住鼠标左键拖拽绘制纬线</p>
          <p>• 横向为经线，纵向为纬线</p>
          <p>• 移动速度越快，粒子越稀疏</p>
          <p>• 按住时间越长，压力值越大</p>
        </div>
      </div>
    </aside>
  );
};

export default ControlPanel;
