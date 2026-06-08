import { PartType } from '../types';
import { getPartsByType, COLORS, getColorHex } from '../data';

interface AccessoryGridProps {
  type: PartType;
  selectedPartId: string;
  selectedColorId: string;
  onPartSelect: (partId: string) => void;
  onColorSelect: (colorId: string) => void;
}

const typeIcons: Record<PartType, string> = {
  hair: '💇',
  top: '👕',
  bottom: '👖',
  shoes: '👟',
  accessory: '💍',
};

export default function AccessoryGrid({
  type,
  selectedPartId,
  selectedColorId,
  onPartSelect,
  onColorSelect,
}: AccessoryGridProps) {
  const parts = getPartsByType(type);
  const availableColors = type === 'accessory' && selectedPartId === 'acc-none'
    ? []
    : COLORS;

  return (
    <div className="accessory-grid">
      <div className="part-options">
        {parts.map(part => (
          <div
            key={part.id}
            className={`part-card ${selectedPartId === part.id ? 'selected' : ''}`}
            onClick={() => onPartSelect(part.id)}
          >
            <div className="part-icon" style={{ backgroundColor: selectedPartId === part.id ? getColorHex(selectedColorId) : '#e8e8e8' }}>
              {typeIcons[type]}
            </div>
            <div className="part-name">{part.name}</div>
          </div>
        ))}
      </div>

      {availableColors.length > 0 && (
        <div className="color-options">
          <span className="color-label">颜色：</span>
          {availableColors.map(color => (
            <div
              key={color.id}
              className={`color-dot ${selectedColorId === color.id ? 'selected' : ''}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => onColorSelect(color.id)}
              title={color.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
