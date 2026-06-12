import { useEffect, useState } from 'react';
import type { Card } from '../types';
import { getRarityColor, getRarityLabel, getTypeIcon } from '../cardPool';

interface Props {
  title: string;
  cards: Card[];
  onSelect: (card: Card | null) => void;
  allowSkip?: boolean;
}

export default function CardSelectionModal({
  title,
  cards,
  onSelect,
  allowSkip = true,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`modal-backdrop ${mounted ? 'in' : ''}`} onClick={allowSkip ? () => onSelect(null) : undefined}>
      <div
        className={`card-selection-modal ${mounted ? 'in' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="modal-title">{title}</h2>
        <div className="card-grid">
          {cards.map(card => {
            const border = getRarityColor(card.rarity);
            return (
              <button
                key={card.uid || card.id}
                className={`rc-card selectable rarity-${card.rarity}`}
                style={{ borderColor, boxShadow: `0 0 14px ${border}66` }}
                onClick={() => onSelect(card)}
              >
                <div className="rc-card-cost">
                  <div className="diamond"><span>{card.cost}</span></div>
                </div>
                <div className="rc-card-type">{getTypeIcon(card.type)}</div>
                <div className="rc-card-name">{card.name}</div>
                <div className="rc-card-rarity" style={{ color: border }}>
                  {getRarityLabel(card.rarity)}
                </div>
                <div className="rc-card-desc">{card.desc}</div>
                <div className="rc-card-value">{card.value}</div>
              </button>
            );
          })}
        </div>
        {allowSkip && (
          <div className="modal-footer">
            <button className="btn-skip" onClick={() => onSelect(null)}>跳过</button>
          </div>
        )}
      </div>
    </div>
  );
}
