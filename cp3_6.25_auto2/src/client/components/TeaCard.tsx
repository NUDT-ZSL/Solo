import { Coffee, Heart } from 'lucide-react';
import { useState } from 'react';

interface LatestTasting {
  totalScore: number;
  notes: string | string[];
  createdAt?: string;
  latestNotes?: string[];
}
const normalizeNotes = (notes: string | string[] | undefined, latest: string[] | undefined): string[] => {
  if (Array.isArray(latest) && latest.length > 0) return latest;
  if (Array.isArray(notes)) return notes;
  if (typeof notes === 'string' && notes.trim()) {
    const lines = notes.split(/[。！？.!?\n]/).map(s => s.trim()).filter(Boolean);
    return lines.length > 0 ? lines.slice(0, 3) : [notes.length > 36 ? notes.slice(0, 36) + '…' : notes];
  }
  return [];
};

interface TeaCardProps {
  id: string;
  name: string;
  origin: string;
  year: number;
  imageUrl: string;
  isFavorite: boolean;
  latestTasting?: LatestTasting;
  onTasting: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const TEA_EMOJIS = ['🍵', '🍃', '🌿', '🫖', '🍂'];
const TEA_COLORS = [
  ['#e8f5e9', '#a5d6a7'],
  ['#fce4ec', '#f48fb1'],
  ['#fff3e0', '#ffcc80'],
  ['#f3e5f5', '#ce93d8'],
  ['#e0f7fa', '#80deea'],
  ['#f1f8e9', '#aed581'],
];
const makePlaceholder = (seed: number, name: string) => {
  const emoji = TEA_EMOJIS[seed % TEA_EMOJIS.length];
  const [c1, c2] = TEA_COLORS[seed % TEA_COLORS.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/>
    </linearGradient></defs>
    <rect width='160' height='160' fill='url(#g)'/>
    <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='56'>${emoji}</text>
    <text x='50%' y='86%' dominant-baseline='middle' text-anchor='middle' font-size='14' font-weight='bold' fill='#5d4037' font-family='sans-serif'>${encodeURIComponent(name).slice(0,2)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${svg.replace(/\s+/g, ' ')}`;
};
const getImageSrc = (url: string, name: string, seed: number) => {
  if (url && url.startsWith('data:')) return url;
  if (url && !url.includes('unsplash')) return url;
  return makePlaceholder(seed, name || '茶');
};

export default function TeaCard({
  id,
  name,
  origin,
  year,
  imageUrl,
  isFavorite,
  latestTasting,
  onTasting,
  onToggleFavorite,
}: TeaCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFavoriteClick = () => {
    if (!isFavorite) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 200);
    }
    onToggleFavorite(id);
  };

  return (
    <div
      style={{
        width: 200,
        height: 280,
        borderRadius: 12,
        background: 'linear-gradient(180deg, #ede7f6 0%, #f3e5f5 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        position: 'relative',
        boxShadow: '0 2px 8px rgba(123,31,162,0.1)',
        transition: 'all 0.2s ease',
      }}
      className="hover:scale-[1.03]"
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(123,31,162,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(123,31,162,0.1)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
        }}
        onClick={handleFavoriteClick}
      >
        <Heart
          size={22}
          fill={isFavorite ? '#e91e63' : 'none'}
          stroke={isFavorite ? '#e91e63' : '#e91e63'}
          strokeWidth={2}
          style={{ display: 'block' }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <img
          src={getImageSrc(imageUrl, name, id ? id.charCodeAt(id.length - 1) : 0)}
          alt={name}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = makePlaceholder(0, name);
          }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '3px solid #ce93d8',
            objectFit: 'cover',
            background: '#fff',
          }}
        />
      </div>

      <div
        style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#4a148c',
            textAlign: 'center',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
        {name}
      </div>

      <div
        style={{
          fontSize: 13,
          color: '#757575',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {origin} · {year}年
      </div>

      {latestTasting && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            fontSize: 12,
            color: '#666',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 8,
            padding: 8,
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              color: '#7b1fa2',
              marginBottom: 4,
            }}
          >
            总分: {latestTasting.totalScore}
          </div>
          {normalizeNotes(latestTasting.notes, latestTasting.latestNotes).map((note, index) => (
            <div
              key={index}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.5,
              }}
            >
              · {note}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onTasting(id)}
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#7b1fa2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: 'none',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          boxShadow: '0 2px 6px rgba(123,31,162,0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,31,162,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(123,31,162,0.3)';
        }}
      >
        <Coffee size={18} />
      </button>
    </div>
  );
}
