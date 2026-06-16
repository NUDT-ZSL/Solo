import { useNavigate } from 'react-router-dom';
import type { Artist } from '../types';
import FavoriteButton from './FavoriteButton';

interface Props {
  artist: Artist & { songCount?: number };
  index?: number;
}

export default function ArtistCard({ artist, index = 0 }: Props) {
  const navigate = useNavigate();
  const delay = index * 0.1;

  return (
    <div
      className="artist-card"
      style={{ animationDelay: `${delay}s` }}
      onClick={() => navigate(`/artist/${artist.id}`)}
    >
      <FavoriteButton artist={artist} />
      <img src={artist.avatar} alt={artist.name} className="artist-avatar" />
      <div className="artist-name">{artist.name}</div>
      <p className="artist-bio">{artist.bio}</p>
      <div className="artist-genres">
        {artist.genre.slice(0, 3).map((g, i) => (
          <span key={i} className="genre-tag">{g}</span>
        ))}
      </div>
      <div className="artist-meta">
        <span>🎵 {(artist as { songCount?: number }).songCount ?? 0} 首作品</span>
      </div>
    </div>
  );
}
