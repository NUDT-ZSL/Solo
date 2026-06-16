export interface CardThemeStyle {
  backgroundColor: string;
  color: string;
  borderRadius: number;
  boxShadow: string;
  textColor: string;
  textShadow: string;
  badgeStyle: {
    background: string;
    color: string;
    backdropFilter: string;
  };
  indexStyle: {
    color: string;
  };
  selectedBorder: string;
  selectedGlow: string;
  hoverScale: number;
}

export interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  posterBackground: string;
  cardGradients: string[];
  fontFamily: string;
  cardBorderRadius: number;
  cardShadow: string;
  texturePattern: string;
  cardStyle: CardThemeStyle;
}

export const themes: Theme[] = [
  {
    id: 'scifi',
    name: '科幻蓝紫',
    primaryColor: '#6200EA',
    secondaryColor: '#00E5FF',
    posterBackground: 'linear-gradient(135deg, #0D0B2E 0%, #1A0555 40%, #005B8A 100%)',
    cardGradients: [
      'linear-gradient(135deg, #6200EA 0%, #00E5FF 100%)',
      'linear-gradient(135deg, #311B92 0%, #00838F 100%)',
      'linear-gradient(135deg, #3D5AFE 0%, #00BCD4 100%)'
    ],
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    cardBorderRadius: 16,
    cardShadow: '0 8px 32px rgba(98, 0, 234, 0.35), 0 2px 8px rgba(0, 229, 255, 0.2)',
    texturePattern: "url(\"data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    cardStyle: {
      backgroundColor: 'linear-gradient(135deg, #6200EA 0%, #00E5FF 100%)',
      color: '#FFFFFF',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(98, 0, 234, 0.4), 0 2px 6px rgba(0, 229, 255, 0.25)',
      textColor: '#FFFFFF',
      textShadow: '0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 229, 255, 0.3)',
      badgeStyle: {
        background: 'rgba(0, 229, 255, 0.25)',
        color: '#E0F7FA',
        backdropFilter: 'blur(10px)'
      },
      indexStyle: {
        color: 'rgba(0, 229, 255, 0.7)'
      },
      selectedBorder: '0 0 0 2px #00E5FF',
      selectedGlow: '0 0 28px rgba(0, 229, 255, 0.7)',
      hoverScale: 1.03
    }
  },
  {
    id: 'retro',
    name: '复古暖黄',
    primaryColor: '#FF8F00',
    secondaryColor: '#FFE082',
    posterBackground: 'linear-gradient(135deg, #3E2723 0%, #5D4037 40%, #FF8F00 100%)',
    cardGradients: [
      'linear-gradient(135deg, #FF8F00 0%, #FFE082 100%)',
      'linear-gradient(135deg, #BF360C 0%, #FFB300 100%)',
      'linear-gradient(135deg, #E65100 0%, #FFCA28 100%)'
    ],
    fontFamily: "'Georgia', 'Times New Roman', serif",
    cardBorderRadius: 16,
    cardShadow: '0 8px 32px rgba(255, 143, 0, 0.35), 0 2px 8px rgba(255, 224, 130, 0.2)',
    texturePattern: "url(\"data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.08\"%3E%3Cpath d=\"M0 40L40 0H20L0 20M40 40V20L20 40\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    cardStyle: {
      backgroundColor: 'linear-gradient(135deg, #FF8F00 0%, #FFE082 100%)',
      color: '#FFF8E1',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(255, 143, 0, 0.4), 0 2px 6px rgba(255, 224, 130, 0.25)',
      textColor: '#FFF8E1',
      textShadow: '0 2px 10px rgba(62, 39, 35, 0.6), 0 0 16px rgba(255, 143, 0, 0.4)',
      badgeStyle: {
        background: 'rgba(255, 143, 0, 0.35)',
        color: '#FFF8E1',
        backdropFilter: 'blur(8px)'
      },
      indexStyle: {
        color: 'rgba(255, 224, 130, 0.75)'
      },
      selectedBorder: '0 0 0 2px #FFE082',
      selectedGlow: '0 0 28px rgba(255, 143, 0, 0.6)',
      hoverScale: 1.02
    }
  },
  {
    id: 'minimal',
    name: '极简黑白',
    primaryColor: '#212121',
    secondaryColor: '#ECEFF1',
    posterBackground: 'linear-gradient(135deg, #000000 0%, #212121 50%, #424242 100%)',
    cardGradients: [
      'linear-gradient(135deg, #212121 0%, #757575 100%)',
      'linear-gradient(135deg, #424242 0%, #BDBDBD 100%)',
      'linear-gradient(135deg, #263238 0%, #90A4AE 100%)'
    ],
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
    cardBorderRadius: 16,
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(255, 255, 255, 0.08)',
    texturePattern: "url(\"data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-66 73c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    cardStyle: {
      backgroundColor: 'linear-gradient(135deg, #212121 0%, #757575 100%)',
      color: '#F5F5F5',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(255, 255, 255, 0.06)',
      textColor: '#F5F5F5',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
      badgeStyle: {
        background: 'rgba(255, 255, 255, 0.18)',
        color: '#FAFAFA',
        backdropFilter: 'blur(12px)'
      },
      indexStyle: {
        color: 'rgba(255, 255, 255, 0.5)'
      },
      selectedBorder: '0 0 0 2px #ECEFF1',
      selectedGlow: '0 0 24px rgba(255, 255, 255, 0.3)',
      hoverScale: 1.015
    }
  }
];

export const filterTags = ['复古', '冷峻', '柔光'];

export type ThemeId = 'scifi' | 'retro' | 'minimal';

export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) || themes[0];
}

export function getRandomGradient(theme: Theme): string {
  const index = Math.floor(Math.random() * theme.cardGradients.length);
  return theme.cardGradients[index];
}

export function getRandomFilterTag(): string {
  const index = Math.floor(Math.random() * filterTags.length);
  return filterTags[index];
}
