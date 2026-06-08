import * as THREE from 'three';

export class ClothTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
  offset: number = 0;
  windStrength: number = 5;

  constructor(width: number = 512, height: number = 512) {
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.needsUpdate = true;
  }

  setWindStrength(strength: number) {
    this.windStrength = strength;
  }

  update(deltaTime: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const baseGradient = ctx.createLinearGradient(0, 0, w, h);
    baseGradient.addColorStop(0, 'rgba(160, 196, 255, 0.3)');
    baseGradient.addColorStop(1, 'rgba(160, 196, 255, 0.1)');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    const waveCount = 5;
    const speedFactor = 0.5 + this.windStrength * 0.05;
    this.offset = (this.offset + deltaTime * speedFactor * 2) % 1;

    for (let wave = 0; wave < waveCount; wave++) {
      const waveProgress = (this.offset + wave / waveCount) % 1;
      const radius = waveProgress * maxRadius;
      const hue = (waveProgress * 360) % 360;
      const alpha = (1 - waveProgress) * 0.6;
      const lineWidth = 8 + this.windStrength * 0.3;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      const innerRadius = Math.max(0, radius - lineWidth);
      const innerGlow = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, radius);
      innerGlow.addColorStop(0, `hsla(${hue}, 80%, 70%, 0)`);
      innerGlow.addColorStop(1, `hsla(${hue}, 80%, 70%, ${alpha * 0.3})`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = innerGlow;
      ctx.lineWidth = lineWidth * 2;
      ctx.stroke();
    }

    const centerHue = (this.offset * 360) % 360;
    const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80);
    centerGlow.addColorStop(0, `hsla(${centerHue}, 80%, 70%, 0.5)`);
    centerGlow.addColorStop(1, `hsla(${centerHue}, 80%, 70%, 0)`);
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    this.texture.needsUpdate = true;
  }

  getTexture(): THREE.Texture {
    return this.texture;
  }
}
