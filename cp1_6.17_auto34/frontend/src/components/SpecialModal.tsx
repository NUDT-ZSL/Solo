import React from 'react';
import { SpecialDrink } from '../types';
import './SpecialModal.css';

interface SpecialModalProps {
  drink: SpecialDrink | null;
  onClose: () => void;
}

const SpecialModal: React.FC<SpecialModalProps> = ({ drink, onClose }) => {
  if (!drink) return null;

  const getFlavorColor = (level: number) => {
    const colors = ['#FFE0B2', '#FFCC80', '#FFB74D', '#A1887F', '#4E342E'];
    return colors[Math.min(Math.max(level - 1, 0), 4)];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="special-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <div
          className="special-modal-image"
          style={{ background: `linear-gradient(135deg, ${drink.imageColor} 0%, #BCAAA4 100%)` }}
        >
          <div className="special-modal-image-inner">
            <svg viewBox="0 0 120 120" width="100" height="100">
              <path
                d="M30 45h60c0 25-12 40-30 40S30 70 30 45z"
                fill="#FFF8E1"
                stroke="#3E2723"
                strokeWidth="3"
              />
              <ellipse cx="60" cy="45" rx="30" ry="6" fill="#5D4037" />
              <path
                d="M90 48c8 2 12 10 12 20s-4 18-12 20"
                fill="none"
                stroke="#3E2723"
                strokeWidth="3"
              />
              <ellipse cx="60" cy="45" rx="22" ry="4" fill="#8D6E63" />
              <path d="M50 28c2-6 8-6 10 0M60 25c2-6 8-6 10 0" stroke="#D7CCC8" strokeWidth="2" fill="none" opacity="0.7" />
            </svg>
          </div>
        </div>
        <div className="special-modal-content">
          <h2 className="special-modal-title">{drink.name}</h2>
          <div className="special-modal-flavors">
            <div className="flavor-item">
              <span className="flavor-label">酸度</span>
              <div className="flavor-dots">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="flavor-dot"
                    style={{ backgroundColor: i <= drink.flavorTags.acidity ? getFlavorColor(drink.flavorTags.acidity) : '#E0E0E0' }}
                  />
                ))}
              </div>
            </div>
            <div className="flavor-item">
              <span className="flavor-label">甜度</span>
              <div className="flavor-dots">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="flavor-dot"
                    style={{ backgroundColor: i <= drink.flavorTags.sweetness ? getFlavorColor(drink.flavorTags.sweetness) : '#E0E0E0' }}
                  />
                ))}
              </div>
            </div>
            <div className="flavor-item">
              <span className="flavor-label">苦度</span>
              <div className="flavor-dots">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="flavor-dot"
                    style={{ backgroundColor: i <= drink.flavorTags.bitterness ? getFlavorColor(drink.flavorTags.bitterness) : '#E0E0E0' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="special-modal-note">
            <span className="note-label">咖啡师说：</span>
            {drink.baristaNote}
          </p>
          <div className="special-modal-footer">
            <div className="special-modal-limited">限量 {drink.limitedCount} 杯</div>
            <div className="special-modal-price">¥{drink.price}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialModal;
