import type { ItemType } from '../../types';

interface ItemIconProps {
  type: ItemType;
  size?: number;
}

function ItemIcon({ type, size = 32 }: ItemIconProps) {
  const icons: Record<ItemType, JSX.Element> = {
    key: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="12" width="8" height="8" rx="4" fill="#f97316" />
        <rect x="12" y="14" width="14" height="4" fill="#f97316" />
        <rect x="22" y="10" width="4" height="4" fill="#f97316" />
        <rect x="26" y="14" width="2" height="4" fill="#f97316" />
      </svg>
    ),
    safe: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="2" fill="#64748b" />
        <rect x="8" y="8" width="16" height="12" fill="#475569" />
        <circle cx="16" cy="14" r="4" fill="#334155" />
        <circle cx="16" cy="14" r="2" fill="#1e293b" />
        <rect x="14" y="22" width="4" height="4" fill="#f97316" />
        <rect x="6" y="6" width="4" height="2" fill="#94a3b8" />
        <rect x="22" y="6" width="4" height="2" fill="#94a3b8" />
      </svg>
    ),
    sensor: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="10" fill="#22c55e" opacity="0.3" />
        <circle cx="16" cy="16" r="6" fill="#22c55e" opacity="0.5" />
        <circle cx="16" cy="16" r="3" fill="#22c55e" />
        <rect x="15" y="4" width="2" height="4" fill="#22c55e" />
        <rect x="15" y="24" width="2" height="4" fill="#22c55e" />
        <rect x="4" y="15" width="4" height="2" fill="#22c55e" />
        <rect x="24" y="15" width="4" height="2" fill="#22c55e" />
      </svg>
    ),
    door: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="6" y="2" width="20" height="28" rx="2" fill="#854d0e" />
        <rect x="8" y="4" width="16" height="24" rx="1" fill="#a16207" />
        <circle cx="21" cy="16" r="2" fill="#fde047" />
        <rect x="10" y="20" width="10" height="2" fill="#78350f" opacity="0.5" />
        <rect x="10" y="24" width="10" height="2" fill="#78350f" opacity="0.5" />
      </svg>
    ),
    note: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="6" y="4" width="20" height="24" rx="1" fill="#fef3c7" />
        <rect x="9" y="9" width="14" height="2" rx="1" fill="#92400e" />
        <rect x="9" y="13" width="14" height="2" rx="1" fill="#92400e" />
        <rect x="9" y="17" width="10" height="2" rx="1" fill="#92400e" />
        <rect x="9" y="21" width="12" height="2" rx="1" fill="#92400e" />
        <rect x="6" y="4" width="6" height="6" fill="#fbbf24" />
      </svg>
    )
  };

  return icons[type] || icons.note;
}

export default ItemIcon;
