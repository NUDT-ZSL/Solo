import * as THREE from 'three';

const HALO_COUNT = 80;
const HALO_Z = -100;
const PLANE_X_MIN = -260;
const PLANE_X_MAX = 260;
const PLANE_Y_MIN = -120;
const PLANE_Y_MAX = 280;
const MIN_RADIUS = 10;
const MAX_RADIUS = 30;
const MIN_OPACITY = 0.05;
const MAX_OPACITY = 0.20;
const MIN_PERIOD = 5;
const MAX_PERIOD = 8;
const AMPLITUDE = 5;
const COLOR_PURPLE = new THREE.Color(0xB39DDB);
const COLOR_PINK = new THREE.Color(0xF8BBD0);

interface HaloSpot {
  baseX: number;
  baseY: number;
  radius: number;
  opacity: number;
  period: number;
  phase: number;
  colorMix: number;
  offsetAxis: 'x' | 'y';
  driftSpeed: number;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class BackgroundEffect {
  private scene: THREE.Scene;
  private halos: HaloSpot[] = [];
  private sprites: THREE.Sprite[] = [];
  private canvasTextures: THREE.CanvasTexture[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createHalos();
  }

  private createHaloTexture(radiusPx: number, opacity: number, color: THREE.Color): THREE.Texture {
    const size = Math.ceil(radiusPx * 4);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxR;
        const idx = (py * size + px) * 4;

        if (dist < 1) {
          const a = (1 - dist) * (1 - dist) * opacity * 255;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(a);
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.canvasTextures.push(texture);
    return texture;
  }

  private createHalos(): void {
    for (let i = 0; i < HALO_COUNT; i++) {
      const halo: HaloSpot = {
        baseX: rand(PLANE_X_MIN, PLANE_X_MAX),
        baseY: rand(PLANE_Y_MIN, PLANE_Y_MAX),
        radius: rand(MIN_RADIUS, MAX_RADIUS),
        opacity: rand(MIN_OPACITY, MAX_OPACITY),
        period: rand(MIN_PERIOD, MAX_PERIOD),
        phase: Math.random() * Math.PI * 2,
        colorMix: Math.random(),
        offsetAxis: Math.random() < 0.5 ? 'x' : 'y',
        driftSpeed: rand(-0.3, 0.3)
      };
      this.halos.push(halo);
      this.createSprite(halo);
    }
  }

  private createSprite(halo: HaloSpot): void {
    const baseColor = COLOR_PURPLE.clone().lerp(COLOR_PINK, halo.colorMix);
    const texture = this.createHaloTexture(halo.radius * 2.2, halo.opacity * 1.4, baseColor);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.95
    });

    const sprite = new THREE.Sprite(material);
    const worldSize = halo.radius * 0.9;
    sprite.scale.set(worldSize * 2, worldSize * 2, 1);
    sprite.position.set(halo.baseX, halo.baseY, HALO_Z);
    sprite.renderOrder = -100;
    this.sprites.push(sprite);
    this.scene.add(sprite);
  }

  update(time: number, deltaTime: number): void {
    for (let i = 0; i < HALO_COUNT; i++) {
      const halo = this.halos[i];
      const sprite = this.sprites[i];

      const waveT = (time / halo.period) * Math.PI * 2 + halo.phase;
      const offset = Math.sin(waveT) * AMPLITUDE;

      halo.baseX += halo.driftSpeed * deltaTime * 2;

      if (halo.baseX > PLANE_X_MAX + 30) {
        halo.baseX = PLANE_X_MIN - 30;
        halo.baseY = rand(PLANE_Y_MIN, PLANE_Y_MAX);
      } else if (halo.baseX < PLANE_X_MIN - 30) {
        halo.baseX = PLANE_X_MAX + 30;
        halo.baseY = rand(PLANE_Y_MIN, PLANE_Y_MAX);
      }

      if (halo.offsetAxis === 'x') {
        sprite.position.x = halo.baseX + offset;
        sprite.position.y = halo.baseY;
      } else {
        sprite.position.x = halo.baseX;
        sprite.position.y = halo.baseY + offset;
      }
    }
  }

  dispose(): void {
    for (const sprite of this.sprites) {
      this.scene.remove(sprite);
      (sprite.material as THREE.SpriteMaterial).dispose();
    }
    for (const tex of this.canvasTextures) {
      tex.dispose();
    }
    this.sprites = [];
    this.canvasTextures = [];
    this.halos = [];
  }
}
