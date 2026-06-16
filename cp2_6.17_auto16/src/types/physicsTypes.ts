export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface LightSourceParams {
  position: Vector3;
  incidentAngle: number;
  intensity: number;
  color: string;
}

export interface RaySegment {
  start: Vector3;
  end: Vector3;
  color: string;
  opacity: number;
  lineWidth: number;
  isDashed: boolean;
}

export interface RefractionAngles {
  incidentAngle: number;
  refractedAngle: number;
  criticalAngle: number;
  isTotalReflection: boolean;
}

export interface SpectrumColor {
  name: string;
  wavelength: number;
  color: string;
  hex: string;
}

export interface CausticSpot {
  id: number;
  position: Vector3;
  color: string;
  size: number;
  opacity: number;
  wobblePhase: number;
}

export interface FlashEffect {
  active: boolean;
  position: Vector3;
  startTime: number;
  duration: number;
}

export const SPECTRUM_COLORS: SpectrumColor[] = [
  { name: 'red', wavelength: 700, color: '#ef4444', hex: '#ef4444' },
  { name: 'orange', wavelength: 620, color: '#f97316', hex: '#f97316' },
  { name: 'yellow', wavelength: 580, color: '#eab308', hex: '#eab308' },
  { name: 'green', wavelength: 530, color: '#22c55e', hex: '#22c55e' },
  { name: 'blue', wavelength: 470, color: '#3b82f6', hex: '#3b82f6' },
  { name: 'indigo', wavelength: 440, color: '#6366f1', hex: '#6366f1' },
  { name: 'violet', wavelength: 400, color: '#8b5cf6', hex: '#8b5cf6' }
];

export const WATER_REFRACTIVE_INDEX = 1.33;
export const AIR_REFRACTIVE_INDEX = 1.0;
export const ABBE_NUMBER_WATER = 55.8;
export const CRITICAL_ANGLE_DEG = 48.75;
