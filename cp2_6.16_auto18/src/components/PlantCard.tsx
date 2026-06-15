import { useNavigate } from 'react-router-dom';
import type { IdentifyResult, Plant } from '../types';

interface PlantCardProps {
  plant: IdentifyResult | Plant;
  onClick?: () => void;
  showConfidence?: boolean;
}

export default function PlantCard({ plant, onClick, showConfidence = false }: PlantCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if ('addedAt' in plant) {
      navigate(`/plant/${plant.id}`);
    }
  };

  return (
    <div className="plant-card" onClick={handleClick}>
      <img
        src={plant.image}
        alt={plant.name}
        className="plant-card-image"
        loading="lazy"
      />
      <div className="plant-card-content">
        <div className="plant-card-name">{plant.name}</div>
        {showConfidence && 'confidence' in plant && (
          <div className="plant-card-confidence">
            匹配度：{plant.confidence}%
          </div>
        )}
        {!showConfidence && 'scientificName' in plant && (
          <div className="plant-card-confidence" style={{ fontSize: '12px' }}>
            {plant.scientificName}
          </div>
        )}
        {!showConfidence && 'location' in plant && (
          <div style={{ fontSize: '12px', color: 'var(--color-secondary)', marginTop: '4px' }}>
            {plant.location}
          </div>
        )}
      </div>
    </div>
  );
}
