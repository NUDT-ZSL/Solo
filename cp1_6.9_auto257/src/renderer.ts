import * as THREE from 'three';
import type { WaveOutput } from './waveGenerator';
import type { InteractionSystem } from './interaction';

const PARTICLE_COUNT = 1000;
const SPECTRUM_BINS = 64;
const SPECTRUM_TIME_SLOTS = 160;
const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  uniform sampler2D uParticleTex;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec4 tex = texture2D(uParticleTex, gl_PointCoord);
    if (tex.a < 0.02) discard;
    gl_FragColor = vec4(vColor, tex.a * vOpacity);
  }
`;

export class AppRenderer {
  private threeRenderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;

  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private posAttr!: THREE.BufferAttribute;
  private colorAttr!: THREE.BufferAttribute;
  private sizeAttr!: THREE.BufferAttribute;
  private opacityAttr!: THREE.BufferAttribute;
  private particleTexture!: THREE.Texture;

  private spectrumPlane!: THREE.Mesh;
  private spectrumCanvas: HTMLCanvasElement;
  private spectrumCtx: CanvasRenderingContext2D;
  private spectrumTexture!: THREE.CanvasTexture;
  private spectrumBuffer: number[][];
  private spectrumCursor = 0;
  private spectrumDirty = true;

  private energyPlane!: THREE.Mesh;
  private energyCanvas: HTMLCanvasElement;
  private energyCtx: CanvasRenderingContext2D;
  private energyTexture!: THREE.CanvasTexture;

  private lastWidth = 0;
  private lastHeight = 0;

  private tempVec = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas;
    this.camera = camera;

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.threeRenderer.setClearColor(0x0a0a1a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = null;

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;
    `;
    const parent = canvas.parentElement;
    if (parent) {
      parent.insertBefore(this.overlayCanvas, canvas.nextSibling);
    }
    this.overlayCtx = this.overlayCanvas.getContext('2d', { alpha: true })!;

    this.spectrumCanvas = document.createElement('canvas');
    this.spectrumCanvas.width = SPECTRUM_BINS;
    this.spectrumCanvas.height = SPECTRUM_TIME_SLOTS;
    this.spectrumCtx = this.spectrumCanvas.getContext('2d', { alpha: false })!;
    this.spectrumBuffer = new Array(SPECTRUM_TIME_SLOTS);
    for (let i = 0; i < SPECTRUM_TIME_SLOTS; i++) {
      this.spectrumBuffer[i] = new Array(SPECTRUM_BINS).fill(0);
    }

    this.energyCanvas = document.createElement('canvas');
    this.energyCanvas.width = 512;
    this.energyCanvas.height = 64;
    this.energyCtx = this.energyCanvas.getContext('2d', { alpha: true })!;

    this.initParticleSystem();
    this.initSpectrumPlane();
    this.initEnergyPlane();

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private createParticleTexture(): THREE.Texture {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    grd.addColorStop(0.75, 'rgba(255,255,255,0.08)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  private initParticleSystem(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const opacity = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0.5;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 1;
      sizes[i] = 0.06;
      opacity[i] = 0.95;
    }
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    this.sizeAttr = new THREE.BufferAttribute(sizes, 1);
    this.opacityAttr = new THREE.BufferAttribute(opacity, 1);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('color', this.colorAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aOpacity', this.opacityAttr);

    this.particleTexture = this.createParticleTexture();

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      uniforms: {
        uParticleTex: { value: this.particleTexture }
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private initSpectrumPlane(): void {
    const width = 2.5;
    const height = 8;
    const geo = new THREE.PlaneGeometry(width, height, 1, 1);
    this.spectrumTexture = new THREE.CanvasTexture(this.spectrumCanvas);
    this.spectrumTexture.minFilter = THREE.LinearFilter;
    this.spectrumTexture.magFilter = THREE.LinearFilter;
    this.spectrumTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.spectrumTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.spectrumTexture.flipY = false;
    const mat = new THREE.MeshBasicMaterial({
      map: this.spectrumTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.spectrumPlane = new THREE.Mesh(geo, mat);
    this.spectrumPlane.position.set(10.75, 0, 0);
    this.scene.add(this.spectrumPlane);

    const glowGeo = new THREE.PlaneGeometry(width + 0.5, height + 0.5, 1, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(10.75, 0, -0.01);
    this.scene.add(glow);

    this.renderSpectrumStatic();
  }

  private initEnergyPlane(): void {
    const width = 16;
    const height = 1;
    const geo = new THREE.PlaneGeometry(width, height, 1, 1);
    this.energyTexture = new THREE.CanvasTexture(this.energyCanvas);
    this.energyTexture.minFilter = THREE.LinearFilter;
    this.energyTexture.magFilter = THREE.LinearFilter;
    this.energyTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.energyTexture.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.MeshBasicMaterial({
      map: this.energyTexture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.energyPlane = new THREE.Mesh(geo, mat);
    this.energyPlane.position.set(0, -4, 0);
    this.scene.add(this.energyPlane);
    this.renderEnergyBar(0, 0);
  }

  private renderSpectrumStatic(): void {
    const ctx = this.spectrumCtx;
    ctx.fillStyle = '#030818';
    ctx.fillRect(0, 0, SPECTRUM_BINS, SPECTRUM_TIME_SLOTS);
    ctx.strokeStyle = 'rgba(0, 180, 220, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = Math.floor((i / 10) * (SPECTRUM_BINS - 1)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SPECTRUM_TIME_SLOTS);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const y = Math.floor((i / 8) * (SPECTRUM_TIME_SLOTS - 1)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SPECTRUM_BINS, y);
      ctx.stroke();
    }
    this.spectrumTexture.needsUpdate = true;
  }

  private updateSpectrumTexture(latestData: number[]): void {
    for (let i = 0; i < SPECTRUM_BINS; i++) {
      this.spectrumBuffer[this.spectrumCursor][i] = Math.max(0, Math.min(1, latestData[i] ?? 0));
    }
    this.spectrumCursor = (this.spectrumCursor + 1) % SPECTRUM_TIME_SLOTS;
    this.spectrumDirty = true;
  }

  private drawSpectrumBuffer(): void {
    if (!this.spectrumDirty) return;
    this.spectrumDirty = false;
    const ctx = this.spectrumCtx;
    ctx.fillStyle = '#030818';
    ctx.fillRect(0, 0, SPECTRUM_BINS, SPECTRUM_TIME_SLOTS);
    for (let t = 0; t < SPECTRUM_TIME_SLOTS; t++) {
      const bufIdx = (this.spectrumCursor + t) % SPECTRUM_TIME_SLOTS;
      const row = this.spectrumBuffer[bufIdx];
      for (let f = 0; f < SPECTRUM_BINS; f++) {
        const v = row[f];
        if (v < 0.02) continue;
        const freqT = f / (SPECTRUM_BINS - 1);
        const hue = (2 / 3) * (1 - freqT);
        const light = 0.15 + v * 0.75;
        const sat = 0.6 + v * 0.4;
        const col = this.hslToCss(hue, sat, light);
        ctx.fillStyle = col;
        ctx.fillRect(f, SPECTRUM_TIME_SLOTS - 1 - t, 1, 1);
      }
    }
    ctx.strokeStyle = 'rgba(0, 180, 220, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = Math.floor((i / 10) * (SPECTRUM_BINS - 1)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SPECTRUM_TIME_SLOTS);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const y = Math.floor((i / 8) * (SPECTRUM_TIME_SLOTS - 1)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SPECTRUM_BINS, y);
      ctx.stroke();
    }
    this.spectrumTexture.needsUpdate = true;
  }

  private hslToCss(h: number, s: number, l: number): string {
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const R = Math.round(r * 255);
    const G = Math.round(g * 255);
    const B = Math.round(b * 255);
    return `rgb(${R},${G},${B})`;
  }

  private renderEnergyBar(level: number, flash: number): void {
    const ctx = this.energyCtx;
    const W = 512, H = 64;
    ctx.clearRect(0, 0, W, H);
    const barY = 24;
    const barH = 16;
    const endR = barH / 2 + 4;
    const innerL = endR;
    const innerR = W - endR;
    const innerW = innerR - innerL;
    const fillEnd = innerL + innerW * Math.max(0, Math.min(1, level));
    const bgGrad = ctx.createLinearGradient(0, 0, W, 0);
    bgGrad.addColorStop(0, 'rgba(0, 30, 70, 0.9)');
    bgGrad.addColorStop(1, 'rgba(0, 50, 90, 0.9)');
    ctx.fillStyle = bgGrad;
    this.roundRectPath(ctx, innerL, barY, innerW, barH, barH / 2);
    ctx.fill();

    const fillGrad = ctx.createLinearGradient(0, 0, W, 0);
    fillGrad.addColorStop(0, '#003377');
    fillGrad.addColorStop(0.35, '#0077cc');
    fillGrad.addColorStop(0.7, '#00ccee');
    fillGrad.addColorStop(0.88, '#ffee55');
    fillGrad.addColorStop(1, '#ffffaa');
    ctx.fillStyle = fillGrad;
    this.roundRectPath(ctx, innerL, barY, Math.max(0, fillEnd - innerL), barH, barH / 2);
    ctx.fill();

    const leftEndX = innerL;
    const rightEndX = fillEnd;
    this.drawEndpoint(ctx, leftEndX, barY + barH / 2, endR - 2, level > 0.02 ? 0.9 : 0.3, flash);
    this.drawEndpoint(ctx, rightEndX, barY + barH / 2, endR - 2, 1, flash);

    ctx.strokeStyle = 'rgba(0, 220, 255, 0.35)';
    ctx.lineWidth = 1;
    this.roundRectPath(ctx, innerL, barY, innerW, barH, barH / 2);
    ctx.stroke();

    if (flash > 0) {
      const glowGrad = ctx.createRadialGradient(fillEnd, barY + barH / 2, 4, fillEnd, barY + barH / 2, 80);
      glowGrad.addColorStop(0, `rgba(255, 240, 120, ${0.55 * flash})`);
      glowGrad.addColorStop(0.4, `rgba(255, 200, 80, ${0.22 * flash})`);
      glowGrad.addColorStop(1, 'rgba(255, 200, 80, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);
    }
    this.energyTexture.needsUpdate = true;
  }

  private roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    if (w <= 0 || h <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawEndpoint(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number, alpha: number, flash: number
  ): void {
    const glowA = 0.25 * alpha + flash * 0.6;
    const g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.2);
    g.addColorStop(0, `rgba(255, 245, 160, ${glowA})`);
    g.addColorStop(1, 'rgba(255, 245, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, `rgba(255, 255, 220, ${alpha})`);
    core.addColorStop(0.6, `rgba(255, 220, 120, ${alpha * 0.85})`);
    core.addColorStop(1, `rgba(180, 120, 50, ${alpha * 0.1})`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private handleResize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w === this.lastWidth && h === this.lastHeight) return;
    this.lastWidth = w;
    this.lastHeight = h;
    this.threeRenderer.setSize(w, h, false);
    this.overlayCanvas.width = w * (window.devicePixelRatio || 1);
    this.overlayCanvas.height = h * (window.devicePixelRatio || 1);
    this.overlayCanvas.style.width = w + 'px';
    this.overlayCanvas.style.height = h + 'px';
    this.overlayCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  };

  public updateBuffers(output: WaveOutput): void {
    (this.posAttr.array as Float32Array).set(output.positions);
    (this.colorAttr.array as Float32Array).set(output.colors);
    (this.sizeAttr.array as Float32Array).set(output.sizes);
    (this.opacityAttr.array as Float32Array).set(output.opacity);
    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.opacityAttr.needsUpdate = true;

    this.updateSpectrumTexture(output.spectrumData);
    this.drawSpectrumBuffer();
    this.renderEnergyBar(output.energyLevel, output.energyFlash);
  }

  public drawOverlay(
    interaction: InteractionSystem,
    _cameraPhi: number
  ): void {
    const ctx = this.overlayCtx;
    const w = this.overlayCanvas.clientWidth;
    const h = this.overlayCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const liveSel = interaction.getLiveSelection();
    if (liveSel) {
      this.drawWorldRect(ctx, liveSel.xMin, liveSel.yMin, liveSel.xMax, liveSel.yMax, 0.95, 0);
    }

    if (interaction.selectionActive && interaction.selectionBox.active) {
      const box = interaction.selectionBox;
      const halo = interaction.haloTimer > 0 ? (1 - interaction.haloTimer / 0.3) : 0;
      this.drawWorldRect(ctx, box.xMin, box.yMin, box.xMax, box.yMax, 0.85, halo);
    }
  }

  private projectWorld(x: number, y: number): { sx: number; sy: number } | null {
    this.tempVec.set(x, y, 0);
    this.tempVec.project(this.camera);
    const w = this.overlayCanvas.clientWidth;
    const h = this.overlayCanvas.clientHeight;
    const sx = (this.tempVec.x * 0.5 + 0.5) * w;
    const sy = (-this.tempVec.y * 0.5 + 0.5) * h;
    if (this.tempVec.z > 1) return null;
    return { sx, sy };
  }

  private drawWorldRect(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, x2: number, y2: number,
    alpha: number, haloT: number
  ): void {
    const corners = [
      this.projectWorld(x1, y2),
      this.projectWorld(x2, y2),
      this.projectWorld(x2, y1),
      this.projectWorld(x1, y1)
    ];
    if (corners.some(c => c === null)) return;
    const cs = corners as { sx: number; sy: number }[];

    if (haloT > 0) {
      const expand = 4 + haloT * 22;
      const haloAlpha = (1 - haloT) * 0.55;
      ctx.save();
      ctx.beginPath();
      const gc = this.expandRect(cs, expand);
      ctx.moveTo(gc[0].sx, gc[0].sy);
      for (let i = 1; i < gc.length; i++) ctx.lineTo(gc[i].sx, gc[i].sy);
      ctx.closePath();
      const g = ctx.createLinearGradient(gc[0].sx, gc[0].sy, gc[2].sx, gc[2].sy);
      g.addColorStop(0, `rgba(120, 240, 255, 0)`);
      g.addColorStop(0.5, `rgba(120, 240, 255, ${haloAlpha * 0.5})`);
      g.addColorStop(1, `rgba(120, 240, 255, 0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cs[0].sx, cs[0].sy);
    for (let i = 1; i < cs.length; i++) ctx.lineTo(cs[i].sx, cs[i].sy);
    ctx.closePath();
    ctx.fillStyle = `rgba(200, 245, 255, ${0.1 * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private expandRect(
    pts: { sx: number; sy: number }[], amt: number
  ): { sx: number; sy: number }[] {
    const cx = (pts[0].sx + pts[2].sx) / 2;
    const cy = (pts[0].sy + pts[2].sy) / 2;
    return pts.map(p => {
      const dx = p.sx - cx;
      const dy = p.sy - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { sx: p.sx + (dx / len) * amt, sy: p.sy + (dy / len) * amt };
    });
  }

  public render(interaction: InteractionSystem): void {
    this.threeRenderer.render(this.scene, this.camera);
    this.drawOverlay(interaction, 0);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.geometry.dispose();
    this.material.dispose();
    this.particleTexture.dispose();
    this.spectrumTexture.dispose();
    this.energyTexture.dispose();
    this.threeRenderer.dispose();
  }
}
