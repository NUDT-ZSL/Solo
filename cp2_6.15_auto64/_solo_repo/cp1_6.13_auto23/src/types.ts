export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export type GradientType = 'linear' | 'radial';

export type LinearDirection = 'to right' | 'to bottom' | 'diagonal';

export type RadialShape = 'circle' | 'ellipse';

export interface Palette {
  id: string;
  name: string;
  type: GradientType;
  direction?: LinearDirection;
  shape?: RadialShape;
  colorStops: ColorStop[];
  createdAt: number;
  updatedAt: number;
}
