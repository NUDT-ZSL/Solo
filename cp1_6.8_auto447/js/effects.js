export class BackgroundRenderer {
  constructor(game) {
    this.game = game;
    this.stars = [];
    this.rings = [];
    this.time = 0;
    this.init();
  }

  init() {
    const g = this.game;
    this.stars = [];
    for (let i = 0; i < 250; i++) {
      this.stars.push({
        x: Math.random() * g.W,
        y: Math.random() * g.H,
        size: Math.random() * 1.8 + 0.3,
        baseAlpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 3,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
    this.rings = [];
    const colors = ['#7733dd', '#3355ee', '#00aaff'];
    for (let i = 0; i < 3; i++) {
      this.rings.push({
        cx: g.W * (0.2 + Math.random() * 0.6),
        cy: g.H * (0.2 + Math.random() * 0.6),
        rx: 150 + Math.random() * 350,
        ry: 80 + Math.random() * 150,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        alpha: 0.06 + Math.random() * 0.1,
        color: colors[i],
        lineWidth: 20 + Math.random() * 40
      });
    }
  }

  draw(ctx) {
    const g = this.game;
    this.time += 0.016;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, g.H);
    bgGrad.addColorStop(0, '#0a0012');
    bgGrad.addColorStop(0.5, '#0d0020');
    bgGrad.addColorStop(1, '#06000d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, g.W, g.H);

    for (const ring of this.rings) {
      ring.rotation += ring.rotSpeed * 0.016;
      ctx.save();
      ctx.translate(ring.cx, ring.cy);
      ctx.rotate(ring.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = ring.alpha;
      ctx.lineWidth = ring.lineWidth;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = ring.lineWidth;
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    for (const star of this.stars) {
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.baseAlpha * (0.5 + 0.5 * twinkle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class EffectsManager {
  constructor(game) {
    this.game = game;
    this.particles = [];
    this.energyFragments = [];
  }

  addExplosion(x, y, size, color) {
    const count = Math.floor(15 + size * 0.5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 150;
      const life = 0.4 + Math.random() * 0.6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 1 + Math.random() * 3,
        color
      });
    }
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      const life = 0.2 + Math.random() * 0.3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 4,
        color: '#ffffff'
      });
    }
  }

  addHitSparks(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 100;
      const life = 0.15 + Math.random() * 0.2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 1 + Math.random() * 2,
        color
      });
    }
  }

  addEnergyFragment(x, y) {
    this.energyFragments.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      size: 5,
      value: 5 + Math.floor(Math.random() * 5),
      life: 8,
      pulse: Math.random() * Math.PI * 2
    });
  }

  update(dt) {
    const g = this.game;
    const ship = g.ship;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.energyFragments.length - 1; i >= 0; i--) {
      const f = this.energyFragments[i];
      const dx = ship.x - f.x;
      const dy = ship.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && dist > 1) {
        const force = 200 / dist;
        f.vx += (dx / dist) * force;
        f.vy += (dy / dist) * force;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.96;
      f.vy *= 0.96;
      f.pulse += dt * 5;
      f.life -= dt;
      if (f.life <= 0) {
        this.energyFragments.splice(i, 1);
      }
    }

    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const f of this.energyFragments) {
      const pulseSize = f.size + Math.sin(f.pulse) * 2;
      ctx.save();
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(f.x, f.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 5;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(f.x, f.y, pulseSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export class UIRenderer {
  constructor(game) {
    this.game = game;
    this.pauseBtn = { x: 0, y: 0, w: 44, h: 44 };
    this.resetBtn = { x: 0, y: 0, w: 44, h: 44 };
  }

  updateButtonPositions() {
    const g = this.game;
    this.pauseBtn.x = g.W - 110;
    this.pauseBtn.y = 16;
    this.resetBtn.x = g.W - 56;
    this.resetBtn.y = 16;
  }

  isPauseClicked(mx, my) {
    this.updateButtonPositions();
    const b = this.pauseBtn;
    return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  }

  isResetClicked(mx, my) {
    this.updateButtonPositions();
    const b = this.resetBtn;
    return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  }

  draw(ctx) {
    this.updateButtonPositions();
    this.drawScore(ctx);
    this.drawEnergyBar(ctx);
    this.drawLives(ctx);
    this.drawButtons(ctx);
  }

  drawScore(ctx) {
    const g = this.game;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText('\u5F97\u5206 ' + g.score, 20, 38);
    ctx.restore();
  }

  drawEnergyBar(ctx) {
    const g = this.game;
    const x = 20;
    const y = 55;
    const w = 180;
    const h = 12;
    const fillRatio = g.energy / g.maxEnergy;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    if (fillRatio > 0) {
      const fillW = (w - 4) * fillRatio;
      const grad = ctx.createLinearGradient(x, y + h, x + w, y);
      grad.addColorStop(0, '#0044ff');
      grad.addColorStop(0.5, '#00ccff');
      grad.addColorStop(1, '#00ffff');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = fillRatio >= 1 ? 15 : 6;
      this.roundRect(ctx, x + 2, y + 2, fillW, h - 4, 3);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    const label = fillRatio >= 1 ? '\u6309 SPACE \u91CA\u653E' : '\u80FD\u91CF ' + Math.floor(fillRatio * 100) + '%';
    ctx.fillText(label, x + w + 8, y + 10);
    ctx.restore();
  }

  drawLives(ctx) {
    const g = this.game;
    ctx.save();
    const startX = g.W / 2 - (g.lives * 18) / 2;
    const ly = g.H - 35;
    for (let i = 0; i < g.lives; i++) {
      const lx = startX + i * 24;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.strokeStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  drawButtons(ctx) {
    this.drawFrostedButton(ctx, this.pauseBtn, '\u23F8');
    this.drawFrostedButton(ctx, this.resetBtn, '\u21BA');
  }

  drawFrostedButton(ctx, btn, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
