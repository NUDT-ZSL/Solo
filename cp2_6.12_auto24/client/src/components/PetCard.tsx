import { PetState } from '../types';

interface PetCardProps {
  pet: PetState;
}

export default function PetCard({ pet }: PetCardProps) {
  const petEmoji: Record<string, string> = {
    cat: '🐱',
    dog: '🐶',
    dragon: '🐲',
  };

  const bgColor: Record<string, string> = {
    cat: '#FFF3E0',
    dog: '#E3F2FD',
    dragon: '#F3E5F5',
  };

  return (
    <div className="pet-card" style={{ background: bgColor[pet.type] || '#FFF' }}>
      <div className="pet-card-header">
        <span className="pet-card-emoji">{petEmoji[pet.type]}</span>
        <span className="pet-card-name">{pet.name}</span>
      </div>
      <div className="pet-card-stats">
        <div className="pet-card-stat-row">
          <span className="pet-card-stat-label">❤️</span>
          <div className="pet-card-stat-bar-bg">
            <div
              className="pet-card-stat-bar health"
              style={{ width: `${pet.health}%` }}
            />
          </div>
          <span className="pet-card-stat-value">{pet.health}</span>
        </div>
        <div className="pet-card-stat-row">
          <span className="pet-card-stat-label">😊</span>
          <div className="pet-card-stat-bar-bg">
            <div
              className="pet-card-stat-bar happiness"
              style={{ width: `${pet.happiness}%` }}
            />
          </div>
          <span className="pet-card-stat-value">{pet.happiness}</span>
        </div>
        <div className="pet-card-stat-row">
          <span className="pet-card-stat-label">🍖</span>
          <div className="pet-card-stat-bar-bg">
            <div
              className="pet-card-stat-bar hunger"
              style={{ width: `${pet.hunger}%` }}
            />
          </div>
          <span className="pet-card-stat-value">{pet.hunger}</span>
        </div>
      </div>
    </div>
  );
}
