import { CardParams } from './types';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

export const getComplementaryColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  return `#${(
    (1 << 24) +
    ((255 - rgb.r) << 16) +
    ((255 - rgb.g) << 8) +
    (255 - rgb.b)
  )
    .toString(16)
    .slice(1)}`;
};

export const generateCardCSS = (params: CardParams): string => {
  const { baseColor, gradientAngle, glowRadius, glowOpacity, borderRadius, backdropBlur } = params;
  const rgb = hexToRgb(baseColor);
  const rgbaColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : `rgba(102, 126, 234, 0.3)`;

  return `.glow-card {
  position: relative;
  width: 320px;
  height: 420px;
  border-radius: ${borderRadius}px;
  background: linear-gradient(${gradientAngle}deg, ${baseColor}cc 0%, ${rgbaColor} 100%);
  backdrop-filter: blur(${backdropBlur}px);
  -webkit-backdrop-filter: blur(${backdropBlur}px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: visible;
}

.glow-card::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(100% + ${glowRadius * 2}px);
  height: calc(100% + ${glowRadius * 2}px);
  transform: translate(-50%, -50%);
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, ${0.2 * glowOpacity}) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: ${borderRadius}px;
  z-index: -1;
  filter: blur(${glowRadius / 2}px);
}

.glow-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: ${borderRadius}px;
  background: linear-gradient(
    ${gradientAngle + 90}deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
  pointer-events: none;
}`;
};

export const generateCardStyleObj = (params: CardParams): React.CSSProperties => {
  const { baseColor, gradientAngle, borderRadius, backdropBlur } = params;
  const rgb = hexToRgb(baseColor);
  const rgbaColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : `rgba(102, 126, 234, 0.3)`;

  return {
    position: 'relative',
    width: '320px',
    height: '420px',
    borderRadius: `${borderRadius}px`,
    background: `linear-gradient(${gradientAngle}deg, ${baseColor}cc 0%, ${rgbaColor} 100%)`,
    backdropFilter: `blur(${backdropBlur}px)`,
    WebkitBackdropFilter: `blur(${backdropBlur}px)`,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    overflow: 'visible'
  };
};

export const generateGlowStyleObj = (params: CardParams): React.CSSProperties => {
  const { glowRadius, glowOpacity, borderRadius } = params;

  return {
    content: "''",
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `calc(100% + ${glowRadius * 2}px)`,
    height: `calc(100% + ${glowRadius * 2}px)`,
    transform: 'translate(-50%, -50%)',
    background: `radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, ${0.2 * glowOpacity}) 0%,
      rgba(255, 255, 255, 0) 70%
    )`,
    borderRadius: `${borderRadius}px`,
    zIndex: -1,
    filter: `blur(${glowRadius / 2}px)`
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};

export const fetchCardById = async (id: string): Promise<CardParams | null> => {
  try {
    const res = await fetch(`/api/cards/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const shareCard = async (params: CardParams): Promise<{ id: string; shareUrl: string } | null> => {
  try {
    const res = await fetch('/api/cards/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchHistory = async (): Promise<CardParams[] & { id: string; createdAt: number }[]> => {
  try {
    const res = await fetch('/api/cards');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};
