import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassHeader } from '../components/GlassHeader';
import { ConfirmBubble } from '../components/ConfirmBubble';
import { Skeleton } from '../components/Skeleton';
import { useFavorites, usePlantList } from '../hooks';
import { formatDate } from '../utils';
import { Search, Trash2 } from 'lucide-react';

export function Favorites() {
  const { sortedByDate, remove } = useFavorites();
  const { plants, loading } = usePlantList();
  const [keyword, setKeyword] = useState('');
  const [confirmForId, setConfirmForId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const favoritePlants = sortedByDate
    .map((fav) => {
      const plant = plants.find((p) => p.id === fav.plantId);
      return plant ? { ...fav, plant } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter((item) => {
      if (!keyword.trim()) return true;
      const lower = keyword.toLowerCase();
      return (
        item.plant.name.toLowerCase().includes(lower) ||
        item.plant.scientificName.toLowerCase().includes(lower)
      );
    });

  const handleLongPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setConfirmForId(id);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleConfirmRemove = () => {
    if (confirmForId) {
      remove(confirmForId);
      setConfirmForId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <GlassHeader
        title="我的收藏"
        rightContent={
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索收藏..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-44 pl-9 pr-3 py-1.5 text-sm rounded-full bg-white/80 border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
        }
      />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
                <Skeleton width={40} height={40} rounded="rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="40%" height={18} rounded="rounded" />
                  <Skeleton width="30%" height={14} rounded="rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : favoritePlants.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500">
              {keyword ? '没有找到匹配的收藏' : '还没有收藏任何树种'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {favoritePlants.map((item) => (
              <div
                key={item.plantId}
                className="relative select-none"
                onMouseDown={() => handleLongPressStart(item.plantId)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(item.plantId)}
                onTouchEnd={handleLongPressEnd}
              >
                <div
                  onClick={() => {
                    if (!confirmForId) navigate(`/encyclopedia/${item.plantId}`);
                  }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-all cursor-pointer"
                >
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Skeleton className="w-10 h-10 rounded-[6px] absolute inset-0" rounded="rounded-[6px]" />
                    <img
                      src={item.plant.leafImage}
                      alt={item.plant.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-[6px] object-cover relative z-10"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {item.plant.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      收藏于 {formatDate(item.addedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmForId(item.plantId);
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {confirmForId === item.plantId && (
                  <div className="absolute right-2 -top-2 z-20">
                    <ConfirmBubble
                      visible={true}
                      onConfirm={handleConfirmRemove}
                      onCancel={() => setConfirmForId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
