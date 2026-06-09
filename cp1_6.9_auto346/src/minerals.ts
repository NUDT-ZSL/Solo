interface Mineral {
  x: number;
  y: number;
  side: number;
  collected: boolean;
  waveT: number;
  waveMax: number;
  waveStartR: number;
  waveEndR: number;
  spin: number;
}

export class Minerals {
  private items: Mineral[] = [];
  private w: number = 0;
  private h: number = 0;
  private shipX: number = 0;
  private shipY: number = 0;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  setShipPos(x: number, y: number): void {
    this.shipX = x;
    this.shipY = y;
  }

  refresh(excludeX?: number, excludeY?: number, excludeR: number = 0): void {
    const ex = excludeX ?? this.shipX;
    const ey = excludeY ?? this.shipY;
    const count = 15 + Math.floor(Math.random() * 11);
    this.items = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const maxTry = count * 20;
    let tries = 0;
    while (this.items.length < count && tries < maxTry) {
      tries++;
      const ang = Math.random() * Math.PI * 2;
      const r = 120 + Math.random() * 180;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (x < 40 || x > this.w - 40 || y < 40 || y > this.h - 40) continue;
      if (excludeR > 0) {
        const ddx = x - ex;
        const ddy = y - ey;
        if (ddx * ddx + ddy * ddy < excludeR * excludeR) continue;
      }
      this.items.push({
        x,
        y,
        side: 8 + Math.random() * 4,
        collected: false,
        waveT: -1,
        waveMax: 0.6,
        waveStartR: 10,
        waveEndR: 30 + Math.random() * 50,
        spin: Math.random() * Math.PI * 2
      });
    }
  }

  refreshAroundShip(): void {
    const count = 15 + Math.floor(Math.random() * 11);
    this.items = [];
    let tries = 0;
    const maxTry = count * 20;
    while (this.items.length < count && tries < maxTry) {
      tries++;
      const ang = Math.random() * Math.PI * 2;
      const r = 120 + Math.random() * 180;
      const x = this.shipX + Math.cos(ang) * r;
      const y = this.shipY + Math.sin(ang) * r;
      if (x < 40 || x > this.w - 40 || y < 40 || y > this.h - 40) continue;
      this.items.push({
        x,
        y,
        side: 8 + Math.random() * 4,
        collected: false,
        waveT: -1,
        waveMax: 0.6,
        waveStartR: 10,
        waveEndR: 30 + Math.random() * 50,
        spin: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt: number, shipX: number, shipY: number, shipR: number): boolean {
    this.shipX = shipX;
    this.shipY = shipY;
    let collectedAny = false;
    for (const m of this.items) {
      m.spin += dt * 0.6;
      if (!m.collected) {
        const dx = m.x - shipX;
        const dy = m.y - shipY;
        const r = m.side * 1.1 + shipR;
        if (dx * dx + dy * dy < r * r) {
          m.collected = true;
          m.waveT = 0;
          collectedAny = true;
        }
      } else if (m.waveT >= 0) {
        m.waveT += dt;
        if (m.waveT >= m.waveMax) m.waveT = -2;
      }
    }
    return collectedAny;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const m of this.items) {
      if (m.collected) {
        if (m.waveT >= 0) {
          const t = m.waveT / m.waveMax;
          const r = m.waveStartR + (m.waveEndR - m.waveStartR) * t;
          const a = 1 - t;
          ctx.beginPath();
          ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
          ctx.lineWidth = 2 + (1 - t) * 3;
          const grad = ctx.createRadialGradient(m.x, m.y, r * 0.4, m.x, m.y, r);
          grad.addColorStop(0, `rgba(255, 240, 160, 0)`);
          grad.addColorStop(0.7, `rgba(255, 210, 90, ${0.5 * a})`);
          grad.addColorStop(1, `rgba(255, 180, 40, ${0.9 * a})`);
          ctx.strokeStyle = grad;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(m.x, m.y, r * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 220, 130, ${0.12 * a})`;
          ctx.fill();
        }
        continue;
      }
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.spin);
      ctx.beginPath();
      const s = m.side;
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        const px = Math.cos(ang) * s;
        const py = Math.sin(ang) * s;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(-s, -s, s, s);
      grad.addColorStop(0, '#fff4b8');
      grad.addColorStop(0.4, '#ffd24d');
      grad.addColorStop(1, '#d48a18');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 250, 200, 0.85)';
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        const px = Math.cos(ang) * s * 0.45;
        const py = Math.sin(ang) * s * 0.45;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 230, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  getPositions(): Array<{ x: number; y: number }> {
    return this.items.filter(m => !m.collected).map(m => ({ x: m.x, y: m.y }));
  }
}
