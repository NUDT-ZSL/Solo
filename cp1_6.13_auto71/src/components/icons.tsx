import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const TomatoIcon: React.FC<IconProps> = ({ size = 75, color = '#e74c3c' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 15 C42 15, 35 22, 35 32 C35 38, 38 42, 42 44 L42 45 C28 48, 18 62, 18 72 C18 85, 32 95, 50 95 C68 95, 82 85, 82 72 C82 62, 72 48, 58 45 L58 44 C62 42, 65 38, 65 32 C65 22, 58 15, 50 15 Z" fill={color} />
    <path d="M50 20 C46 20, 43 23, 43 27 C43 30, 45 32, 47 32" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
    <path d="M50 20 L52 12 L56 18 L62 16 L58 22 L54 20 Z" fill="#22c55e" />
    <ellipse cx="38" cy="55" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
  </svg>
);

export const MintIcon: React.FC<IconProps> = ({ size = 75, color = '#8fbc8f' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 85 L50 50" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 50 C50 50, 35 42, 30 32 C28 28, 30 22, 34 20 C40 18, 50 25, 50 35" fill={color} />
    <path d="M50 50 C50 50, 65 42, 70 32 C72 28, 70 22, 66 20 C60 18, 50 25, 50 35" fill={color} />
    <path d="M50 60 C50 60, 32 55, 25 48 C22 45, 22 40, 25 38 C30 35, 50 40, 50 48" fill={color} />
    <path d="M50 60 C50 60, 68 55, 75 48 C78 45, 78 40, 75 38 C70 35, 50 40, 50 48" fill={color} />
    <path d="M50 70 C50 70, 30 68, 22 62 C19 60, 19 56, 22 54 C28 51, 50 55, 50 62" fill={color} />
    <path d="M50 70 C50 70, 70 68, 78 62 C81 60, 81 56, 78 54 C72 51, 50 55, 50 62" fill={color} />
  </svg>
);

export const PepperIcon: React.FC<IconProps> = ({ size = 75, color = '#ff6347' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 20 C50 20, 35 22, 32 30 C30 35, 32 42, 38 48 C38 48, 32 55, 32 65 C32 78, 42 90, 55 90 C65 90, 72 82, 72 72 C72 60, 68 52, 62 45 C68 40, 70 32, 66 28 C60 22, 50 20, 50 20 Z" fill={color} />
    <path d="M50 20 C50 20, 52 15, 55 12 C58 10, 62 12, 60 15 C58 18, 55 20, 52 20" stroke="#22c55e" strokeWidth="2" />
    <path d="M45 15 L50 20 L55 15" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="42" cy="58" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
  </svg>
);

export const CucumberIcon: React.FC<IconProps> = ({ size = 75, color = '#228b22' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M72 15 C68 15, 62 18, 52 28 C35 45, 22 62, 20 72 C18 82, 22 90, 30 90 C38 90, 48 82, 65 65 C78 52, 85 40, 85 30 C85 22, 80 15, 72 15 Z" fill={color} />
    <circle cx="35" cy="70" r="2" fill="#166534" />
    <circle cx="42" cy="62" r="2" fill="#166534" />
    <circle cx="50" cy="55" r="2" fill="#166534" />
    <circle cx="58" cy="48" r="2" fill="#166534" />
    <circle cx="65" cy="40" r="2" fill="#166534" />
    <circle cx="48" cy="75" r="2" fill="#166534" />
    <circle cx="55" cy="68" r="2" fill="#166534" />
    <path d="M72 15 C75 18, 78 20, 82 20" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const StrawberryIcon: React.FC<IconProps> = ({ size = 75, color = '#dc143c' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 85 C35 85, 20 72, 20 55 C20 42, 30 32, 42 30 C45 22, 50 18, 50 18 C50 18, 55 22, 58 30 C70 32, 80 42, 80 55 C80 72, 65 85, 50 85 Z" fill={color} />
    <path d="M38 28 L50 20 L62 28 L58 32 L50 26 L42 32 Z" fill="#22c55e" />
    <path d="M50 18 L48 10 L52 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="38" cy="50" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="50" cy="48" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="62" cy="50" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="42" cy="62" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="58" cy="62" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="50" cy="72" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="32" cy="58" rx="1.5" ry="2" fill="#ffd700" />
    <ellipse cx="68" cy="58" rx="1.5" ry="2" fill="#ffd700" />
  </svg>
);

export const LettuceIcon: React.FC<IconProps> = ({ size = 75, color = '#32cd32' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="80" rx="22" ry="8" fill="#8fbc8f" />
    <path d="M50 80 C35 80, 25 65, 25 50 C25 40, 30 32, 38 28 C38 28, 42 22, 50 22 C58 22, 62 28, 62 28 C70 32, 75 40, 75 50 C75 65, 65 80, 50 80 Z" fill={color} />
    <path d="M50 75 C45 75, 38 70, 35 60 C35 55, 40 50, 45 50 C48 50, 50 52, 50 55" fill="#8fbc8f" />
    <path d="M50 75 C55 75, 62 70, 65 60 C65 55, 60 50, 55 50 C52 50, 50 52, 50 55" fill="#8fbc8f" />
    <path d="M50 65 C48 65, 42 62, 40 55 C40 52, 42 48, 45 48 C48 48, 50 50, 50 52" fill="#8fbc8f" />
    <path d="M50 65 C52 65, 58 62, 60 55 C60 52, 58 48, 55 48 C52 48, 50 50, 50 52" fill="#8fbc8f" />
    <path d="M50 55 C50 55, 50 45, 50 35" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" strokeDasharray="2,2" />
  </svg>
);

export const CarrotIcon: React.FC<IconProps> = ({ size = 75, color = '#cd5c5c' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 20 C48 15, 45 10, 40 8 C38 12, 42 18, 45 22" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 20 C52 15, 55 10, 60 8 C62 12, 58 18, 55 22" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 20 L50 12" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M38 25 C32 35, 28 50, 30 70 C32 85, 42 92, 50 92 C58 92, 68 85, 70 70 C72 50, 68 35, 62 25 C58 22, 42 22, 38 25 Z" fill={color} />
    <path d="M42 40 L48 42" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M52 50 L58 52" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M40 60 L46 62" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M54 70 L60 72" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M45 78 L51 80" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SunflowerIcon: React.FC<IconProps> = ({ size = 75, color = '#ffd700' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 90 L50 55" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 75 C50 75, 35 70, 30 62" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
      <ellipse
        key={angle}
        cx="50"
        cy="40"
        rx="8"
        ry="18"
        fill={color}
        transform={`rotate(${angle} 50 40) translate(0 -12)`}
      />
    ))}
    <circle cx="50" cy="40" r="15" fill="#8b4513" />
    <circle cx="45" cy="38" r="2" fill="#4a2c0a" />
    <circle cx="55" cy="38" r="2" fill="#4a2c0a" />
    <circle cx="50" cy="43" r="2" fill="#4a2c0a" />
    <circle cx="47" cy="45" r="1.5" fill="#4a2c0a" />
    <circle cx="53" cy="45" r="1.5" fill="#4a2c0a" />
  </svg>
);

export const DefaultPlantIcon: React.FC<IconProps> = ({ size = 75, color = '#22c55e' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 90 L50 50" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="50" cy="92" rx="20" ry="6" fill="#8b5a2b" />
    <path d="M50 50 C35 45, 25 35, 25 25 C25 18, 35 15, 45 20 C48 22, 50 28, 50 35" fill={color} />
    <path d="M50 50 C65 45, 75 35, 75 25 C75 18, 65 15, 55 20 C52 22, 50 28, 50 35" fill={color} />
    <path d="M50 60 C40 58, 30 52, 30 45 C30 40, 35 38, 42 40 C46 42, 50 46, 50 52" fill={color} />
    <path d="M50 60 C60 58, 70 52, 70 45 C70 40, 65 38, 58 40 C54 42, 50 46, 50 52" fill={color} />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const WaterIcon: React.FC<IconProps> = ({ size = 20, color = '#3b82f6' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill={color} />
  </svg>
);

export const FertilizerIcon: React.FC<IconProps> = ({ size = 20, color = '#f97316' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill={color} />
    <path d="M8 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PruneIcon: React.FC<IconProps> = ({ size = 20, color = '#8b5cf6' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6" r="3" fill={color} />
    <circle cx="18" cy="6" r="3" fill={color} />
    <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 15v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PlantIcon: React.FC<IconProps> = ({ size = 20, color = '#22c55e' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 22h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M10 22V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M14 22V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M17 8C17 5 15 3 12 3C9 3 7 5 7 8C7 10 9 11 12 11C15 11 17 10 17 8z" fill={color} />
  </svg>
);

export const PLANT_ICONS: Record<string, React.FC<IconProps>> = {
  '番茄': TomatoIcon,
  '薄荷': MintIcon,
  '辣椒': PepperIcon,
  '黄瓜': CucumberIcon,
  '草莓': StrawberryIcon,
  '生菜': LettuceIcon,
  '萝卜': CarrotIcon,
  '向日葵': SunflowerIcon,
};

export function getPlantIcon(type: string): React.FC<IconProps> {
  return PLANT_ICONS[type] || DefaultPlantIcon;
}

export const EVENT_ICONS: Record<string, React.FC<IconProps>> = {
  plant: PlantIcon,
  water: WaterIcon,
  fertilize: FertilizerIcon,
  prune: PruneIcon,
};
