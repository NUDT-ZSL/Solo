export interface CardParams {
  baseColor: string;
  gradientAngle: number;
  glowRadius: number;
  glowOpacity: number;
  borderRadius: number;
  backdropBlur: number;
}

export interface SavedCard extends CardParams {
  id: string;
  createdAt: number;
}

export const DEFAULT_PARAMS: CardParams = {
  baseColor: '#667eea',
  gradientAngle: 135,
  glowRadius: 50,
  glowOpacity: 0.6,
  borderRadius: 20,
  backdropBlur: 10
};
