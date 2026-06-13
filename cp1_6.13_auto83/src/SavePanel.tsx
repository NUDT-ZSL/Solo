import { useState } from 'react';
import type { FontScheme } from './App';

interface SavePanelProps {
  schemes: FontScheme[];
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onSave: (name: string) => void;
  onLoad: (scheme: FontScheme) => void;
  onDelete: (id: string) => void;
}

export default function SavePanel({
  schemes,
  drawerOpen,
  onToggleDrawer,
  onSave,
  onLoad,
  onDelete,
}: SavePanelProps) {
  const [schemeName, setSchemeName] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = schemeName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setSchemeName('');
  };

  return (
    <div className={`save-drawer${drawerOpen ? ' open' : ''}`}>
      <div className="drawer-handle" onClick={onToggleDrawer}>
        <div className="handle-bar" />
        <span className="handle-text">{drawerOpen ? '收起方案' : '已保存方案'}</span>
      </div>
      <div className="drawer-content">
        <div className="save-input-row">
          <input
            type="text"
            placeholder="输入方案名称..."
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            className="scheme-name-input"
          />
          <button onClick={handleSave} className="save-btn" disabled={!schemeName.trim()}>
            保存
          </button>
        </div>
        <div className="scheme-cards">
          {schemes.length === 0 && (
            <p className="no-schemes">暂无保存的方案</p>
          )}
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className={`scheme-card${hoveredId === scheme.id ? ' hovered' : ''}`}
              onClick={() => onLoad(scheme)}
              onMouseEnter={() => setHoveredId(scheme.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="scheme-thumbnail"
                style={{ fontFamily: `'${scheme.fonts[0]}', sans-serif` }}
              >
                <span>Aa</span>
              </div>
              <div className="scheme-card-info">
                <span className="scheme-card-name">{scheme.name}</span>
                <span className="scheme-card-fonts">
                  {scheme.fonts.join(' / ')}
                </span>
              </div>
              <button
                className="delete-scheme-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(scheme.id);
                }}
                title="删除方案"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
