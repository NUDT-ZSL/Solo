import React from 'react';
import type { Ingredient, IngredientAlternative } from '../types/recipe';
import './ReplaceModal.css';

interface ReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  allIngredients: Ingredient[];
  replacements: Map<string, IngredientAlternative[]>;
  onReplace: (ingredientId: string, alternative: IngredientAlternative) => void;
}

export const ReplaceModal: React.FC<ReplaceModalProps> = ({
  isOpen,
  onClose,
  allIngredients,
  replacements,
  onReplace,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal modal--replace">
        <div className="modal__header">
          <h2 className="modal__title">🔄 食材替换建议</h2>
          <button className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          {allIngredients.length === 0 ? (
            <p className="modal__empty">暂无可用食材</p>
          ) : (
            <div className="replace-list">
              {allIngredients.map((ingredient) => {
                const alternatives = replacements.get(ingredient.name) || [];
                return (
                  <div key={ingredient.id} className="replace-item">
                    <div className="replace-item__ingredient">
                      <span className="replace-item__name">
                        {ingredient.replaced ? (
                          <span className="replace-item__name--replaced">
                            {ingredient.name}
                          </span>
                        ) : (
                          ingredient.name
                        )}
                      </span>
                      <span className="replace-item__amount">
                        {ingredient.amount} {ingredient.unit}
                      </span>
                    </div>

                    {alternatives.length > 0 ? (
                      <div className="replace-item__alternatives">
                        <span className="replace-item__label">可替换为：</span>
                        <div className="replace-item__btns">
                          {alternatives.map((alt, idx) => (
                            <button
                              key={idx}
                              className="replace-item__btn"
                              onClick={() => onReplace(ingredient.id, alt)}
                            >
                              {alt.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="replace-item__no-alt">暂无替换建议</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
