import { memo } from 'react';
import { Layers, Tag as TagIcon } from 'lucide-react';
import type { Photo } from '@/types';
import { usePhotoStore } from '@/store/usePhotoStore';
import { cn } from '@/lib/utils';

interface PhotoCardProps {
  photo: Photo;
  style?: React.CSSProperties;
}

export const PhotoCard = memo(function PhotoCard({ photo, style }: PhotoCardProps) {
  const {
    selectedPhotoIds,
    referencePhotoId,
    togglePhotoSelection,
    openModal,
    setReferencePhoto,
  } = usePhotoStore();

  const isSelected = selectedPhotoIds.includes(photo.id);
  const isReference = referencePhotoId === photo.id;

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      togglePhotoSelection(photo.id, true);
    } else {
      openModal(photo.id);
    }
  };

  const handleSimilarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setReferencePhoto(isReference ? null : photo.id);
  };

  return (
    <div
      style={style}
      onClick={handleCardClick}
      className={cn(
        'absolute bg-white rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden',
        'hover:-translate-y-1.5',
        isSelected
          ? 'border-[#4338ca] shadow-[0_0_0_3px_#4338ca]'
          : 'border-[#f0f0f0] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)]',
        isReference && 'ring-2 ring-[#4338ca] ring-offset-2'
      )}
    >
      <div className="relative">
        <img
          src={photo.dataUrl}
          alt={photo.fileName}
          className="w-full object-cover"
          loading="lazy"
          style={{ aspectRatio: '4/3' }}
        />

        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600/80 text-white text-xs rounded-full backdrop-blur-sm">
            <TagIcon size={12} />
            {photo.tags.length}个标签
          </span>
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm text-[#1e293b] font-medium truncate" title={photo.fileName}>
          {photo.fileName}
        </p>

        <div className="flex flex-wrap gap-1 mt-2">
          {photo.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-[#e0e7ff] text-[#4338ca] text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {photo.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              +{photo.tags.length - 3}
            </span>
          )}
        </div>

        <button
          onClick={handleSimilarClick}
          className={cn(
            'mt-3 w-full py-1.5 px-3 rounded-lg text-sm font-medium transition-all duration-200',
            'flex items-center justify-center gap-1.5',
            isReference
              ? 'bg-[#4338ca] text-white'
              : 'bg-[#f1f5f9] text-[#4338ca] hover:bg-[#e0e7ff]'
          )}
        >
          <Layers size={14} />
          {isReference ? '已选中为参考' : '相似照片'}
        </button>
      </div>
    </div>
  );
});
