import React, { useEffect, useState, useMemo } from 'react';
import {
  KeymapItem,
  KeyboardKey,
  KEYBOARD_LAYOUT,
  findKeyCodesForCombo,
  detectConflicts,
} from '../utils/keyboardLayout';

interface PreviewPanelProps {
  keymaps: KeymapItem[];
  recentlyChangedId: string | null;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ keymaps, recentlyChangedId }) => {
  const [pressedCodes, setPressedCodes] = useState<Set<string>>(new Set());
  const [conflictCodes, setConflictCodes] = useState<Set<string>>(new Set());
  const [showConflictWarning, setShowConflictWarning] = useState<Set<string>>(new Set());

  const conflicts = useMemo(() => detectConflicts(keymaps), [keymaps]);

  const codeToLabels: Map<string, { desc: string; hasConflict: boolean }> = useMemo(() => {
    const map = new Map();
    keymaps.forEach(item => {
      const codes = findKeyCodesForCombo(item.boundKey);
      const hasConflict = conflicts.has(item.id);
      codes.forEach(code => {
        const existing = map.get(code);
        if (existing) {
          existing.desc = item.description;
          existing.hasConflict = existing.hasConflict || hasConflict;
        } else {
          map.set(code, { desc: item.description, hasConflict });
        }
      });
    });
    return map;
  }, [keymaps, conflicts]);

  useEffect(() => {
    if (!recentlyChangedId) return;
    const item = keymaps.find(k => k.id === recentlyChangedId);
    if (!item) return;
    const codes = findKeyCodesForCombo(item.boundKey);
    if (codes.length === 0) return;

    const codeSet = new Set(codes);
    setPressedCodes(codeSet);

    const t = setTimeout(() => {
      setPressedCodes(new Set());
    }, 500);

    return () => clearTimeout(t);
  }, [recentlyChangedId, keymaps]);

  useEffect(() => {
    if (conflicts.size === 0) {
      setConflictCodes(new Set());
      setShowConflictWarning(new Set());
      return;
    }

    const codes: Set<string> = new Set();
    conflicts.forEach((ids) => {
      ids.forEach(id => {
        const item = keymaps.find(k => k.id === id);
        if (item) {
          findKeyCodesForCombo(item.boundKey).forEach(c => codes.add(c));
        }
      });
    });

    setConflictCodes(codes);
    setShowConflictWarning(new Set(codes));

    const t = setTimeout(() => {
      setShowConflictWarning(new Set());
    }, 3000);

    return () => clearTimeout(t);
  }, [conflicts, keymaps]);

  const renderRow = (row: KeyboardKey[], rowIdx: number) => {
    return (
      <div className="keyboard-row" key={rowIdx}>
        {row.map(key => {
          const codePressed = pressedCodes.has(key.code);
          const codeConflict = conflictCodes.has(key.code);
          const codeInfo = codeToLabels.get(key.code);
          const warning = showConflictWarning.has(key.code) && codeConflict;

          const classes = [
            'kb-key',
            `width-${key.width}`,
            key.height ? `height-${key.height}` : 'height-1',
            codePressed ? 'pressed' : '',
            codeConflict ? 'conflict' : '',
          ].filter(Boolean).join(' ');

          return (
            <div className={classes} key={key.code}>
              {key.label}
              {codeInfo && codePressed && (
                <div className="kb-key-label">{codeInfo.desc}</div>
              )}
              {warning && (
                <div className="conflict-warning">快捷键冲突!</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="preview-panel">
      <div className="preview-title">⌨️ 实时键盘预览</div>

      <div className="keyboard-wrapper">
        <div className="keyboard">
          {KEYBOARD_LAYOUT.map((row, idx) => renderRow(row, idx))}
        </div>
      </div>

      <div className="preview-legend">
        <div className="legend-title">图例说明</div>
        <div className="legend-item">
          <div className="legend-color legend-normal" />
          <span>正常按键</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-pressed" />
          <span>当前高亮（修改后0.5秒）</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-conflict" />
          <span>快捷键冲突</span>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
