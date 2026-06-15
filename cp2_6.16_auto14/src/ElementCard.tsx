import { memo } from 'react';
import { Element, CATEGORY_COLORS, CATEGORY_GLOW } from './elementData';

interface ElementCardProps {
  element: Element;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  searchQuery: string;
  onSelect: (element: Element) => void;
  onHover: (element: Element | null) => void;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="highlight-match">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function ElementCardComponent({
  element,
  isSelected,
  isHovered,
  isDimmed,
  searchQuery,
  onSelect,
  onHover,
}: ElementCardProps) {
  const bgColor = CATEGORY_COLORS[element.category];
  const glowColor = CATEGORY_GLOW[element.category];

  const boxShadow = isSelected
    ? `0 0 0 2px #ffffff, 0 4px 16px var(--shadow-card-hover)`
    : isHovered
    ? `0 0 20px ${glowColor}, 0 8px 24px var(--shadow-card-hover)`
    : `0 2px 8px var(--shadow-card)`;

  const cardClasses = [
    'element-card',
    isSelected ? 'selected' : '',
    isDimmed ? 'dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      style={{
        backgroundColor: bgColor,
        boxShadow,
        gridRow: element.row,
        gridColumn: element.col,
      }}
      onClick={() => onSelect(element)}
      onMouseEnter={() => onHover(element)}
      onMouseLeave={() => onHover(null)}
      data-atomic-number={element.atomicNumber}
    >
      <span className="atomic-number">{element.atomicNumber}</span>
      <span className="symbol">{highlightText(element.symbol, searchQuery)}</span>
      <span className="name">{highlightText(element.name, searchQuery)}</span>
      <span className="weight">{element.weight.toFixed(2)}</span>
    </div>
  );
}

export const ElementCard = memo(ElementCardComponent);
