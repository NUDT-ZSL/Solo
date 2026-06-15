import { Link } from 'react-router-dom';
import type { Pet } from '../types';
import { StatusLabels, StatusColors } from '../types';

interface PetCardProps {
  pet: Pet;
  index: number;
}

export default function PetCard({ pet, index }: PetCardProps) {
  const statusColor = StatusColors[pet.status];

  return (
    <Link
      to={`/pets/${pet.id}`}
      className="pet-card"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="pet-card-photo">
        {pet.photos[0] ? (
          <img src={pet.photos[0]} alt={pet.name} />
        ) : (
          <div className="pet-card-photo-placeholder">
            <span>{pet.name.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="pet-card-info">
        <div className="pet-card-header">
          <h3 className="pet-card-name">{pet.name}</h3>
          <span
            className="pet-status-tag"
            style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
          >
            {StatusLabels[pet.status]}
          </span>
        </div>
        <p className="pet-card-breed">{pet.breed}</p>
        <p className="pet-card-age">{pet.age} 岁</p>
      </div>
    </Link>
  );
}
