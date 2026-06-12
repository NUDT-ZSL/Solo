import React from 'react';

interface GeometryIconProps {
  type: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus';
  size?: number;
  color?: string;
}

const CubeIcon: React.FC<{ stroke: string }> = ({ stroke }) => (
  <>
    <path d="M16 4 L28 10 L28 22 L16 28 L4 22 L4 10 Z" stroke={stroke} />
    <line x1="16" y1="4" x2="16" y2="28" stroke={stroke} />
    <line x1="4" y1="10" x2="16" y2="16" stroke={stroke} />
    <line x1="28" y1="10" x2="16" y2="16" stroke={stroke} />
    <line x1="16" y1="16" x2="16" y2="28" stroke={stroke} />
  </>
);

const SphereIcon: React.FC<{ stroke: string }> = ({ stroke }) => (
  <>
    <circle cx="16" cy="16" r="12" stroke={stroke} />
    <ellipse cx="16" cy="16" rx="12" ry="4" stroke={stroke} />
    <ellipse cx="16" cy="16" rx="4" ry="12" stroke={stroke} />
  </>
);

const CylinderIcon: React.FC<{ stroke: string }> = ({ stroke }) => (
  <>
    <ellipse cx="16" cy="8" rx="10" ry="4" stroke={stroke} />
    <line x1="6" y1="8" x2="6" y2="24" stroke={stroke} />
    <line x1="26" y1="8" x2="26" y2="24" stroke={stroke} />
    <ellipse cx="16" cy="24" rx="10" ry="4" stroke={stroke} />
  </>
);

const ConeIcon: React.FC<{ stroke: string }> = ({ stroke }) => (
  <>
    <ellipse cx="16" cy="24" rx="10" ry="4" stroke={stroke} />
    <line x1="16" y1="4" x2="6" y2="24" stroke={stroke} />
    <line x1="16" y1="4" x2="26" y2="24" stroke={stroke} />
  </>
);

const TorusIcon: React.FC<{ stroke: string }> = ({ stroke }) => (
  <>
    <ellipse cx="16" cy="16" rx="12" ry="6" stroke={stroke} />
    <ellipse cx="16" cy="16" rx="5" ry="2.5" stroke={stroke} />
    <path d="M4 16 Q4 10 10 8" stroke={stroke} />
    <path d="M28 16 Q28 10 22 8" stroke={stroke} />
    <path d="M4 16 Q4 22 10 24" stroke={stroke} />
    <path d="M28 16 Q28 22 22 24" stroke={stroke} />
  </>
);

const iconMap: Record<GeometryIconProps['type'], React.FC<{ stroke: string }>> = {
  cube: CubeIcon,
  sphere: SphereIcon,
  cylinder: CylinderIcon,
  cone: ConeIcon,
  torus: TorusIcon,
};

const GeometryIcon: React.FC<GeometryIconProps> = ({ type, size = 32, color = 'currentColor' }) => {
  const Icon = iconMap[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Icon stroke={color} />
    </svg>
  );
};

export default GeometryIcon;
