import { motion } from 'framer-motion';

interface CollectionCardProps {
  item: {
    id: string;
    title: string;
    type: 'book' | 'movie' | 'music';
    creator: string;
    cover_url: string;
    rating: number;
    review_count?: number;
  };
  onClick: () => void;
  index?: number;
}

const typeLabels = {
  book: { label: '书籍', color: 'var(--book-green)' },
  movie: { label: '电影', color: 'var(--movie-blue)' },
  music: { label: '音乐', color: 'var(--music-purple)' },
};

const CollectionCard = ({ item, onClick, index = 0 }: CollectionCardProps) => {
  const typeInfo = typeLabels[item.type];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{
          fontSize: '16px',
          color: i < rating ? 'var(--star-gold)' : 'var(--star-gray)',
          background: i < rating ? 'linear-gradient(135deg, #F1C40F, #F39C12)' : 'transparent',
          WebkitBackgroundClip: i < rating ? 'text' : 'unset',
          WebkitTextFillColor: i < rating ? 'transparent' : 'var(--star-gray)',
          backgroundClip: i < rating ? 'text' : 'unset',
        }}
      >
        ★
      </span>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      style={{
        backgroundColor: 'var(--card-white)',
        borderRadius: '12px',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        width: '320px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          height: item.type === 'music' ? '200px' : '280px',
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
        }}
      >
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={item.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: typeInfo.color + '20',
              color: typeInfo.color,
              fontSize: '48px',
            }}
          >
            {item.type === 'book' ? '📚' : item.type === 'movie' ? '🎬' : '🎵'}
          </div>
        )}
      </motion.div>

      <div style={{ padding: '16px' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: typeInfo.color,
            marginBottom: '8px',
          }}
        >
          {typeInfo.label}
        </div>

        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '4px',
            color: 'var(--text-dark)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-gray)',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.creator}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {renderStars(item.rating)}
          </div>
          {item.review_count !== undefined && item.review_count > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
              {item.review_count}条评价
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionCard;
