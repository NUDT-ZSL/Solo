import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api';
import TagBadge from './TagBadge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export default function TagInput({
  value,
  onChange,
  placeholder = '添加标签',
  maxTags = 5,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await apiClient.getAllTags();
        setAllTags(tags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allTags.filter(
        (tag) =>
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(tag)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, allTags, value]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag &&
      !value.includes(trimmedTag) &&
      value.length < maxTags
    ) {
      onChange([...value, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const isMaxReached = value.length >= maxTags;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex flex-wrap gap-2 p-2.5 border border-gray-200 rounded-lg min-h-[44px] focus-within:ring-2 focus-within:ring-brand/50 focus-within:border-brand transition-all ${
          isMaxReached ? 'bg-gray-50' : 'bg-white'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <TagBadge
            key={tag}
            name={tag}
            onRemove={() => removeTag(tag)}
          />
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(suggestions.length > 0)}
          placeholder={isMaxReached ? `最多${maxTags}个标签` : placeholder}
          disabled={isMaxReached}
          className="flex-1 min-w-[100px] outline-none bg-transparent text-sm placeholder-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      {isMaxReached && (
        <p className="mt-1 text-xs text-amber-600">
          已达到最大标签数量 ({maxTags}个)
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[150px] overflow-y-auto">
          {suggestions.map((tag, index) => (
            <button
              key={tag}
              onClick={() => addTag(tag)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-brand/10 transition-colors ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${index === suggestions.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
