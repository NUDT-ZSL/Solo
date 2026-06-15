import React from 'react';
import './Navbar.css';

interface NavbarProps {
  servings: number;
  onServingsChange: (servings: number) => void;
  onReplaceClick: () => void;
  hasRecipe: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  servings,
  onServingsChange,
  onReplaceClick,
  hasRecipe,
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onServingsChange(parseInt(e.target.value, 10));
  };

  return (
    <nav className="navbar">
      <div className="navbar__content">
        <div className="navbar__logo">
          <span className="navbar__logo-icon">🍳</span>
          <h1 className="navbar__title">智能助厨</h1>
        </div>

        <div className="navbar__actions">
          <div className="servings-control">
            <label className="servings-control__label">
              <span className="servings-control__icon">👥</span>
              份量
            </label>
            <div className="servings-control__slider-wrapper">
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={servings}
                onChange={handleSliderChange}
                className="servings-control__slider"
                disabled={!hasRecipe}
              />
              <div className="servings-control__value">{servings}人份</div>
            </div>
          </div>

          <button
            className="navbar__btn navbar__btn--replace"
            onClick={onReplaceClick}
            disabled={!hasRecipe}
          >
            🔄 食材替换
          </button>
        </div>
      </div>
    </nav>
  );
};
