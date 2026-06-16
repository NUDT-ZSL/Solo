import React, { useState, useCallback } from 'react';
import PaletteBoard from './components/PaletteBoard';
import { usePalette } from './hooks/usePalette';
import { useScheme } from './hooks/useScheme';
import { formatCssVariables, copyToClipboard } from './utils/copyUtil';
import type { ColorScheme } from './utils/copyUtil';

interface SchemeCardProps {
  scheme: ColorScheme;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

const SchemeCard: React.FC<SchemeCardProps> = React.memo(({ scheme, onRename, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scheme.name);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState(false);

  const allColors = [scheme.color1, ...scheme.mixed, scheme.color2];

  const handleNameClick = useCallback(() => {
    setEditName(scheme.name);
    setIsEditing(true);
  }, [scheme.name]);

  const handleNameBlur = useCallback(() => {
    onRename(scheme.id, editName.trim() || scheme.name);
    setIsEditing(false);
  }, [editName, onRename, scheme.id, scheme.name]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onRename(scheme.id, editName.trim() || scheme.name);
        setIsEditing(false);
      }
      if (e.key === 'Escape') {
        setEditName(scheme.name);
        setIsEditing(false);
      }
    },
    [editName, onRename, scheme.id, scheme.name],
  );

  const handleCopyCss = useCallback(async () => {
    const css = formatCssVariables(scheme);
    const ok = await copyToClipboard(css);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    }
  }, [scheme]);

  const handleRemove = useCallback(() => {
    setRemoving(true);
    setTimeout(() => onRemove(scheme.id), 300);
  }, [onRemove, scheme.id]);

  return (
    <div className={`scheme-card ${removing ? 'removing' : ''}`}>
      <div className="scheme-colors-bar">
        {allColors.map((c, i) => (
          <div
            key={i}
            className="scheme-color-strip"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
      <div className="scheme-name-area">
        {isEditing ? (
          <input
            className="scheme-name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            autoFocus
          />
        ) : (
          <span className="scheme-name" onClick={handleNameClick}>
            {scheme.name}
          </span>
        )}
      </div>
      <div className="scheme-actions">
        <button className="copy-css-btn" onClick={handleCopyCss}>
          {copied ? '已复制!' : '复制CSS'}
        </button>
        <button className="delete-btn" onClick={handleRemove}>
          ✕
        </button>
      </div>
    </div>
  );
});

SchemeCard.displayName = 'SchemeCard';

const App: React.FC = () => {
  const { colors, updateColor } = usePalette();
  const { schemes, addScheme, renameScheme, removeScheme } = useScheme();

  const handleMixResult = useCallback(
    (color1: string, color2: string, mixed: string[]) => {
      addScheme(color1, color2, mixed);
    },
    [addScheme],
  );

  const handleRandomMix = useCallback(() => {}, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 数字调色板</h1>
        <p className="app-subtitle">拖拽混色 · 保存方案 · 导出CSS</p>
      </header>
      <div className="app-body">
        <div className="left-panel">
          <PaletteBoard
            colors={colors}
            onUpdateColor={updateColor}
            onMixResult={handleMixResult}
            onRandomMix={handleRandomMix}
          />
        </div>
        <div className="right-panel">
          <h2 className="section-title">📚 配色库</h2>
          {schemes.length === 0 ? (
            <div className="empty-state">
              <p>暂无配色方案</p>
              <p className="empty-hint">拖拽色块混合或点击随机混合来创建</p>
            </div>
          ) : (
            <div className="scheme-grid">
              {schemes.map((scheme) => (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  onRename={renameScheme}
                  onRemove={removeScheme}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
