interface HeartIconProps {
  filled: boolean;
  size?: number;
  hovered?: boolean;
}

export default function HeartIcon({
  filled,
  size = 24,
  hovered = false,
}: HeartIconProps) {
  const strokeColor = filled ? '#ff6b6b' : hovered ? '#ff6b6b' : '#cccccc';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#ff6b6b' : 'none'}
      stroke={strokeColor}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'all 0.2s ease' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
