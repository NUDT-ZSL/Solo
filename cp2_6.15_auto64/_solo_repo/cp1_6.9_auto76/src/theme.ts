export interface Theme {
  name: string;
  displayName: string;
  background: string;
  pageBackground: string;
  spineGradient: string;
  shadowColor: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  thumbnailActiveBorder: string;
  primary: string;
}

const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
};

const themes: Record<string, Theme> = {
  warmSun: {
    name: 'warmSun',
    displayName: '暖阳旧梦',
    background: '#E8D5B7',
    pageBackground: '#F5E6D0',
    spineGradient: 'linear-gradient(90deg, #8B5E3C 0%, #A0724B 50%, #8B5E3C 100%)',
    shadowColor: 'rgba(139, 94, 60, 0.4)',
    textColor: '#5C3A1E',
    borderColor: darkenColor('#8B5E3C', 15),
    glowColor: 'rgba(255, 190, 110, 0.3)',
    thumbnailActiveBorder: '#FFD700',
    primary: '#C68B59',
  },
  deepSea: {
    name: 'deepSea',
    displayName: '深海往事',
    background: '#1A1A3E',
    pageBackground: '#2D2B55',
    spineGradient: 'linear-gradient(90deg, #483D8B 0%, #6A5ACD 50%, #483D8B 100%)',
    shadowColor: 'rgba(75, 0, 130, 0.5)',
    textColor: '#E6E6FA',
    borderColor: darkenColor('#6A5ACD', 15),
    glowColor: 'rgba(138, 43, 226, 0.35)',
    thumbnailActiveBorder: '#FFD700',
    primary: '#6A5ACD',
  },
  forestWhisper: {
    name: 'forestWhisper',
    displayName: '森林低语',
    background: '#D4E4BC',
    pageBackground: '#E8F0D7',
    spineGradient: 'linear-gradient(90deg, #556B2F 0%, #6B8E23 50%, #556B2F 100%)',
    shadowColor: 'rgba(101, 67, 33, 0.4)',
    textColor: '#2F4F2F',
    borderColor: darkenColor('#556B2F', 15),
    glowColor: 'rgba(144, 238, 144, 0.35)',
    thumbnailActiveBorder: '#FFD700',
    primary: '#6B8E23',
  },
};

export type ThemeName = keyof typeof themes;
export const themeList = Object.values(themes);
export default themes;
