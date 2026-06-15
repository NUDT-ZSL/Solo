import * as THREE from 'three';

export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

export const CONFIG = {
  particleCount: IS_MOBILE ? 2500 : 5000,
  tunnelRadius: 5,
  tunnelLength: 80,
  tunnelWindow: 80,
  helixCount: 5,
  helixSpiralFactor: 0.35,
  rotationSpeed: 0.08,
  moveSpeed: 2.0,
  moveEasing: 0.06,
  rotationEasing: 0.08,
  pulseSpeed: 2.0,
  pulseAmount: 0.25,
  shockExpandSpeed: 18.0,
  shockWidth: 3.5,
  shockForce: 3.0,
  shockDuration: 2.5,
  idleThreshold: 5.0,
  idleMaxAccel: 4.0,
  idleAccelRate: 0.15,
  idleDistortAmount: 0.4,
  camera: {
    fov: 75,
    near: 0.1,
    far: 500,
  },
};

export type ThemeName = 'default' | 'coldBlue' | 'warmPurple' | 'orangeYellow';

export interface ThemeColors {
  start: THREE.Color;
  mid: THREE.Color;
  end: THREE.Color;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  default: {
    start: new THREE.Color(0x1144ff),
    mid: new THREE.Color(0x8822dd),
    end: new THREE.Color(0xffaa22),
  },
  coldBlue: {
    start: new THREE.Color(0x0033cc),
    mid: new THREE.Color(0x0077ee),
    end: new THREE.Color(0x00ccff),
  },
  warmPurple: {
    start: new THREE.Color(0x5500aa),
    mid: new THREE.Color(0x9922ee),
    end: new THREE.Color(0xdd44ff),
  },
  orangeYellow: {
    start: new THREE.Color(0xcc4400),
    mid: new THREE.Color(0xff8800),
    end: new THREE.Color(0xffdd22),
  },
};
