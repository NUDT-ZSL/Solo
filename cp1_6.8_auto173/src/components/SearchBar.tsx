import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import type { WordData } from '../types';

export default function SearchBar() {
  const { searchQuery, setSearchQuery, searchWord, isLoading, engine } = useAppStore();
  const [inputValue, setInputValue] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<WordData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const results = await engine.searchWord(query);
      setSuggestions(results.slice(0, 5));
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [engine]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue, fetchSuggestions]);

  const handleSearch = (word?: string) => {
    const query = word ?? inputValue;
    if (!query.trim()) return;
    setSearchQuery(query);
    searchWord(query);
    setShowSuggestions(false);
  };

  const handleSelect = (item: WordData) => {
    setInputValue(item.word);
    handleSearch(item.word);
  };

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-96">
      <div className="relative">
        <div className="flex items-center gap-3 px-5 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white/70 animate-spin shrink-0" />
          ) : (
            <button onClick={() => handleSearch()}>
              <Search className="w-5 h-5 text-white/70 hover:text-white transition shrink-0" />
            </button>
          )}
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="输入词语，探索星图..."
            className="bg-transparent text-white placeholder-white/50 focus:outline-none w-full font-['Noto_Sans_SC']"
          />
        </div>

        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
            {suggestions.map((item) => (
              <button
                key={item.word}
                onMouseDown={() => handleSelect(item)}
                className="w-full px-5 py-3 text-left text-white hover:bg-white/10 transition font-['Noto_Sans_SC'] flex items-center gap-3"
              >
                <span>{item.word}</span>
                <span className="text-xs text-white/50">{item.pos}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
