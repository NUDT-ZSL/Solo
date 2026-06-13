import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, Tag, User } from 'lucide-react';
import type { Asset } from '@shared/types';
import { assetApi } from '@/api/client';
import { useStore } from '@/store/useStore';
import { CATEGORIES } from '@shared/types';

interface AssetCardProps {
  asset: Asset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleFavorite, isFavorited, showToast } = useStore();
  const favorited = isFavorited(asset._id);

  const categoryLabel = CATEGORIES.find((c) => c.value === asset.category)?.label || asset.category;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await assetApi.toggleFavorite(asset._id);
      toggleFavorite(asset._id, result.favorites, result.isFavorited);
      showToast(
        result.isFavorited ? '已添加收藏' : '已取消收藏',
        result.isFavorited ? 'success' : 'info'
      );
    } catch (error) {
      showToast('操作失败，请重试', 'error');
    }
  };

  return (
    <Link
      to={`/asset/${asset._id}`}
      className="relative block w-[280px] h-[360px] bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50 transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-900/50 to-slate-900">
        <img
          src={asset.thumbnailUrl}
          alt={asset.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm rounded-md text-xs font-medium text-blue-400 border border-blue-500/30">
            {categoryLabel}
          </span>
        </div>

        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-sm transition-all duration-200 active:scale-95 hover:bg-slate-800"
        >
          <Heart
            className={`w-5 h-5 transition-colors duration-200 ${
              favorited ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
            }`}
          />
        </button>

        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isHovered ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-transparent to-slate-900/90">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/asset/${asset._id}`;
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 active:scale-95"
            >
              <Eye className="w-4 h-4" />
              快速预览
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-white mb-2 line-clamp-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {asset.name}
        </h3>

        <div className="flex items-center gap-1 text-slate-400 text-sm mb-3">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{asset.author}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {asset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
              +{asset.tags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-blue-400">${asset.price}</span>
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Heart className={`w-4 h-4 ${favorited ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{asset.favorites}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
