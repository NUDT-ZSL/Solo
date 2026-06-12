import React from 'react';
import { Rune } from '../shared/RuneTypes';

interface RuneSelectorProps {
  runes: Rune[];
  selectedRuneIds: string[];
  onRuneToggle: (runeId: string) => void;
  onRuneRemove: (runeId: string) => void;
  maxSelection?: number;
}

const ELEMENT_LABELS: Record<string, string> = {
  fire: '火',
  ice: '冰',
  thunder: '雷',
  shadow: '暗',
  holy: '圣',
  poison: '毒',
  water: '水',
  earth: '土',
  wind: '风',
  arcane: '奥',
};

export const RuneSelector: React.FC<RuneSelectorProps> = ({
  runes,
  selectedRuneIds,
  onRuneToggle,
  onRuneRemove,
  maxSelection = 4,
}) => {
  const selectedRunes = runes.filter((r) => selectedRuneIds.includes(r.id));

  const handleRuneClick = (runeId: string) => {
    const isSelected = selectedRuneIds.includes(runeId);
    if (!isSelected && selectedRuneIds.length >= maxSelection) {
      return;
    }
    onRuneToggle(runeId);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">
        符文池 (已选 {selectedRuneIds.length}/{maxSelection})
      </h2>
      <div className="rune-grid">
        {runes.map((rune) => {
          const isSelected = selectedRuneIds.includes(rune.id);
          const canSelect = isSelected || selectedRuneIds.length < maxSelection;

          return (
            <div
              key={rune.id}
              className={`rune-item ${isSelected ? 'selected' : ''}`}
              onClick={() => canSelect && handleRuneClick(rune.id)}
              style={{ opacity: canSelect ? 1 : 0.4, cursor: canSelect ? 'pointer' : 'not-allowed' }}
              title={rune.description}
            >
              <div
                className="rune-icon-wrapper"
                style={{
                  background: `radial-gradient(circle, ${rune.glowColor}33 0%, transparent 70%)`,
                }}
              >
                <div
                  className="rune-icon"
                  style={{
                    background: `linear-gradient(135deg, ${rune.color}, ${rune.glowColor})`,
                    boxShadow: `0 0 8px ${rune.glowColor}aa`,
                    border: `2px solid ${rune.glowColor}66`,
                  }}
                >
                  {ELEMENT_LABELS[rune.element] || '?'}
                </div>
              </div>
              <span className="rune-name">{rune.name}</span>
              <span className="rune-stats">
                DMG:{rune.baseDamage} CD:{rune.cooldown}s
              </span>
            </div>
          );
        })}
      </div>

      <div className={`selected-runes ${selectedRunes.length === 0 ? 'empty' : ''}`}>
        {selectedRunes.length === 0 ? (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            点击上方符文选择最多{maxSelection}个符文组合技能
          </span>
        ) : (
          selectedRunes.map((rune) => (
            <div key={rune.id} className="selected-rune-card">
              <div
                className="card-icon"
                style={{
                  background: `linear-gradient(135deg, ${rune.color}, ${rune.glowColor})`,
                  boxShadow: `0 0 6px ${rune.glowColor}88`,
                }}
              >
                {ELEMENT_LABELS[rune.element] || '?'}
              </div>
              <span className="card-name">{rune.name}</span>
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRuneRemove(rune.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RuneSelector;
