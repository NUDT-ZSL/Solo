import { MoodColor } from './types';

export const MOOD_COLORS: { color: MoodColor; label: string; value: number }[] = [
  { color: '#FF9AA2', label: '温暖', value: 7 },
  { color: '#FFB7B2', label: '活力', value: 8 },
  { color: '#FFDAC1', label: '明朗', value: 6 },
  { color: '#E2F0CB', label: '宁静', value: 5 },
  { color: '#B5EAD7', label: '清新', value: 4 },
  { color: '#C7CEEA', label: '沉思', value: 3 },
  { color: '#B8A9C9', label: '神秘', value: 2 },
  { color: '#F8C8DC', label: '柔和', value: 1 },
];

export const MOOD_VALUE_MAP: Record<MoodColor, number> = Object.fromEntries(
  MOOD_COLORS.map((m) => [m.color, m.value])
) as Record<MoodColor, number>;

export const MOOD_LABEL_MAP: Record<MoodColor, string> = Object.fromEntries(
  MOOD_COLORS.map((m) => [m.color, m.label])
) as Record<MoodColor, string>;

export const BUBBLE_MIN_RADIUS = 30;
export const BUBBLE_MAX_RADIUS = 60;
export const BUBBLE_FLOAT_SPEED_MIN = 0.3;
export const BUBBLE_FLOAT_SPEED_MAX = 0.8;
export const BUBBLE_DRIFT_SPEED = 0.15;
export const BUBBLE_BREATH_SPEED_MIN = 0.5;
export const BUBBLE_BREATH_SPEED_MAX = 1.0;
export const BUBBLE_BREATH_AMPLITUDE = 0.08;
export const BUBBLE_FADE_IN_DURATION = 800;
export const BUBBLE_HOVER_SCALE = 1.15;
export const BUBBLE_HIT_PADDING = 8;

export const PARTICLE_COUNT_MIN = 60;
export const PARTICLE_COUNT_MAX = 80;
export const PARTICLE_SPEED_MIN = 2;
export const PARTICLE_SPEED_MAX = 6;
export const PARTICLE_LIFE = 2000;
export const PARTICLE_DRAG = 0.97;
export const PARTICLE_GRAVITY = 0.05;
export const PARTICLE_MIN_RADIUS = 2;
export const PARTICLE_MAX_RADIUS = 5;

export const PREVIEW_TEXT_LENGTH = 8;
