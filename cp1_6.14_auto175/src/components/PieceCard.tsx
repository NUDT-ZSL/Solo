import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import type { Piece } from '@/types';
import { getDifficultyLabel } from '@/utils/dataGenerator';
import './PieceCard.css';

interface PieceCardProps {
  piece: Piece;
}

export default function PieceCard({ piece }: PieceCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/piece/${piece.id}`);
  };

  const difficulties = [...new Set(piece.voiceParts.map((p) => p.difficulty))];
  const avgProgress = Math.round(
    piece.voiceParts.reduce((sum, p) => sum + p.progress, 0) / piece.voiceParts.length
  );

  return (
    <div className="piece-card" onClick={handleClick}>
      <h3 className="piece-card-title">{piece.title}</h3>
      <p className="piece-card-composer">{piece.composer}</p>

      <div className="piece-card-divider" />

      <div className="piece-card-info">
        <div className="piece-card-info-item">
          <Users size={16} />
          <span>{piece.voiceParts.length} 个声部</span>
        </div>
        <div className="piece-card-info-item">
          <span className="piece-card-key">{piece.key}</span>
        </div>
      </div>

      <div className="piece-card-difficulties">
        {difficulties.map((diff) => (
          <span key={diff} className={`difficulty-badge ${diff}`}>
            {getDifficultyLabel(diff)}
          </span>
        ))}
      </div>

      <div className="piece-card-progress">
        <div className="piece-card-progress-header">
          <span>平均进度</span>
          <span>{avgProgress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${avgProgress}%` }} />
        </div>
      </div>
    </div>
  );
}
