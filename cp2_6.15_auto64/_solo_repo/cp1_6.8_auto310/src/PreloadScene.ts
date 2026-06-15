import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const barBg = this.add.graphics();
    const bar = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 0.8);
    barBg.fillRect(w / 2 - 160, h / 2 - 12, 320, 24);

    this.add.text(w / 2, h / 2 - 55, '光 影 编 织', {
      fontSize: '42px',
      color: '#c8b8ff',
      fontFamily: 'serif',
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 + 30, 'Light & Shadow Weaver', {
      fontSize: '14px',
      color: '#6a5a8a',
      fontFamily: 'serif',
    }).setOrigin(0.5);

    const shimmer = this.add.rectangle(w / 2, h / 2 - 55, 300, 50, 0x6a5aff, 0);
    this.tweens.add({
      targets: shimmer,
      alpha: { from: 0, to: 0.15 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x7b68ee, 1);
      bar.fillRect(w / 2 - 155, h / 2 - 8, 310 * value, 16);
    });

    this.generateTextures();
  }

  create(): void {
    this.time.delayedCall(600, () => {
      this.scene.start('GameScene');
    });
  }

  private generateTextures(): void {
    this.makePlayerTexture();
    this.makeParticleTexture();
    this.makeMechanismTexture('mech_blue', 0x4488ff);
    this.makeMechanismTexture('mech_purple', 0xaa44ff);
    this.makeMechanismTexture('mech_white', 0xffeedd);
    this.makeExitTexture();
    this.makeMirrorTexture('mirror_reflect', 0x88aacc);
    this.makeMirrorTexture('mirror_refract', 0xcc88ff);
    this.makeWallTexture();
    this.makeGlowTexture('glow_white', 0xfff5e6);
    this.makeGlowTexture('glow_blue', 0x4488ff);
    this.makeGlowTexture('glow_purple', 0xaa44ff);
    this.makeChromaticEdgeTexture();
  }

  private makePlayerTexture(): void {
    const s = 48;
    const g = this.make.graphics({ x: 0, y: 0 });

    g.fillStyle(0x2a2a5a, 0.3);
    g.fillCircle(s / 2, s / 2, s / 2);

    g.fillStyle(0x5566cc, 0.9);
    g.lineStyle(2, 0x8899ff, 1);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push({ x: s / 2 + Math.cos(a) * 18, y: s / 2 + Math.sin(a) * 18 });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0x8899ff, 0.4);
    const inner: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      inner.push({ x: s / 2 + Math.cos(a) * 9, y: s / 2 + Math.sin(a) * 9 });
    }
    g.beginPath();
    g.moveTo(inner[0].x, inner[0].y);
    for (let i = 1; i < inner.length; i++) g.lineTo(inner[i].x, inner[i].y);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xaabbff, 0.8);
    g.fillCircle(s / 2, s / 2, 3);

    g.generateTexture('player', s, s);
    g.destroy();
  }

  private makeParticleTexture(): void {
    const s = 16;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s / 2, s / 2, s / 2);
    g.generateTexture('particle', s, s);
    g.destroy();
  }

  private makeMechanismTexture(key: string, color: number): void {
    const s = 48;
    const g = this.make.graphics({ x: 0, y: 0 });

    g.fillStyle(color, 0.15);
    g.fillCircle(s / 2, s / 2, 20);

    g.lineStyle(2, color, 0.8);
    g.fillStyle(color, 0.35);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = s / 2 + Math.cos(a) * 15;
      const py = s / 2 + Math.sin(a) * 15;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(color, 0.6);
    g.fillCircle(s / 2, s / 2, 5);

    g.generateTexture(key, s, s);
    g.destroy();
  }

  private makeExitTexture(): void {
    const s = 48;
    const g = this.make.graphics({ x: 0, y: 0 });

    g.fillStyle(0x44ff88, 0.1);
    g.fillCircle(s / 2, s / 2, 22);

    g.lineStyle(2, 0x44ff88, 0.6);
    g.strokeCircle(s / 2, s / 2, 18);

    g.fillStyle(0x44ff88, 0.3);
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i - Math.PI / 2;
      const px = s / 2 + Math.cos(a) * 12;
      const py = s / 2 + Math.sin(a) * 12;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(0x44ff88, 0.5);
    g.fillCircle(s / 2, s / 2, 4);

    g.generateTexture('exit', s, s);
    g.destroy();
  }

  private makeMirrorTexture(key: string, color: number): void {
    const w = 8;
    const h = 64;
    const g = this.make.graphics({ x: 0, y: 0 });

    g.fillStyle(color, 0.3);
    g.fillRect(0, 0, w, h);

    g.lineStyle(2, color, 0.8);
    g.lineBetween(w / 2, 2, w / 2, h - 2);

    g.fillStyle(color, 0.5);
    g.fillCircle(w / 2, 2, 3);
    g.fillCircle(w / 2, h - 2, 3);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeWallTexture(): void {
    const s = 64;
    const g = this.make.graphics({ x: 0, y: 0 });

    g.fillStyle(0x1a1a3e, 0.85);
    g.fillRect(0, 0, s, s);

    g.lineStyle(1, 0x2a2a5e, 0.4);
    g.lineBetween(0, 0, s, s);
    g.lineBetween(s, 0, 0, s);
    g.lineBetween(s / 2, 0, s / 2, s);
    g.lineBetween(0, s / 2, s, s / 2);

    g.fillStyle(0x3a3a6e, 0.15);
    g.fillTriangle(s / 2, 4, s - 4, s / 2, s / 2, s / 2);

    g.lineStyle(1, 0x4a4a8e, 0.2);
    g.strokeRect(1, 1, s - 2, s - 2);

    g.generateTexture('wall', s, s);
    g.destroy();
  }

  private makeGlowTexture(key: string, color: number): void {
    const s = 64;
    const canvas = this.textures.createCanvas(key, s, s);
    const ctx = canvas.getContext();

    const r = ((color >> 16) & 0xff);
    const gv = ((color >> 8) & 0xff);
    const b = (color & 0xff);

    const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, `rgba(${r},${gv},${b},0.6)`);
    gradient.addColorStop(0.3, `rgba(${r},${gv},${b},0.3)`);
    gradient.addColorStop(0.7, `rgba(${r},${gv},${b},0.08)`);
    gradient.addColorStop(1, `rgba(${r},${gv},${b},0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, s, s);
    canvas.refresh();
  }

  private makeChromaticEdgeTexture(): void {
    const w = 1280;
    const h = 720;
    const canvas = this.textures.createCanvas('chromatic_edge', w, h);
    const ctx = canvas.getContext();

    const drawEdge = (color: string, alpha: number, offset: number) => {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 40 + offset;
      ctx.strokeRect(offset, offset, w - offset * 2, h - offset * 2);
    };

    ctx.globalAlpha = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    drawEdge('rgba(255,100,100,1)', 0, 10);
    drawEdge('rgba(100,255,100,1)', 0, 30);
    drawEdge('rgba(100,100,255,1)', 0, 50);

    canvas.refresh();
  }
}
