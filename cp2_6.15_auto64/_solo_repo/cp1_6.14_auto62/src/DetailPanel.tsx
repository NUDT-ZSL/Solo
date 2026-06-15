import React from 'react';
import {
  SkillNode,
  SkillCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  ConnectionType,
} from './TreeDataManager';

interface DetailPanelProps {
  node: SkillNode | null;
  prerequisiteNodeNames: { id: string; name: string; connectionId: string }[];
  onUpdateNode: (id: string, updates: Partial<SkillNode>) => void;
  onRemoveConnection: (connectionId: string) => void;
  onRemoveNode: (id: string) => void;
  onAddConnection: (sourceId: string, targetId: string, type: ConnectionType) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f3460',
  border: '1px solid #1a3a5c',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#7a8ba0',
  fontSize: 11,
  marginBottom: 4,
  fontWeight: 500,
};

export const DetailPanel: React.FC<DetailPanelProps> = ({
  node,
  prerequisiteNodeNames,
  onUpdateNode,
  onRemoveConnection,
  onRemoveNode,
  onAddConnection,
}) => {
  if (!node) {
    return (
      <div style={panelStyle}>
        <div style={{ color: '#5a6a7a', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
          点击画布中的节点查看详情
        </div>
      </div>
    );
  }

  const color = CATEGORY_COLORS[node.category];
  const label = CATEGORY_LABELS[node.category];
  const icon = CATEGORY_ICONS[node.category];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNode(node.id, { name: e.target.value });
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      onUpdateNode(node.id, { cost: val });
    }
  };

  const handleCooldownChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onUpdateNode(node.id, { cooldown: 0 });
      return;
    }
    const val = parseInt(rawVal, 10);
    if (!isNaN(val)) {
      const clamped = Math.min(60, Math.max(0, val));
      onUpdateNode(node.id, { cooldown: clamped });
    }
  };

  const handleCooldownBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 0) {
      onUpdateNode(node.id, { cooldown: 0 });
    } else if (val > 60) {
      onUpdateNode(node.id, { cooldown: 60 });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 200) {
      onUpdateNode(node.id, { description: val });
    }
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 100) {
      onUpdateNode(node.id, { levelRequired: val });
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as SkillCategory;
    onUpdateNode(node.id, {
      category: newCategory,
      icon: CATEGORY_ICONS[newCategory],
    });
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: '3px solid #2d3436',
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>{node.name}</div>
          <div style={{ color, fontSize: 11 }}>{label}</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>技能名称</label>
        <input
          type="text"
          value={node.name}
          onChange={handleNameChange}
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = '#4fc3f7')}
          onBlur={e => (e.currentTarget.style.borderColor = '#1a3a5c')}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>技能类别</label>
        <select
          value={node.category}
          onChange={handleCategoryChange}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            appearance: 'none',
          }}
        >
          {(['active', 'passive', 'ultimate', 'support', 'aura'] as SkillCategory[]).map(cat => (
            <option key={cat} value={cat}>
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          消耗技能点数：<span style={{ color: '#4fc3f7' }}>{node.cost}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={node.cost}
          onChange={handleCostChange}
          style={{
            width: '100%',
            accentColor: '#4fc3f7',
            cursor: 'pointer',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#5a6a7a',
          }}
        >
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>冷却时间（秒，0-60）</label>
        <input
          type="number"
          min={0}
          max={60}
          step={1}
          value={node.cooldown}
          onChange={handleCooldownChange}
          onBlur={handleCooldownBlur}
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = '#4fc3f7')}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          效果描述（{node.description.length}/200）
        </label>
        <textarea
          value={node.description}
          onChange={handleDescriptionChange}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#4fc3f7')}
          onBlur={e => (e.currentTarget.style.borderColor = '#1a3a5c')}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>升级限制等级（1-100）</label>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          value={node.levelRequired}
          onChange={handleLevelChange}
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = '#4fc3f7')}
          onBlur={e => {
            const val = parseInt(e.currentTarget.value, 10);
            if (isNaN(val) || val < 1) onUpdateNode(node.id, { levelRequired: 1 });
            else if (val > 100) onUpdateNode(node.id, { levelRequired: 100 });
            e.currentTarget.style.borderColor = '#1a3a5c';
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>前置技能（点击移除连接）</label>
        {prerequisiteNodeNames.length === 0 ? (
          <div style={{ color: '#5a6a7a', fontSize: 12, padding: '6px 0' }}>暂无前置技能</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prerequisiteNodeNames.map(p => (
              <div
                key={p.connectionId}
                onClick={() => onRemoveConnection(p.connectionId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0f3460',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = '#1a5276';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = '#0f3460';
                }}
              >
                <span style={{ color: '#ffffff', fontSize: 12 }}>{p.name}</span>
                <span style={{ color: '#ff7043', fontSize: 11 }}>✕ 移除</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onRemoveNode(node.id)}
        style={{
          width: '100%',
          padding: '10px 0',
          background: 'rgba(255, 112, 67, 0.15)',
          border: '1px solid #ff7043',
          color: '#ff7043',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          transition: 'background 0.2s ease',
          marginTop: 8,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 112, 67, 0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 112, 67, 0.15)';
        }}
      >
        🗑️ 删除此节点
      </button>
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  width: 300,
  background: '#1a1a2e',
  borderRadius: 12,
  padding: 20,
  overflow: 'auto',
  flexShrink: 0,
  border: '1px solid #1a3a5c',
};
