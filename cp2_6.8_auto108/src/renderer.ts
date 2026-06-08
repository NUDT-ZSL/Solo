import type { BranchNode } from './tree';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

export interface TransitionState {
  active: boolean;
  startTime: number;
  duration: number;
}

const COLOR_ROOT = '#8B4513';
const COLOR_TIP = '#48BB78';
const COLOR_HIGHLIGHT = '#F6E05E';
const PARTICLE_COLORS = ['#48BB78', '#ECC94B'];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
