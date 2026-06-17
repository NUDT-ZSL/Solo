import React, { useState } from 'react';

interface RatingWidgetProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'small' | 'normal';
}

const RatingWidget: React.FC<RatingWidgetProps> = ({ value, onChange, readOnly = false, size = 'normal' }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = (rating: number) => {
    if (!readOnly && onChange) {
      onChange(rating);
    }
  };

  const displayValue = hoverValue || value;

  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star ${i <= displayValue ? 'filled' : ''} ${size === 'small' ? 'small' : ''} ${!readOnly ? 'interactive' : ''}`}
          onClick={() => handleClick(i)}
          onMouseEnter={() => !readOnly && setHoverValue(i)}
          onMouseLeave={() => !readOnly && setHoverValue(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default RatingWidget;
