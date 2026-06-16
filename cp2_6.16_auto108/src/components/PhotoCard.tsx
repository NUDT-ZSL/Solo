import type { Photo } from '../types';

interface PhotoCardProps {
  photo: Photo;
  onClick?: (photo: Photo) => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const handleClick = () => {
    onClick?.(photo);
  };

  return (
    <div className="photo-card" onClick={handleClick}>
      <img src={photo.imageUrl} alt={photo.title} loading="lazy" />
      <div style={{ padding: '12px 14px 14px', position: 'relative' }}>
        <h3
          style={{
            margin: 0,
            marginBottom: '8px',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}
        >
          {photo.title}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {photo.smellTags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="smell-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
