export class PortalRenderer {
  private elapsed: number = 0;
  private duration: number = 2.0;
  isActive: boolean = false;

  start() {
    this.elapsed = 0;
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
    this.elapsed = 0;
  }

  get progress(): number {
    return Math.min(1, this.elapsed / this.duration);
  }

  get isComplete(): boolean {
    return this.elapsed >= this.duration;
  }

  update(dt: number) {
    if (!this.isActive) return;
    this.elapsed += dt;
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    if (!this.isActive) return;
    const p = this.progress;
    const easedP = 1 - Math.pow(1 - p, 3);

    const maxRadius = 180 * easedP;
    const ringCount = 5;

    for (let i = 0; i < ringCount; i++) {
      const ringP = Math.max(0, easedP - i * 0.1);
      const radius = maxRadius * (0.3 + ringP * 0.7) * ((i + 1) / ringCount);
      const rotation = this.elapsed * (2 + i * 0.5) * (i % 2 === 0 ? 1 : -1);
      const alpha = (1 - i / ringCount) * (1 - p * 0.5) * 0.6;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      const segments = 60 + i * 20;
      const colors = ['#00FFD1', '#FF00AA', '#FFD700'];
      const color = colors[i % 3];

      ctx.beginPath();
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const wobble = Math.sin(angle * (3 + i) + this.elapsed * 4) * (5 + i * 3);
        const r = radius + wobble;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 - i * 0.3;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();

      ctx.restore();
    }

    const centerGlowAlpha = (1 - p) * 0.8;
    if (centerGlowAlpha > 0) {
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * easedP);
      gradient.addColorStop(0, `rgba(255,255,255,${centerGlowAlpha})`);
      gradient.addColorStop(0.5, `rgba(0,255,209,${centerGlowAlpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(0,255,209,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 * easedP, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
