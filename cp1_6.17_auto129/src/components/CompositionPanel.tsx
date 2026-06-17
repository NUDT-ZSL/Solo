import { useState } from 'react';
import { ELEMENTS, combineElements, getSingleElementSpell } from '../modules/element-combination';
import type { ElementType, Spell } from '../modules/element-combination';
import type { CombatLog } from '../modules/combat-simulator';
import './CompositionPanel.css';

interface CompositionPanelProps {
  onCastSpell: (spell: Spell) => void;
  logs: CombatLog[];
  resistance: number;
  onResistanceChange: (value: number) => void;
  canCast: boolean;
}

export function CompositionPanel({ onCastSpell, logs, resistance, onResistanceChange, canCast }: CompositionPanelProps) {
  const [selectedElements, setSelectedElements] = useState<ElementType[]>([]);
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  const currentSpell: Spell | null = (() => {
    if (selectedElements.length === 0) return null;
    if (selectedElements.length === 1) {
      return getSingleElementSpell(selectedElements[0]);
    }
    return combineElements(selectedElements);
  })();

  const handleElementClick = (elementId: ElementType) => {
    if (selectedElements.includes(elementId)) {
      setSelectedElements(selectedElements.filter(e => e !== elementId));
    } else if (selectedElements.length < 3) {
      setSelectedElements([...selectedElements, elementId]);
    }
  };

  const handleSlotClick = (index: number) => {
    const newElements = [...selectedElements];
    newElements.splice(index, 1);
    setSelectedElements(newElements);
  };

  const handleCastClick = () => {
    if (!currentSpell || !canCast) return;
    
    setIsButtonPressed(true);
    setTimeout(() => setIsButtonPressed(false), 100);
    
    onCastSpell(currentSpell);
  };

  const isCombinable = selectedElements.length >= 2 && currentSpell !== null;
  const isInvalid = selectedElements.length >= 2 && currentSpell === null;

  return (
    <div className="composition-panel">
      <h2 className="panel-title">元素组合</h2>
      
      <div className="elements-section">
        <h3 className="section-title">选择元素</h3>
        <div className="elements-grid">
          {ELEMENTS.map((element) => (
            <div
              key={element.id}
              className={`element-icon ${selectedElements.includes(element.id) ? 'selected' : ''}`}
              style={{ backgroundColor: element.color }}
              onClick={() => handleElementClick(element.id)}
              title={element.name}
            >
              <span className="element-emoji">{element.icon}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="combination-slots-section">
        <h3 className="section-title">组合槽 ({selectedElements.length}/3)</h3>
        <div className="combination-slots">
          {[0, 1, 2].map((index) => {
            const element = selectedElements[index];
            const elementInfo = element ? ELEMENTS.find(e => e.id === element) : null;
            
            return (
              <div
                key={index}
                className={`slot ${element ? 'filled' : 'empty'}`}
                style={{ backgroundColor: elementInfo ? elementInfo.color : 'transparent' }}
                onClick={() => element && handleSlotClick(index)}
              >
                {elementInfo ? (
                  <span className="slot-emoji">{elementInfo.icon}</span>
                ) : (
                  <span className="slot-placeholder">+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="spell-result-section">
        {selectedElements.length === 0 && (
          <div className="spell-hint">请选择元素进行组合</div>
        )}
        {selectedElements.length === 1 && currentSpell && (
          <div className="spell-info">
            <div className="spell-name" style={{ color: currentSpell.effectColor }}>
              {currentSpell.name}
            </div>
            <div className="spell-description">{currentSpell.description}</div>
            <div className="spell-damage">基础伤害: {currentSpell.baseDamage}</div>
          </div>
        )}
        {isCombinable && currentSpell && (
          <div className="spell-info combined">
            <div className="spell-name" style={{ color: currentSpell.effectColor }}>
              ✨ {currentSpell.name}
            </div>
            <div className="spell-description">{currentSpell.description}</div>
            <div className="spell-damage">基础伤害: {currentSpell.baseDamage}</div>
          </div>
        )}
        {isInvalid && (
          <div className="spell-invalid">
            ❌ 无法组合
            <div className="spell-invalid-hint">请尝试其他元素组合</div>
          </div>
        )}
      </div>

      <div className="cast-section">
        <div className={`cast-button-wrapper ${currentSpell ? 'active' : ''}`}>
          {currentSpell && (
            <div className="spell-glow">
              <span className="spell-glow-text">{currentSpell.name}</span>
            </div>
          )}
          <button
            className={`cast-button ${isButtonPressed ? 'pressed' : ''} ${!currentSpell || !canCast ? 'disabled' : ''}`}
            onClick={handleCastClick}
            disabled={!currentSpell || !canCast}
          >
            施 法
          </button>
        </div>
      </div>

      <div className="resistance-section">
        <h3 className="section-title">目标抗性</h3>
        <div className="resistance-control">
          <input
            type="range"
            min="0"
            max="50"
            value={resistance}
            onChange={(e) => onResistanceChange(Number(e.target.value))}
            className="resistance-slider"
          />
          <span className="resistance-value">{resistance}%</span>
        </div>
      </div>

      <div className="combat-log-section">
        <h3 className="section-title">战斗日志</h3>
        <div className="combat-log-list">
          {logs.length === 0 ? (
            <div className="log-empty">暂无战斗记录</div>
          ) : (
            logs.slice().reverse().map((log, index) => (
              <div key={log.timestamp + '-' + index} className="log-item">
                <span className="log-round">[回合{log.round}]</span>
                <span className="log-spell">{log.spellName}</span>
                <span className="log-arrow">-&gt;</span>
                <span className="log-damage">{log.damage}</span>
                <span className="log-arrow">-&gt;</span>
                <span className="log-hp">{log.remainingHp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
