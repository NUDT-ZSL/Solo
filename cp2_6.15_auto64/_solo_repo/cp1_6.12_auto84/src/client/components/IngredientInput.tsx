import { useState, useEffect, useRef } from 'react';

interface Ingredient {
  name: string;
  emoji: string;
}

interface IngredientInputProps {
  onSearch: (ingredients: string[]) => void;
}

const styles = `
  .ingredient-input-container {
    max-width: 800px;
    margin: 0 auto;
    position: relative;
  }

  .input-wrapper {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .ingredient-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #FFF5E1 0%, #FFE8CC 100%);
    border-radius: 20px;
    font-size: 14px;
    color: #E67E22;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(230, 126, 34, 0.3);
  }

  .ingredient-tag:hover {
    background: linear-gradient(135deg, #FFE8CC 0%, #FFDAB3 100%);
    transform: translateY(-1px);
  }

  .ingredient-tag:active {
    transform: scale(0.95);
    transition: transform 100ms ease;
  }

  .tag-remove {
    font-size: 16px;
    font-weight: bold;
    opacity: 0.7;
  }

  .ingredient-input {
    flex: 1;
    padding: 14px 20px;
    font-size: 16px;
    border: 2px solid #E0E0E0;
    border-radius: 12px;
    outline: none;
    transition: all 0.3s ease;
    background: #fff;
  }

  .ingredient-input:focus {
    border-color: #E67E22;
    box-shadow: 0 0 0 4px rgba(230, 126, 34, 0.2);
  }

  .search-button {
    padding: 14px 32px;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .search-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(230, 126, 34, 0.4);
  }

  .search-button:active {
    transform: scale(0.95);
    transition: transform 100ms ease;
  }

  .search-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    max-height: 300px;
    overflow-y: auto;
    z-index: 10;
    overflow: hidden;
    animation: dropdownExpand 300ms ease-out;
    transform-origin: top center;
  }

  @keyframes dropdownExpand {
    from {
      opacity: 0;
      transform: scaleY(0.8);
      max-height: 0;
    }
    to {
      opacity: 1;
      transform: scaleY(1);
      max-height: 300px;
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .dropdown-item:hover {
    background: #FFF5E1;
  }

  .dropdown-item:active {
    background: #FFE8CC;
  }

  .dropdown-item-emoji {
    font-size: 24px;
    width: 32px;
    text-align: center;
  }

  .dropdown-item-name {
    font-size: 15px;
    color: #333;
  }

  .dropdown-item.highlighted {
    background: #FFF5E1;
  }

  .dropdown-empty {
    padding: 24px;
    text-align: center;
    color: #999;
  }

  @media (max-width: 768px) {
    .input-wrapper {
      flex-direction: column;
    }

    .search-button {
      width: 100%;
    }
  }
`;

function IngredientInput({ onSearch }: IngredientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stylesInjected = useRef(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const styleElement = document.createElement('style');
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
      stylesInjected.current = true;
    }
  }, []);

  useEffect(() => {
    fetch('/api/ingredients')
      .then((res) => res.json())
      .then((data: Ingredient[]) => {
        setAllIngredients(data);
      })
      .catch((err) => console.error('Failed to load ingredients:', err));
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      const query = inputValue.trim().toLowerCase();
      const filtered = allIngredients.filter(
        (ing) =>
          ing.name.toLowerCase().includes(query) &&
          !selectedIngredients.includes(ing.name)
      );
      setSuggestions(filtered);
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [inputValue, allIngredients, selectedIngredients]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addIngredient = (ingredient: Ingredient) => {
    if (!selectedIngredients.includes(ingredient.name)) {
      setSelectedIngredients((prev) => [...prev, ingredient.name]);
      setInputValue('');
      setShowDropdown(false);
    }
  };

  const removeIngredient = (name: string) => {
    setSelectedIngredients((prev) => prev.filter((ing) => ing !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        addIngredient(suggestions[highlightedIndex]);
      } else if (selectedIngredients.length > 0) {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else if (e.key === 'Backspace' && inputValue === '' && selectedIngredients.length > 0) {
      removeIngredient(selectedIngredients[selectedIngredients.length - 1]);
    }
  };

  const handleSearch = () => {
    if (selectedIngredients.length > 0) {
      onSearch(selectedIngredients);
    }
  };

  return (
    <div className="ingredient-input-container">
      {selectedIngredients.length > 0 && (
        <div className="selected-tags">
          {selectedIngredients.map((name) => {
            const ing = allIngredients.find((i) => i.name === name);
            return (
              <span
                key={name}
                className="ingredient-tag"
                onClick={() => removeIngredient(name)}
              >
                <span>{ing?.emoji || '🍴'}</span>
                <span>{name}</span>
                <span className="tag-remove">×</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="ingredient-input"
          placeholder="输入您家中的食材，如：鸡蛋、番茄..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowDropdown(true)}
        />
        <button
          className="search-button"
          onClick={handleSearch}
          disabled={selectedIngredients.length === 0}
        >
          🔍 搜索菜谱
        </button>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className="dropdown">
          {suggestions.map((ing, idx) => (
            <div
              key={ing.name}
              className={`dropdown-item ${
                idx === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => addIngredient(ing)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              <span className="dropdown-item-emoji">{ing.emoji}</span>
              <span className="dropdown-item-name">{ing.name}</span>
            </div>
          ))}
        </div>
      )}

      {showDropdown && suggestions.length === 0 && inputValue.trim() && (
        <div ref={dropdownRef} className="dropdown">
          <div className="dropdown-empty">未找到匹配的食材</div>
        </div>
      )}
    </div>
  );
}

export default IngredientInput;
