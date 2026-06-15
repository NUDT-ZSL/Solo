import { useState, useRef, useEffect } from 'react';
import './IngredientInput.css';

interface IngredientInputProps {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
  placeholder?: string;
}

export default function IngredientInput({ ingredients, onChange, placeholder = '输入食材，按回车添加' }: IngredientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!ingredients.includes(trimmed)) {
        onChange([...ingredients, trimmed]);
      }
      setInputValue('');
    }
  };

  const handleRemove = (ingredient: string) => {
    onChange(ingredients.filter((i) => i !== ingredient));
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (ingredients.length > 0 && inputRef.current) {
      // 输入框获得焦点时的处理
    }
  }, [ingredients.length]);

  return (
    <div className="ingredient-input-container" onClick={handleContainerClick}>
      <div className="ingredient-tags">
        {ingredients.map((ing) => (
          <span key={ing} className="ingredient-tag">
            {ing}
            <button
              type="button"
              className="tag-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(ing);
              }}
              aria-label={`删除${ing}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="ingredient-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ingredients.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  );
}
