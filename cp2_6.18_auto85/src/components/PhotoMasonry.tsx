import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { Photo } from '../types';
import { api } from '../api';
import './PhotoMasonry.css';

interface PhotoMasonryProps {
  photos: Photo[];
  onFavoriteChange?: () => void;
}

export default function PhotoMasonry({ photos, onFavoriteChange }: PhotoMasonryProps) {
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(photos);

  const handleToggleFavorite = async (photo: Photo) => {
    try {
      const newFavoriteState = !photo.isFavorite;
      setLocalPhotos(prev =>
        prev.map(p =>
          p.id === photo.id ? { ...p, isFavorite: newFavoriteState } : p
        )
      );
      await api.toggleFavorite(photo.activityId, photo.id, newFavoriteState);
      if (onFavoriteChange) onFavoriteChange();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setLocalPhotos(prev =>
        prev.map(p =>
          p.id === photo.id ? { ...p, isFavorite: photo.isFavorite } : p
        )
      );
    }
  };

  if (localPhotos.length === 0) {
    return (
      <div className="photo-empty-state">
        <div className="empty-icon">📷</div>
        <p>暂无活动照片</p>
      </div>
    );
  }

  return (
    <div className="photo-masonry">
      {localPhotos.map((photo) => (
        <div key={photo.id} className="photo-item">
          <img
            src={photo.url}
            alt={photo.filename}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=happy%20family%20activity%20warm%20colors&image_size=landscape_4_3`;
            }}
          />
          <div className="photo-overlay">
            <button
              className={`favorite-btn ${photo.isFavorite ? 'active' : ''}`}
              onClick={() => handleToggleFavorite(photo)}
              aria-label={photo.isFavorite ? '取消精彩瞬间' : '标记为精彩瞬间'}
            >
              <Heart
                size={24}
                fill={photo.isFavorite ? '#f44336' : 'none'}
                color={photo.isFavorite ? '#f44336' : 'white'}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
