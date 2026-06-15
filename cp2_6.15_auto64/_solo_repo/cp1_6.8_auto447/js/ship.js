export class Ship {
  constructor(game) {
    this.game = game;
    this.x = game.W / 2;
    this.y = game.H / 2;
    this.angle = 0;
    this.size = 14;
    this.speed = 280;
    this.bullets = [];
    this.shootCooldown = 0;
    this.shootRate = 0.12;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.trail = [];
  }

  update(dt) {
    const g = this.game;
    const keys = g.keys;

    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
    }

    this.x = Math.max(this.size, Math.min(g.W - this.size, this.x));
    this.y = Math.max(this.size, Math.min(g.H - this.size, this.y));

    this.angle = Math.atan2(g.mouse.y - this.y, g.mouse.x - this.x);

    this.shootCooldown -= dt;
    if (g.mouse.down && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootRate;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > g.W + 20 || b.y < -20 || b.y > g.H + 20) {
        this.bullets.splice(i, 1);
      }
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    this.trail.push({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > 15) this.trail.shift();
    for (const t of this.trail) {
      t.alpha -= dt * 4;
    }
  }

  shoot() {
    const speed = 600;
    this.bullets.push({
      x: this.x + Math.cos(this.angle) * 20,
      y: this.y + Math.sin(this.angle) * 20,
      vx: Math.cos(this.angle) * speed,
      vy: Math.sin(this.angle) * speed,
      angle: this.angle,
      life: 1.2
    });
  }

  draw(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      if (t.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.2;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.bullets) {
      ctx.save();
      const tailLen = 14;
      ctx.strokeStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(b.angle) * tailLen, b.y - Math.sin(b.angle) * tailLen);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(b.angle) * tailLen, b.y - Math.sin(b.angle) * tailLen);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    if (this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.fill();

    const flicker = 4 + Math.random() * 8;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(-7 - flicker, 0);
    ctx.lineTo(-7, 4);
    ctx.strokeStyle = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
