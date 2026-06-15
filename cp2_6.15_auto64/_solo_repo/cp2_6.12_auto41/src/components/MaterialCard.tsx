import { useState, useContext } from 'react';
import { Heart, Trash2, CheckSquare, Square, Play } from 'lucide-react';
import { useStore } from '@/store';
import { apiClient } from '@/api';
import { FilterContext } from '@/App';
import type { Material } from '@shared/types';
import TagBadge from './TagBadge';

interface MaterialCardProps {
  material: Material;
  index: number;
}

export default function MaterialCard({ material, index }: MaterialCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { updateMaterial, removeMaterial, toggleSelect, selectedMaterials } = useStore();
  const { setSelectedTag } = useContext(FilterContext);
  const isSelected = selectedMaterials.includes(material.id);

  const handleFavorite = async () => {
    try {
      await apiClient.updateMaterial(material.id, {
        favorited: !material.favorited,
      });
      updateMaterial(material.id, { favorited: !material.favorited });
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个素材吗？')) return;
    try {
      await apiClient.deleteMaterial(material.id);
      removeMaterial(material.id);
    } catch (error) {
      console.error('Failed to delete material:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('materialId', material.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
  };

  const imageUrl = material.thumbnail_url || material.url;

  return (
    <div
      className="bg-white rounded-12 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
      style={{
        animation: `slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards`,
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={material.title}
          className="w-full h-auto object-cover"
        />

        {material.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play size={28} className="text-white ml-1" fill="white" />
            </div>
          </div>
        )}

        <div
          className={`absolute top-2 right-2 flex gap-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handleFavorite}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
          >
            <Heart
              size={18}
              className={material.favorited ? 'text-brand fill-brand' : 'text-gray-600'}
            />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-red-50 transition-colors"
          >
            <Trash2 size={18} className="text-red-500" />
          </button>

          <button
            onClick={() => toggleSelect(material.id)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
          >
            {isSelected ? (
              <CheckSquare size={18} className="text-brand fill-brand" />
            ) : (
              <Square size={18} className="text-gray-600" />
            )}
          </button>
        </div>

        {isSelected && (
          <div className="absolute top-2 left-2 p-1.5 bg-brand rounded-full">
            <CheckSquare size={16} className="text-white fill-white" />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm text-gray-800 font-medium truncate mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {material.title}
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {material.tags.slice(0, 5).map((tag) => (
            <TagBadge
              key={tag}
              name={tag}
              clickable
              onClick={() => handleTagClick(tag)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
