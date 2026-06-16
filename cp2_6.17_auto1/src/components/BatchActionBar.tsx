import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Tag, CheckSquare } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { getAllTagStats } from '@/modules/TagManager';
import { cn } from '@/lib/utils';

export function BatchActionBar() {
  const {
    photos,
    selectedPhotoIds,
    clearPhotoSelection,
    batchAddTags,
  } = usePhotoStore();

  const [tagInput, setTagInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const allTags = useMemo(() => getAllTagStats(photos).map(t => t.tag), [photos]);

  const filteredSuggestions = useMemo(() => {
    if (!tagInput) return [];
    return allTags.filter(tag => tag.includes(tagInput)).slice(0, 5);
  }, [allTags, tagInput]);

  useEffect(() => {
    if (selectedPhotoIds.length > 0) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [selectedPhotoIds.length]);

  const handleApply = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag || trimmedTag.length > 8) return;

    batchAddTags(selectedPhotoIds, trimmedTag);
    setTagInput('');
  }, [tagInput, selectedPhotoIds, batchAddTags]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTagInput(suggestion);
  };

  if (selectedPhotoIds.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2',
        'transition-all duration-200',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      )}
    >
      <div
        className="bg-[#1e293b] text-white max-w-4xl mx-auto p-4 shadow-xl"
        style={{
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckSquare size={20} className="text-[#a5b4fc]" />
            <span className="text-sm font-medium">
              已选择 <span className="text-[#a5b4fc]">{selectedPhotoIds.length}</span> 张照片
            </span>
            <button
              onClick={clearPhotoSelection}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="取消选择"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-gray-400 absolute left-3 z-10" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入标签（最多8字）"
                  maxLength={8}
                  className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-[#a5b4fc] focus:ring-1 focus:ring-[#a5b4fc]"
                />
              </div>

              {filteredSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#334155] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  {filteredSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleApply}
              disabled={!tagInput.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tagInput.trim()
                  ? 'bg-[#4338ca] text-white hover:bg-[#3730a3]'
                  : 'bg-white/10 text-gray-400 cursor-not-allowed'
              )}
            >
              应用到选中
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
