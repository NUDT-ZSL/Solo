import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Photo } from '../types';

interface PhotoCardProps {
  photo: Photo;
  index: number;
}

export default function PhotoCard({ photo, index }: PhotoCardProps) {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#f5c518';
    if (score >= 60) return '#52c41a';
    return '#ff4d4f';
  };

  const color = getScoreColor(photo.score);
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (photo.score / 100) * circumference;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 120 }}
      whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(245, 197, 24, 0.2)' }}
      onClick={() => navigate(`/photo/${photo.id}`)}
      style={{
        background: '#16213e',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        marginBottom: 16,
        breakInside: 'avoid',
      }}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={photo.url}
          alt={photo.filename}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 48,
            height: 48,
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="rgba(22, 33, 62, 0.9)"
              stroke="#0f3460"
              strokeWidth="2"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <text
              x="24"
              y="28"
              textAnchor="middle"
              fill={color}
              fontSize="14"
              fontWeight="bold"
            >
              {photo.score}
            </text>
          </svg>
        </div>
      </div>
      <div
        style={{
          padding: '12px 16px',
        }}
      >
        <p
          style={{
            color: '#8888aa',
            fontSize: 13,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {photo.filename}
        </p>
      </div>
    </motion.div>
  );
}
