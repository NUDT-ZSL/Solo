export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
  }

  spawn(difficulty) {
    const g = this.game;
    const type = Math.random() < 0.6 ? 'asteroid' : 'fighter';

    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
      case 0: x = -40; y = Math.random() * g.H; break;
      case 1: x = g.W + 40; y = Math.random() * g.H; break;
      case 2: x = Math.random() * g.W; y = -40; break;
      default: x = Math.random() * g.W; y = g.H + 40; break;
    }

    if (type === 'asteroid') {
      const size = 18 + Math.random() * 25;
      const targetX = g.W * (0.2 + Math.random() * 0.6);
      const targetY = g.H * (0.2 + Math.random() * 0.6);
      const angle = Math.atan2(targetY - y, targetX - x);
      const speed = 40 + Math.random() * 60 + difficulty * 5;

      const vertCount = 6 + Math.floor(Math.random() * 4);
      const vertices = [];
      for (let i = 0; i < vertCount; i++) {
        const a = (i / vertCount) * Math.PI * 2;
        const r = size * (0.7 + Math.random() * 0.3);
        vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }

      this.enemies.push({
        type: 'asteroid',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        hp: Math.ceil(size / 12),
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 2,
        vertices,
        color: '#aa7744',
        scoreValue: Math.ceil(size / 5)
      });
    } else {
      const angle = Math.atan2(g.ship.y - y, g.ship.x - x);
      const speed = 60 + Math.random() * 40 + difficulty * 8;

      this.enemies.push({
        type: 'fighter',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 14,
        hp: 1,
        rotation: angle,
        rotSpeed: 0,
        color: '#ff3366',
        scoreValue: 20
      });
    }
  }

  update(dt) {
    const g = this.game;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.type === 'fighter') {
        const angle = Math.atan2(g.ship.y - e.y, g.ship.x - e.x);
        e.rotation = angle;
        e.vx += Math.cos(angle) * 30 * dt;
        e.vy += Math.sin(angle) * 30 * dt;
        const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        const maxSpeed = 150;
        if (speed > maxSpeed) {
          e.vx = (e.vx / speed) * maxSpeed;
          e.vy = (e.vy / speed) * maxSpeed;
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rotation += e.rotSpeed * dt;

      const margin = 150;
      if (e.x < -margin || e.x > g.W + margin || e.y < -margin || e.y > g.H + margin) {
        const toCenterX = g.W / 2 - e.x;
        const toCenterY = g.H / 2 - e.y;
        const dot = e.vx * toCenterX + e.vy * toCenterY;
        if (dot < 0) {
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  draw(ctx) {
    for (const e of this.enemies) {
      if (e.type === 'asteroid') {
        this.drawAsteroid(ctx, e);
      } else {
        this.drawFighter(ctx, e);
      }
    }
  }

  drawAsteroid(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rotation);
    ctx.beginPath();
    for (let i = 0; i < e.vertices.length; i++) {
      const v = e.vertices[i];
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
    ctx.strokeStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(170, 119, 68, 0.12)';
    ctx.fill();
    ctx.restore();
  }

  drawFighter(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rotation);
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-9, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.strokeStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 51, 102, 0.12)';
    ctx.fill();
    ctx.restore();
  }
}
