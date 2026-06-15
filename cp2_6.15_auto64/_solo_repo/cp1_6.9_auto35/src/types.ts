export interface EmotionBlock {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface ExpressionFeatures {
  eyeShape: 'normal' | 'angry' | 'sleepy' | 'surprised' | 'squint' | 'crying';
  mouthShape: 'smile' | 'frown' | 'open' | 'neutral' | 'pout' | 'tongue';
}

export interface Spirit {
  id: string;
  name: string;
  fusedColor: string;
  expression: ExpressionFeatures;
  blockOrder: string[];
  createdAt: number;
}

export interface SpiritCreatePayload {
  name: string;
  fusedColor: string;
  expression: ExpressionFeatures;
  blockOrder: string[];
}
