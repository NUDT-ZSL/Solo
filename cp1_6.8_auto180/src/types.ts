export interface ScentMark {
  id: string;
  lat: number;
  lng: number;
  description: string;
  scent_type: string;
  user_id: string;
  audio_url: string | null;
  created_at: string;
}

export interface UserFootprint {
  user_id: string;
  marks: ScentMark[];
  total_count: number;
  last_activity: string | null;
}

export type ScentType = '甜' | '酸' | '苦' | '辛' | '腥';

export const SCENT_CONFIG: Record<ScentType, { color: string; particleShape: 'circle' | 'triangle' | 'star' | 'diamond' | 'scatter'; label: string; icon: string }> = {
  '甜': { color: '#FF8C42', particleShape: 'circle', label: '甜味', icon: '🍬' },
  '酸': { color: '#7BC950', particleShape: 'triangle', label: '酸味', icon: '🍋' },
  '苦': { color: '#8B6914', particleShape: 'star', label: '苦味', icon: '☕' },
  '辛': { color: '#E63946', particleShape: 'diamond', label: '辛味', icon: '🌶️' },
  '腥': { color: '#7B2D8E', particleShape: 'scatter', label: '腥味', icon: '🌊' },
};

export const SCENT_TYPES: ScentType[] = ['甜', '酸', '苦', '辛', '腥'];
