import React from 'react';
import { useAppStore } from '@/store';
import type { Tag } from '@/types';
import { Calendar, Leaf, Trash2 } from 'lucide-react';
import { deleteTag } from '@/services/api';

export const TagList: React.FC = () => {
  const {
    tags,
    currentImage,
    highlightTagId,
    setHighlightTagId,
    removeTag,
    addToast,
    searchKeyword,
  } = useAppStore();

  const filteredTags = tags.filter((t) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      t.note.toLowerCase().includes(kw) ||
      t.plantName.toLowerCase().includes(kw) ||
      t.date.includes(kw)
    );
  });

  const handleClick = (t: Tag) => {
    setHighlightTagId(t.id);
    setTimeout(() => setHighlightTagId(null), 3000);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteTag(id);
      removeTag(id);
      addToast({ type: 'success', message: '标记已删除' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || '删除失败' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <h3 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}>
          <Leaf size={18} style={{ color: 'hsl(140, 40%, 70%)' }} />
          时光标记
          <span className="ml-auto text-xs font-sans opacity-60">
            {filteredTags.length} 条
          </span>
        </h3>
        {!currentImage && tags.length === 0 && (
          <div className="text-xs opacity-60 mt-2 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}>
            上传图片后，点击叶脉上的节点添加观察记录
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {filteredTags.map((t) => {
          const isHighlight = t.id === highlightTagId;
          return (
            <div
              key={t.id}
              onClick={() => handleClick(t)}
              className="group cursor-pointer rounded-xl transition-smooth relative overflow-hidden"
              style={{
                height: isHighlight ? 68 : 60,
                padding: '12px 14px',
                background: isHighlight
                  ? 'rgba(255, 215, 0, 0.18)'
                  : 'var(--card-bg)',
                border: isHighlight
                  ? '1px solid rgba(255,215,0,0.5)'
                  : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isHighlight) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'var(--card-bg-hover)';
                  (e.currentTarget as HTMLDivElement).style.height = '64px';
                }
              }}
              onMouseLeave={(e) => {
                if (!isHighlight) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'var(--card-bg)';
                  (e.currentTarget as HTMLDivElement).style.height = '60px';
                }
              }}
            >
              <div className="flex items-start gap-3 h-full">
                <div
                  className="mt-1 w-3 h-3 rounded-full shrink-0"
                  style={{
                    background: 'var(--accent-gold)',
                    boxShadow: '0 0 8px rgba(255,200,0,0.6)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t.plantName || '未知植物'}
                    </span>
                    <span
                      className="text-[11px] opacity-70 flex items-center gap-1 shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Calendar size={11} />
                      {t.date}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-snug line-clamp-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t.note || '（无备注）'}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-smooth p-1 rounded shrink-0 hover:bg-white/10"
                  style={{ color: 'hsla(0, 70%, 70%, 0.85)' }}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {isHighlight && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r animate-border-blink"
                  style={{
                    height: 28,
                    background: '#fff',
                    boxShadow: '0 0 8px rgba(255,255,255,0.7)',
                  }}
                />
              )}
            </div>
          );
        })}
        {tags.length > 0 && filteredTags.length === 0 && (
          <div className="text-center py-8 text-sm opacity-60"
            style={{ color: 'var(--text-secondary)' }}>
            没有匹配的标记
          </div>
        )}
        {tags.length === 0 && currentImage && (
          <div className="text-center py-8 text-xs opacity-60 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}>
            点击叶脉节点添加第一条观察记录
          </div>
        )}
      </div>
    </div>
  );
};
