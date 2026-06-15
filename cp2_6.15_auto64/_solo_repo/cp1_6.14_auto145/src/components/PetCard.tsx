import { Pet } from '../types';
import { useNavigate } from 'react-router-dom';

interface PetCardProps {
  pet: Pet;
  onEdit: (pet: Pet) => void;
  onDelete: (id: string) => void;
}

const defaultAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="%23d4a373"/><text x="32" y="40" font-size="24" text-anchor="middle" fill="white" font-family="sans-serif">🐾</text></svg>'
);

export default function PetCard({ pet, onEdit, onDelete }: PetCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/pet/${pet.id}/records`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(pet);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(pet.id);
  };

  const handleViewRecords = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/pet/${pet.id}/records`);
  };

  const formatBirthday = (birthday: string) => {
    if (!birthday) return '未设置';
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return `${age - 1}岁`;
    }
    return `${age}岁`;
  };

  return (
    <div className="pet-card" onClick={handleCardClick}>
      <div className="pet-card-header">
        <div className="pet-avatar-wrapper">
          <img
            className="pet-avatar"
            src={pet.avatar || defaultAvatar}
            alt={pet.name}
          />
        </div>
        <div className="pet-info">
          <div className="pet-name">{pet.name}</div>
          <div className="pet-detail">{pet.breed || '未知品种'}</div>
          <div className="pet-detail">{formatBirthday(pet.birthday)}</div>
          <div className="pet-detail">{pet.weight} kg</div>
        </div>
      </div>
      <div className="pet-card-actions">
        <button
          className="icon-btn"
          onClick={handleEdit}
          title="编辑"
          aria-label="编辑宠物"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="icon-btn"
          onClick={handleDelete}
          title="删除"
          aria-label="删除宠物"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
        <button
          className="icon-btn"
          onClick={handleViewRecords}
          title="查看记录"
          aria-label="查看记录"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
