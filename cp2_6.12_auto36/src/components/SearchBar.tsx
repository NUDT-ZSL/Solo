import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Loader2 } from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';

export default function SearchBar() {
  const [focused, setFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useKnowledgeStore((s) => s.search);
  const searchResults = useKnowledgeStore((s) => s.searchResults);
  const clearSearch = useKnowledgeStore((s) => s.clearSearch);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setLocalQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    // 防抖延迟 150ms，<200ms 满足性能要求
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        await search(value);
      } finally {
        setIsLoading(false);
      }
    }, 150);
  };

  const handleSelect = (docId: string, idx: number) => {
    navigate(`/doc/${docId}`, { state: { searchQuery: localQuery, matchIndex: idx } });
    setLocalQuery('');
    clearSearch();
    setFocused(false);
  };

  const highlightText = (text: string, highlights: { start: number; end: number }[]) => {
    if (!highlights || highlights.length === 0) return text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    sorted.forEach((h, i) => {
      if (h.start > lastIndex) {
        parts.push(text.slice(lastIndex, h.start));
      }
      parts.push(
        <mark key={i} className="bg-yellow-200 text-text rounded px-0.5">
          {text.slice(h.start, h.end)}
        </mark>
      );
      lastIndex = h.end;
    });
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const sortedResults = [...searchResults].sort((a, b) => b.score - a.score);

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="搜索文档..."
          className={cn(
            'w-full pl-9 pr-9 py-2 rounded-lg border text-sm transition-colors',
            'bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            'text-text placeholder:text-slate-400'
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {focused && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50"
          style={{
            animation: 'searchDropdown 0.2s ease-out',
          }}
        >
          <style>{`
            @keyframes searchDropdown {
              from {
                opacity: 0;
                transform: translateY(-8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-h-80 overflow-y-auto">
            {isLoading && sortedResults.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                <Loader2 className="w-5 h-5 mx-auto mb-2 text-slate-400 animate-spin" />
                搜索中...
              </div>
            )}
            {!isLoading && sortedResults.length === 0 && localQuery.trim() && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                未找到相关文档
              </div>
            )}
            {!isLoading && sortedResults.length > 0 && sortedResults.map((result, idx) => (
              <button
                key={`${result.documentId}-${idx}`}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                onMouseDown={() => handleSelect(result.documentId, idx)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-text truncate">
                    {highlightText(result.title, result.matchType === 'title' ? result.highlights : [])}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded ml-auto shrink-0',
                    result.matchType === 'title' ? 'bg-blue-50 text-primary' : 'bg-slate-100 text-slate-500'
                  )}>
                    {result.matchType === 'title' ? '标题匹配' : '内容匹配'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 pl-5.5">
                  {highlightText(
                    result.content.slice(0, 120),
                    result.matchType === 'content' ? result.highlights : []
                  )}
                </p>
              </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
