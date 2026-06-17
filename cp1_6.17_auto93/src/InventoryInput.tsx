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
  const [batchInput, setBatchInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleRemoveIngredient = (name: string, quantity: number) => {
    const confirmed = window.confirm(
      `确定要删除食材「${name}」吗？\n当前数量：${quantity}\n删除后将无法恢复。`
    );
    if (confirmed) {
      setSelectedIngredients(prev => prev.filter(ing => ing.name !== name));
    }
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

  const handleBatchAdd = () => {
    const trimmedBatch = batchInput.trim();
    if (!trimmedBatch) {
      return;
    }

    const names = trimmedBatch
      .split(/[,，\n\r;；]+/)
      .map(name => name.trim())
      .filter(name => {
        if (!name || name.length === 0) return false;
        if (/^\d+$/.test(name)) return false;
        return true;
      });

    if (names.length === 0) {
      alert('没有解析到有效的食材名称，请检查输入格式。\n支持用逗号、换行、分号分隔多个食材。');
      return;
    }

    const duplicateNames: string[] = [];
    const newNames: string[] = [];

    names.forEach(name => {
      const exists = selectedIngredients.find(
        ing => ing.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        duplicateNames.push(name);
      } else {
        newNames.push(name);
      }
    });

    setSelectedIngredients(prev => {
      let updated = [...prev];
      names.forEach(name => {
        const found = updated.find(
          ing => ing.name.toLowerCase() === name.toLowerCase()
        );
        if (found) {
          updated = updated.map(ing =>
            ing.name.toLowerCase() === name.toLowerCase()
              ? { ...ing, quantity: ing.quantity + 1 }
              : ing
          );
        } else {
          updated.push({ name, quantity: 1 });
        }
      });
      return updated;
    });

    if (duplicateNames.length > 0) {
      const msg = `成功添加 ${names.length} 种食材！\n\n其中：\n✓ 新增食材：${newNames.length} 种\n+ 数量累加：${duplicateNames.length} 种（${duplicateNames.join('、')}）`;
      alert(msg);
    } else {
      alert(`成功添加 ${names.length} 种食材！`);
    }

    setBatchInput('');
  };

  const handleMatch = () => {
    if (selectedIngredients.length === 0) {
      alert('请先添加至少一种食材');
      return;
    }
    onMatch(selectedIngredients);
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      `确定要清空所有 ${selectedIngredients.length} 种食材吗？\n此操作不可撤销。`
    );
    if (confirmed) {
      setSelectedIngredients([]);
    }
  };

  return (
    <div className="inventory-input">
      <h2>🥕 我的食材库存</h2>
      <p className="input-hint">输入你冰箱里有的食材，系统会为你匹配可制作的食谱</p>
      
      <div className="input-section">
        <div className="input-mode-tabs">
          <span className="input-mode-label">📝 单个添加</span>
        </div>
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
            disabled={!ingredientName.trim()}
          >
            + 添加
          </button>
        </div>
      </div>

      <div className="input-section batch-section">
        <div className="input-mode-tabs">
          <span className="input-mode-label">⚡ 批量添加</span>
          <span className="batch-hint">用逗号、换行或分号分隔多个食材</span>
        </div>
        <div className="batch-input-row">
          <textarea
            className="batch-textarea"
            placeholder={'例如：鸡蛋、番茄、洋葱、鸡胸肉\n或者每行一个：\n土豆\n胡萝卜\n青椒'}
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            rows={4}
          />
          <button 
            className="btn ripple-btn batch-add-btn"
            onClick={handleBatchAdd}
            disabled={!batchInput.trim()}
          >
            📦 批量添加
          </button>
        </div>
      </div>

      {selectedIngredients.length > 0 && (
        <div className="selected-ingredients">
          <div className="selected-header">
            <p className="selected-title">已选择的食材：</p>
          </div>
          <div className="ingredient-tags">
            {selectedIngredients.map((ing, index) => (
              <div key={`${ing.name}-${index}`} className="ingredient-tag">
                <span className="tag-name">{ing.name}</span>
                <span className="tag-qty">数量：{ing.quantity}</span>
                <button 
                  className="tag-remove"
                  onClick={() => handleRemoveIngredient(ing.name, ing.quantity)}
                  title={`删除「${ing.name}」`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="ingredient-footer">
            <p className="ingredient-count">
              共 <strong>{selectedIngredients.length}</strong> 种食材
            </p>
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
            onClick={handleClearAll}
          >
            清空所有
          </button>
        )}
      </div>
    </div>
  );
}

export default InventoryInput;
