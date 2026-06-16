import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PresetIngredient } from '../lib/types';

interface IngredientSearchProps {
  presetIngredients: PresetIngredient[];
  onSelect: (name: string) => void;
  placeholder?: string;
}

const IngredientSearch: React.FC<IngredientSearchProps> = ({
  presetIngredients,
  onSelect,
  placeholder = '搜索食材...',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState<PresetIngredient[]>(presetIngredients);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedTerm.trim() === '') {
      setFilteredIngredients(presetIngredients);
    } else {
      const term = debouncedTerm.toLowerCase();
      const filtered = presetIngredients.filter((ing) =>
        ing.name.toLowerCase().includes(term) ||
        ing.category.toLowerCase().includes(term)
      );
      setFilteredIngredients(filtered);
    }
  }, [debouncedTerm, presetIngredients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((name: string) => {
    onSelect(name);
    setSearchTerm('');
    setIsOpen(false);
  }, [onSelect]);

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="highlight-match">{part}</span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full"
      />
      
      {isOpen && (
        <div className="ingredient-dropdown">
          {filteredIngredients.length === 0 ? (
            <div className="p-3 text-gray-500 text-sm text-center">
              未找到匹配的食材
            </div>
          ) : (
            filteredIngredients.map((ing, index) => (
              <div
                key={`${ing.name}-${index}`}
                className={`ingredient-item ${
                  debouncedTerm && ing.name.toLowerCase().includes(debouncedTerm.toLowerCase())
                    ? 'highlighted'
                    : ''
                }`}
                onClick={() => handleSelect(ing.name)}
              >
                <div className="flex justify-between items-center">
                  <span>{highlightMatch(ing.name, debouncedTerm)}</span>
                  <span className="text-xs text-gray-500">{ing.category}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default IngredientSearch;
