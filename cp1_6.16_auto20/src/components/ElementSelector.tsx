import React from 'react';
import { ElementType, elementInfo, BASE_ELEMENTS, MAX_ELEMENTS_SELECTED } from '../data/GameData';

interface ElementCardProps {
  element: ElementType;
  isSelected: boolean;
  disabled: boolean;
  failAnimation: boolean;
  onClick: (element: ElementType) => void;
}

const ElementCard: React.FC<ElementCardProps> = React.memo(({ element, isSelected, disabled, failAnimation, onClick }) => {
  const info = elementInfo[element];

  const classNames = [
    'element-card',
    element,
    isSelected ? 'selected' : '',
    disabled ? 'disabled' : '',
    failAnimation ? 'composition-fail-animation' : '',
    failAnimation ? 'composition-fail-gray' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} onClick={() => !disabled && onClick(element)}>
      <span className="element-symbol">{info.symbol}</span>
      <span className="element-name">{info.name}</span>
    </div>
  );
});

ElementCard.displayName = 'ElementCard';

interface ElementSelectorProps {
  selectedElements: ElementType[];
  onToggleElement: (element: ElementType) => void;
  failAnimation: boolean;
}

const ElementSelector: React.FC<ElementSelectorProps> = ({ selectedElements, onToggleElement, failAnimation }) => {
  const canSelectMore = selectedElements.length < MAX_ELEMENTS_SELECTED;

  return (
    <div className="glass-container">
      <div className="section-title">元素选择</div>
      <div className="element-grid">
        {BASE_ELEMENTS.map(el => (
          <ElementCard
            key={el}
            element={el}
            isSelected={selectedElements.includes(el)}
            disabled={!selectedElements.includes(el) && !canSelectMore}
            failAnimation={failAnimation}
            onClick={onToggleElement}
          />
        ))}
      </div>
      <div className="selected-elements" style={{ marginTop: '12px' }}>
        {selectedElements.length > 0 && (
          <>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', opacity: 0.6 }}>已选：</span>
            {selectedElements.map((el, i) => {
              const info = elementInfo[el];
              return (
                <span key={i} className={`selected-tag ${el}`}>
                  {info.symbol} {info.name}
                </span>
              );
            })}
          </>
        )}
        {selectedElements.length === 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', opacity: 0.4 }}>
            选择 2-3 种元素进行合成
          </span>
        )}
      </div>
    </div>
  );
};

export default ElementSelector;
