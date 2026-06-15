import React, { useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DRAG_TYPES } from '@/types';
import type { Artwork } from '@/types';

interface ArtworkItemProps {
  artwork: Artwork;
  isSelected: boolean;
  onClick: () => void;
}

const ArtworkItem: React.FC<ArtworkItemProps> = ({ artwork, isSelected, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAG_TYPES.ARTWORK,
    item: { artwork },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [artwork]);

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`
        relative cursor-pointer group
        transition-all duration-300 ease-out
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div
        className={`
          w-[100px] h-[100px] rounded-lg overflow-hidden
          transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-lg hover:shadow-[#6c63ff]/30
          ${isSelected ? 'ring-2 ring-[#6c63ff]' : ''}
        `}
      >
        <img
          src={artwork.thumbnailUrl}
          alt={artwork.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: artwork.averageColor }}
        />
      </div>
      <div className="mt-2 text-xs text-[#e0e0ff] truncate w-[100px] text-center">
        {artwork.name}
      </div>
      {artwork.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 justify-center">
          {artwork.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-1.5 py-0.5 text-[10px] bg-[#444466] text-[#a0a0c0] rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const ArtworkGrid: React.FC = () => {
  const artworks = useStore((state) => state.artworks);
  const selectedArtworkId = useStore((state) => state.selectedArtworkId);
  const setSelectedArtworkId = useStore((state) => state.setSelectedArtworkId);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArtworks = useMemo(() => {
    if (!searchQuery.trim()) return artworks;
    
    const query = searchQuery.toLowerCase();
    return artworks.filter(
      (artwork) =>
        artwork.name.toLowerCase().includes(query) ||
        artwork.description.toLowerCase().includes(query) ||
        artwork.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [artworks, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0c0]"
        />
        <input
          type="text"
          placeholder="搜索艺术品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full pl-10 pr-4 py-2 rounded-lg
            bg-[#2a2a3e] border border-[#444466]
            text-[#e0e0ff] placeholder-[#a0a0c0]
            focus:outline-none focus:border-[#6c63ff]
            transition-all duration-300 ease-out
            text-sm
          "
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredArtworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#a0a0c0]">
            <div className="text-sm mb-2">暂无艺术品</div>
            <div className="text-xs">上传图片或3D模型开始策展</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-1">
            {filteredArtworks.map((artwork) => (
              <ArtworkItem
                key={artwork.id}
                artwork={artwork}
                isSelected={selectedArtworkId === artwork.id}
                onClick={() => setSelectedArtworkId(
                  selectedArtworkId === artwork.id ? null : artwork.id
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
