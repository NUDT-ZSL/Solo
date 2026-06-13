import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export default function SearchBar({ onSearch, className = '' }: SearchBarProps) {
  const [value, setValue] = useState('');
  const { searchQuery, setSearchQuery } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(value);
      onSearch?.(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, setSearchQuery, onSearch]);

  const handleClear = () => {
    setValue('');
    setSearchQuery('');
    onSearch?.('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索素材名称或标签..."
        className="w-full pl-11 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
      />

      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
