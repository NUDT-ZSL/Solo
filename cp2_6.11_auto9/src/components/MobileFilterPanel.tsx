import { X } from 'lucide-react';
import { ALL_EMOTION_TAGS, EMOTION_LABELS, EMOTION_COLORS } from '../../shared/types';

interface MobileFilterPanelProps {
  filterTag: string;
  onFilterTagChange: (tag: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onClose: () => void;
}

export default function MobileFilterPanel({
  filterTag,
  onFilterTagChange,
  sortBy,
  onSortChange,
  onClose,
}: MobileFilterPanelProps) {
  return (
    <div className="fixed inset-0 z-40 bg-earth-brown/40" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-earth-cream rounded-t-2xl p-4 space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-earth-brown">筛选</h3>
          <button onClick={onClose} className="text-earth-brown/60">
            <X size={20} />
          </button>
        </div>

        <div>
          <div className="text-xs font-medium text-earth-brown/60 mb-2">
            情绪标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onFilterTagChange('')}
              className={`px-2.5 py-1.5 rounded-full text-xs transition-colors ${
                filterTag === ''
                  ? 'bg-earth-brown text-white'
                  : 'bg-earth-warm/60 text-earth-brown'
              }`}
            >
              全部
            </button>
            {ALL_EMOTION_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => onFilterTagChange(tag)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-colors ${
                  filterTag === tag
                    ? 'bg-earth-brown text-white'
                    : 'bg-earth-warm/60 text-earth-brown'
                }`}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: EMOTION_COLORS[tag] }}
                />
                {EMOTION_LABELS[tag]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-earth-brown/60 mb-2">
            排序方式
          </div>
          <div className="flex gap-2">
            {[
              { key: 'distance', label: '距离最近' },
              { key: 'newest', label: '最新创建' },
              { key: 'popular', label: '最多点赞' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => onSortChange(opt.key)}
                className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                  sortBy === opt.key
                    ? 'bg-earth-wheat text-earth-brown'
                    : 'bg-earth-warm/40 text-earth-brown/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
