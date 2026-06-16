import type { Artist } from '../types';
import { useFavorites } from '../hooks/useData';

interface Props {
  artist: Artist;
}

export default function FavoriteButton({ artist }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(artist.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(artist);
  };

  return (
    <button
      className={'favorite-btn' + (fav ? ' active' : '')}
      onClick={handleClick}
      title={fav ? '取消收藏' : '收藏'}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={fav ? '#ef4444' : 'none'}
        stroke={fav ? '#ef4444' : '#9ca3af'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
