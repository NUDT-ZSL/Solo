import { useMemo, useState } from 'react';
import { X, Filter } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { getAllTagStats } from '@/modules/TagManager';
import { cn } from '@/lib/utils';

export function TagFilter() {
  const { photos, selectedTags, toggleTag, clearSelectedTags, referencePhotoId, setReferencePhoto } = usePhotoStore();
  const [animatingTag, setAnimatingTag] = useState<string | null>(null);

  const tagStats = useMemo(() => getAllTagStats(photos), [photos]);

  const handleTagClick = (tag: string) => {
    setAnimatingTag(tag);
    setTimeout(() => setAnimatingTag(null), 150);
    toggleTag(tag);
  };

  const isFiltering = selectedTags.length > 0 || referencePhotoId !== null;

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-[#e2e8f0] pr-4 md:pr-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1e293b] flex items-center gap-2">
          <Filter size={18} />
          标签筛选
        </h2>
        {isFiltering && (
          <button
            onClick={() => {
              clearSelectedTags();
              setReferencePhoto(null);
            }}
            className="text-xs text-[#4338ca] hover:text-[#3730a3] transition-colors flex items-center gap-1"
          >
            <X size={14} />
            清除
          </button>
        )}
      </div>

      {referencePhotoId && (
        <div className="mb-4 p-3 bg-[#e0e7ff] rounded-lg">
          <p className="text-sm text-[#4338ca] font-medium">相似照片模式</p>
          <button
            onClick={() => setReferencePhoto(null)}
            className="text-xs text-[#4338ca] hover:text-[#3730a3] mt-1 flex items-center gap-1"
          >
            <X size={12} />
            退出相似模式
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 md:gap-3 overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-none">
        {tagStats.map(({ tag, count }) => {
          const isSelected = selectedTags.includes(tag);
          const isAnimating = animatingTag === tag;

          return (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                'whitespace-nowrap',
                isSelected
                  ? 'bg-[#4338ca] text-white'
                  : 'bg-[#e0e7ff] text-[#4338ca] hover:bg-[#c7d2fe]'
              )}
              style={{
                transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
                transition: isAnimating ? 'transform 0.15s ease-out' : 'all 0.2s',
              }}
            >
              {tag}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          );
        })}

        {tagStats.length === 0 && (
          <p className="text-sm text-gray-500">暂无标签，请先上传照片</p>
        )}
      </div>
    </div>
  );
}
