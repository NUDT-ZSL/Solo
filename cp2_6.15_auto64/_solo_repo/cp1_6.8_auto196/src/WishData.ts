export type MoodType = 'happy' | 'calm' | 'sad' | 'excited' | 'hopeful';

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export interface Wish {
  id: string;
  content: string;
  mood: MoodType;
  zodiac: ZodiacSign;
  horoscopeText: string;
  horoscopeLevel: number;
  createdAt: string;
  likes: number;
  blessings: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface StarPoint {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export const ZODIAC_INFO: Record<ZodiacSign, { name: string; symbol: string; dateRange: string; color: string; glowColor: string }> = {
  aries:       { name: '白羊座', symbol: '♈', dateRange: '3.21-4.19',  color: '#ff6b4a', glowColor: 'rgba(255,107,74,0.3)' },
  taurus:      { name: '金牛座', symbol: '♉', dateRange: '4.20-5.20',  color: '#4ade80', glowColor: 'rgba(74,222,128,0.3)' },
  gemini:      { name: '双子座', symbol: '♊', dateRange: '5.21-6.21',  color: '#facc15', glowColor: 'rgba(250,204,21,0.3)' },
  cancer:      { name: '巨蟹座', symbol: '♋', dateRange: '6.22-7.22',  color: '#94a3b8', glowColor: 'rgba(148,163,184,0.3)' },
  leo:         { name: '狮子座', symbol: '♌', dateRange: '7.23-8.22',  color: '#f97316', glowColor: 'rgba(249,115,22,0.3)' },
  virgo:       { name: '处女座', symbol: '♍', dateRange: '8.23-9.22',  color: '#a78bfa', glowColor: 'rgba(167,139,250,0.3)' },
  libra:       { name: '天秤座', symbol: '♎', dateRange: '9.23-10.23', color: '#fb7185', glowColor: 'rgba(251,113,133,0.3)' },
  scorpio:     { name: '天蝎座', symbol: '♏', dateRange: '10.24-11.22',color: '#ef4444', glowColor: 'rgba(239,68,68,0.3)' },
  sagittarius: { name: '射手座', symbol: '♐', dateRange: '11.23-12.21',color: '#8b5cf6', glowColor: 'rgba(139,92,246,0.3)' },
  capricorn:   { name: '摩羯座', symbol: '♑', dateRange: '12.22-1.19', color: '#a8a29e', glowColor: 'rgba(168,162,158,0.3)' },
  aquarius:    { name: '水瓶座', symbol: '♒', dateRange: '1.20-2.18',  color: '#06b6d4', glowColor: 'rgba(6,182,212,0.3)' },
  pisces:      { name: '双鱼座', symbol: '♓', dateRange: '2.19-3.20',  color: '#818cf8', glowColor: 'rgba(129,140,248,0.3)' },
};

export const MOOD_INFO: Record<MoodType, { label: string; color: string; emoji: string }> = {
  happy:   { label: '快乐', color: '#fbbf24', emoji: '😊' },
  calm:    { label: '平静', color: '#93c5fd', emoji: '😌' },
  sad:     { label: '忧伤', color: '#93c5fd', emoji: '😢' },
  excited: { label: '兴奋', color: '#f97316', emoji: '🤩' },
  hopeful: { label: '希望', color: '#a78bfa', emoji: '✨' },
};

export function getWishStripGradient(zodiac: ZodiacSign, mood: MoodType): string {
  const zc = ZODIAC_INFO[zodiac].color;
  const mc = MOOD_INFO[mood].color;
  return `linear-gradient(135deg, ${zc}22 0%, ${mc}15 50%, ${zc}22 100%)`;
}

export function getWishStripBorder(zodiac: ZodiacSign): string {
  const c = ZODIAC_INFO[zodiac].color;
  return `1px solid ${c}40`;
}

export function getWishStripShadow(zodiac: ZodiacSign): string {
  const gc = ZODIAC_INFO[zodiac].glowColor;
  return `0 0 20px ${gc}, 0 4px 12px rgba(0,0,0,0.3)`;
}
