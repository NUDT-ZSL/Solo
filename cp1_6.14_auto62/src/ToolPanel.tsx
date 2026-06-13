import React, { useRef } from 'react';
import {
  SkillCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from './TreeDataManager';

const TEMPLATES: { category: SkillCategory; desc: string }[] = [
  { category: 'active', desc: '需要主动释放的攻击或法术技能' },
  { category: 'passive', desc: '永久生效的属性增益技能' },
  { category: 'ultimate', desc: '强力终极技能，需高等级解锁' },
  { category: 'support', desc: '治疗或增益队友的辅助技能' },
  { category: 'aura', desc: '持续影响范围的光环效果' },
];

interface ToolPanelProps {
  onImport: (json: string) => void;
  onExport: () => void;
  onSave: () => void;
  onResetView: () => void;
  onClear: () => void;
}

const TemplateCard: React.FC<{ category: SkillCategory; desc: string }> = ({ category, desc }) => {
  const color = CATEGORY_COLORS[category];
  const label = CATEGORY_LABELS[category];
  const icon = CATEGORY_ICONS[category];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('category', category);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        height: 56,
        borderRadius: 8,
        background: '#0f3460',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 12,
        cursor: 'grab',
        transition: 'background 0.2s ease',
        borderLeft: `3px solid ${color}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = '#1a5276';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = '#0f3460';
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#7a8ba0', fontSize: 11 }}>{desc}</div>
      </div>
      <span style={{ color, fontSize: 10, opacity: 0.6 }}>拖拽</span>
    </div>
  );
};

export const ToolPanel: React.FC<ToolPanelProps> = ({
  onImport,
  onExport,
  onSave,
  onResetView,
  onClear,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) onImport(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div
        style={{
          width: '100%',
          height: 60,
          background: 'rgba(13, 27, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          borderBottom: '1px solid #1a3a5c',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <span style={{ color: '#4fc3f7', fontSize: 16, fontWeight: 700, marginRight: 16 }}>
          ⚡ 技能树编辑器
        </span>
        <ToolbarButton label="💾 保存" onClick={onSave} />
        <ToolbarButton label="📥 导入" onClick={handleImportClick} />
        <ToolbarButton label="📤 导出" onClick={onExport} />
        <ToolbarButton label="🔄 重置视图" onClick={onResetView} />
        <ToolbarButton label="🗑️ 清空" onClick={onClear} color="#ff7043" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </>
  );
};

const ToolbarButton: React.FC<{
  label: string;
  onClick: () => void;
  color?: string;
}> = ({ label, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 14px',
        background: '#0f3460',
        color: color || '#ffffff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        transition: 'background 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = '#1a5276';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = '#0f3460';
      }}
    >
      {label}
    </button>
  );
};

export const SidebarToolbox: React.FC = () => {
  return (
    <div
      style={{
        width: 280,
        background: '#16213e',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ color: '#4fc3f7', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        🧰 技能模板
      </div>
      {TEMPLATES.map(t => (
        <TemplateCard key={t.category} category={t.category} desc={t.desc} />
      ))}
      <div
        style={{
          color: '#5a6a7a',
          fontSize: 11,
          marginTop: 12,
          lineHeight: 1.6,
          padding: '8px 0',
          borderTop: '1px solid #1a3a5c',
        }}
      >
        拖拽模板到画布创建节点；双击节点进入连线模式，再点击目标节点创建连接；Shift+点击连线可删除。
      </div>
    </div>
  );
};
