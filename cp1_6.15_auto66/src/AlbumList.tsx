import React from 'react';
import { Album, albums } from './data';

interface AlbumListProps {
  selectedAlbumId: string | null;
  onSelectAlbum: (album: Album) => void;
  switching: boolean;
  previousAlbumId: string | null;
}

const PlayIcon: React.FC = () => (
  <svg viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const AlbumCard: React.FC<{
  album: Album;
  isSelected: boolean;
  isPrevious: boolean;
  switching: boolean;
  onClick: () => void;
}> = ({ album, isSelected, isPrevious, switching, onClick }) => {
  const showGlow = switching ? isPrevious : isSelected;

  return (
    <div
      className={`album-card${showGlow ? ' selected' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${album.gradientColors[0]} 0%, ${album.gradientColors[1]} 100%)`
      }}
      onClick={onClick}
    >
      <div className="album-card-cover">
        <span className="album-card-initial">{album.name.charAt(0)}</span>
        <div className="album-card-play-icon">
          <PlayIcon />
        </div>
      </div>
      <div className="album-card-info">
        <div className="album-card-name" title={album.name}>
          {album.name}
        </div>
        <div className="album-card-meta">
          <span>{album.artist}</span>
          <span className="dot" />
          <span>{album.year}</span>
        </div>
      </div>
    </div>
  );
};

const AlbumList: React.FC<AlbumListProps> = ({
  selectedAlbumId,
  onSelectAlbum,
  switching,
  previousAlbumId
}) => {
  return (
    <div className="album-list-container">
      <div className="album-list-title">Albums</div>
      <div className="album-list">
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            isSelected={selectedAlbumId === album.id}
            isPrevious={previousAlbumId === album.id}
            switching={switching}
            onClick={() => onSelectAlbum(album)}
          />
        ))}
      </div>
    </div>
  );
};

export default AlbumList;
