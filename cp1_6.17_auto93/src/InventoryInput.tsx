import { useState, useRef, useEffect } from 'react';
import { UserIngredient } from './types';

interface InventoryInputProps {
  onMatch: (ingredients: UserIngredient[]) => void;
}

function InventoryInput({ onMatch }: InventoryInputProps) {
  const [ingredientName, setIngredientName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedIngredients, setSelectedIngredients] = useState<UserIngredient[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!ingredientName.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/ingredients?q=${encodeURIComponent(ingredientName)}`);
        const data = await response.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('获取建议失败:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [ingredientName]);

  const handleAddIngredient = (name?: string) => {
    const finalName = (name || ingredientName).trim();
    if (!finalName) return;
    
    const exists = selectedIngredients.find(
      ing => ing.name.toLowerCase() === finalName.toLowerCase()
    );
    
    if (exists) {
      setSelectedIngredients(prev =>
        prev.map(ing =>
          ing.name.toLowerCase() === finalName.toLowerCase()
            ? { ...ing, quantity: ing.quantity + quantity }
            : ing
        )
      );
    } else {
      setSelectedIngredients(prev => [
        ...prev,
        { name: finalName, quantity }
      ]);
    }
    
    setIngredientName('');
    setQuantity(1);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveIngredient = (name: string) => {
    setSelectedIngredients(prev => prev.filter(ing => ing.name !== name));
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setIngredientName(suggestion);
    handleAddIngredient(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        handleSelectSuggestion(suggestions[0]);
      } else {
        handleAddIngredient();
      }
    }
  };

  const handleMatch = () => {
    if (selectedIngredients.length === 0) {
      alert('请先添加至少一种食材');
      return;
    }
    onMatch(selectedIngredients);
  };

  return (
    <div className="inventory-input">
      <h2>🥕 我的食材库存</h2>
      <p className="input-hint">输入你冰箱里有的食材，系统会为你匹配可制作的食谱</p>
      
      <div className="input-section">
        <div className="input-row">
          <div className="ingredient-input-wrapper" ref={suggestionsRef}>
            <input
              ref={inputRef}
              type="text"
              className="ingredient-input"
              placeholder="输入食材名称（如：鸡蛋、番茄...）"
              value={ingredientName}
              onChange={(e) => setIngredientName(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => ingredientName && suggestions.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && (
              <div className="suggestions-dropdown">
                {loadingSuggestions ? (
                  <div className="suggestion-loading">加载中...</div>
                ) : suggestions.length === 0 ? (
                  <div className="suggestion-empty">没有找到匹配的食材</div>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <div className="quantity-selector">
            <label htmlFor="quantity">数量：</label>
            <select
              id="quantity"
              className="quantity-select"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="btn ripple-btn add-btn"
            onClick={() => handleAddIngredient()}
          >
            + 添加
          </button>
        </div>
      </div>

      {selectedIngredients.length > 0 && (
        <div className="selected-ingredients">
          <p className="selected-title">已选择的食材：</p>
          <div className="ingredient-tags">
            {selectedIngredients.map((ing, index) => (
              <div key={`${ing.name}-${index}`} className="ingredient-tag">
                <span className="tag-name">{ing.name}</span>
                <span className="tag-qty">×{ing.quantity}</span>
                <button 
                  className="tag-remove"
                  onClick={() => handleRemoveIngredient(ing.name)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="match-section">
        <button 
          className="btn ripple-btn match-btn"
          onClick={handleMatch}
          disabled={selectedIngredients.length === 0}
        >
          🔍 开始匹配食谱
        </button>
        {selectedIngredients.length > 0 && (
          <button 
            className="btn secondary-btn clear-btn"
            onClick={() => setSelectedIngredients([])}
          >
            清空所有
          </button>
        )}
      </div>
    </div>
  );
}

export default InventoryInput;
