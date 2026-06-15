import { PetType } from '../types';

interface PetSelectionProps {
  onSelect: (type: PetType) => void;
}

const PET_OPTIONS: { type: PetType; name: string; emoji: string; description: string; color: string }[] = [
  {
    type: 'cat',
    name: '小橘猫',
    emoji: '🐱',
    description: '温柔可爱，喜欢被抚摸',
    color: '#FF8C42',
  },
  {
    type: 'dog',
    name: '旺财犬',
    emoji: '🐶',
    description: '忠诚活泼，最爱玩球',
    color: '#4EA8DE',
  },
  {
    type: 'dragon',
    name: '小火龙',
    emoji: '🐲',
    description: '神秘强大，渴望冒险',
    color: '#9B5DE5',
  },
];

export default function PetSelection({ onSelect }: PetSelectionProps) {
  return (
    <div className="selection-container">
      <div className="selection-header">
        <h1 className="selection-title">🐾 选择你的宠物伙伴</h1>
        <p className="selection-subtitle">每个宠物都有独特的性格，选择一个开始你的养成之旅</p>
      </div>
      <div className="selection-cards">
        {PET_OPTIONS.map((option) => (
          <div
            key={option.type}
            className="selection-card"
            style={{ '--pet-color': option.color } as React.CSSProperties}
            onClick={() => onSelect(option.type)}
          >
            <div className="selection-card-glow" />
            <div className="selection-pet-emoji">{option.emoji}</div>
            <h2 className="selection-pet-name">{option.name}</h2>
            <p className="selection-pet-desc">{option.description}</p>
            <div className="selection-adopt-btn">领养</div>
          </div>
        ))}
      </div>
    </div>
  );
}
