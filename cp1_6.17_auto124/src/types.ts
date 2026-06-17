export type GradientType = 'linear' | 'radial';

export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export interface GradientConfig {
  type: GradientType;
  angle: number;
  radius: number;
  colorStops: ColorStop[];
  animationEnabled: boolean;
}

export interface PresetGradient {
  name: string;
  config: Omit<GradientConfig, 'animationEnabled'>;
}
