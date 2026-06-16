import React, { useMemo } from 'react';
import { ELEMENT_COLORS, ELEMENT_LABELS } from '../gameLogic';
import type { ElementType } from '../gameLogic';
import type { CombatState, SpellDefinition } from '../combat';
import {
  COMBO_SPELLS,
  getAvailableSpellsForPlayer,
  matchSpellByElements,
} from '../combat';

interface SpellPanelProps {
  combat: CombatState;
  currentPlayerIndex: 0 | 1;
  selectedElements: ElementType[];
  onToggleElement: (e: ElementType) => void;
  onClearElements: () => void;
  onCastSpell: (spell: SpellDefinition) => void;
  onSelectSpell: (spell: SpellDefinition) => void;
  selectedSpellId: string | null;
  disabled: boolean;
}

const ALL_ELEMENTS: ElementType[] = ['fire', 'ice', 'thunder', 'wind'];

const ELEMENT_EMOJI: Record<ElementType, string> = {
  fire: '🔥',
  ice: '❄️',
  thunder: '⚡',
  wind: '🌪️',
};

const SpellPanel: React.FC<SpellPanelProps> = ({
  combat,
  currentPlayerIndex,
  selectedElements,
  onToggleElement,
  onClearElements,
  onCastSpell,
  onSelectSpell,
  selectedSpellId,
  disabled,
}) => {
  const matchedSpell = useMemo(
    () => matchSpellByElements(selectedElements),
    [selectedElements],
  );

  const available = useMemo(
    () => getAvailableSpellsForPlayer(combat, currentPlayerIndex),
    [combat, currentPlayerIndex],
  );

  const player = combat.characters[currentPlayerIndex];
  const canCastNow = matchedSpell
    ? available.find((a) => a.spell.id === matchedSpell.id)?.canCast ?? false
    : false;

  const handleCast = () => {
    if (matchedSpell && canCastNow && !disabled) {
      onCastSpell(matchedSpell);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.leftArea}>
        <div style={styles.panelCard}>
          <div style={styles.panelTitle}>元素组合（选择2-3种）</div>

          <div style={styles.selectedRow}>
            {[0, 1, 2].map((i) => {
              const elem = selectedElements[i];
              return (
                <div
                  key={i}
                  style={{
                    ...styles.selectedSlot,
                    borderColor: elem ? ELEMENT_COLORS[elem] : '#3a3a5e',
                    background: elem ? ELEMENT_COLORS[elem] + '33' : '#3a3a5e',
                  }}
                >
                  {elem ? (
                    <span style={{ fontSize: 16 }}>{ELEMENT_EMOJI[elem]}</span>
                  ) : (
                    <span style={{ color: '#5a5a7e', fontSize: 18 }}>?</span>
                  )}
                </div>
              );
            })}
            {selectedElements.length > 0 && (
              <button style={styles.clearBtn} onClick={onClearElements} disabled={disabled}>
                清空
              </button>
            )}
          </div>

          <div style={styles.elementRow}>
            {ALL_ELEMENTS.map((e) => {
              const selected = selectedElements.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => !disabled && onToggleElement(e)}
                  disabled={disabled || (!selected && selectedElements.length >= 3)}
                  style={{
                    ...styles.elementBtn,
                    borderColor: selected ? ELEMENT_COLORS[e] : 'transparent',
                    background: selected ? ELEMENT_COLORS[e] + '22' : '#2a2a3e',
                    transform: selected ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: selected
                      ? `0 0 20px ${ELEMENT_COLORS[e]}88`
                      : 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity:
                      disabled || (!selected && selectedElements.length >= 3)
                        ? 0.5
                        : 1,
                  }}
                  title={`${ELEMENT_LABELS[e]}元素`}
                >
                  <span style={{ fontSize: 22 }}>{ELEMENT_EMOJI[e]}</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: ELEMENT_COLORS[e],
                      marginTop: 2,
                      fontWeight: 'bold',
                    }}
                  >
                    {ELEMENT_LABELS[e]}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={styles.matchHint}>
            {matchedSpell ? (
              <span style={{ color: '#44ff88' }}>
                ✅ 匹配：<b>{matchedSpell.name}</b>（耗蓝 {matchedSpell.mpCost}，冷却 {matchedSpell.cooldownTurns}）
              </span>
            ) : selectedElements.length < 2 ? (
              <span style={{ color: '#888' }}>请继续选择元素...</span>
            ) : (
              <span style={{ color: '#ff8888' }}>⚠️ 无匹配的复合法术</span>
            )}
          </div>

          <div style={styles.castRow}>
            <button
              onClick={handleCast}
              disabled={!canCastNow || disabled}
              style={{
                ...styles.castBtn,
                opacity: !canCastNow || disabled ? 0.5 : 1,
                cursor: !canCastNow || disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (canCastNow && !disabled) {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px #ff6b6b66';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              ⚔️ 施 放 法 术
            </button>
            {matchedSpell && !canCastNow && (
              <span style={{ color: '#ff6b6b', fontSize: 12, marginLeft: 12 }}>
                {available.find((a) => a.spell.id === matchedSpell.id)?.reason}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={styles.rightArea}>
        <div style={styles.sideCard}>
          <div style={styles.panelTitle}>法术书（{player.name}）</div>
          <div style={styles.spellList}>
            {available.map(({ spell, canCast, remainingCooldown, reason }) => {
              const active = selectedSpellId === spell.id;
              const isMatched = matchedSpell?.id === spell.id;
              return (
                <div
                  key={spell.id}
                  onClick={() => {
                    if (!disabled) onSelectSpell(spell);
                  }}
                  style={{
                    ...styles.spellCard,
                    borderLeft: `4px solid ${spell.color}`,
                    background: isMatched ? spell.color + '22' : active ? '#3a3a5e' : '#2a2a3e',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: canCast ? 1 : 0.55,
                    boxShadow: isMatched ? `0 0 12px ${spell.color}66` : 'none',
                  }}
                  title={`元素：${spell.elements.map((e) => ELEMENT_LABELS[e]).join('+')}`}
                >
                  <div style={styles.spellCardLeft}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#e0e0ff' }}>
                      {spell.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#8888aa', marginTop: 2 }}>
                      {spell.elements.map((e) => ELEMENT_EMOJI[e]).join(' ')} · 伤害 {spell.damageMin}-{spell.damageMax}
                    </div>
                  </div>
                  <div style={styles.spellCardRight}>
                    <div style={{ color: '#4488ff', fontSize: 11, fontWeight: 'bold' }}>
                      💧{spell.mpCost}
                    </div>
                    {remainingCooldown > 0 ? (
                      <div style={{ color: '#ff6b6b', fontSize: 10 }}>⏳{remainingCooldown}</div>
                    ) : (
                      <div style={{ color: '#44ff88', fontSize: 10 }}>就绪</div>
                    )}
                  </div>
                  {!canCast && reason && (
                    <div style={styles.spellCardReason}>{reason}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    display: 'grid',
    gridTemplateColumns: '1fr 260px',
    gap: 16,
    padding: '12px 24px 20px',
    color: '#e0e0ff',
  },
  leftArea: {},
  rightArea: {},
  panelCard: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sideCard: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 12,
    width: 240,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#b0b0ff',
    marginBottom: 4,
    letterSpacing: 1,
  },
  selectedRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  selectedSlot: {
    width: 30,
    height: 30,
    borderRadius: 30,
    border: '2px solid #3a3a5e',
    background: '#3a3a5e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  clearBtn: {
    marginLeft: 8,
    background: '#2a2a3e',
    color: '#e0e0ff',
    border: '1px solid #3a3a5e',
    borderRadius: 8,
    padding: '4px 10px',
    fontSize: 11,
    cursor: 'pointer',
  },
  elementRow: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    padding: 4,
  },
  elementBtn: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '3px solid transparent',
    transition: 'all 0.2s ease',
    outline: 'none',
    padding: 0,
  },
  matchHint: {
    textAlign: 'center',
    fontSize: 12,
    minHeight: 18,
  },
  castRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: