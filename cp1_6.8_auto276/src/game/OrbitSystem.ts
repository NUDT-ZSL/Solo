export interface EnergyNode {
  orbitIndex: number;
  angle: number;
  order: number;
  activated: boolean;
  pulsePhase: number;
}

export interface ReverseSwitch {
  orbitIndex: number;
  angle: number;
  cooldown: number;
  justTriggered: boolean;
}

export interface DangerZone {
  orbitIndex: number;
  startAngle: number;
  endAngle: number;
}

export interface TransitionRamp {
  fromOrbit: number;
  toOrbit: number;
  angle: number;
  width: number;
}

export interface Orbit {
  index: number;
  radius: number;
  nodes: EnergyNode[];
  switches: ReverseSwitch[];
  ramps: TransitionRamp[];
  dangerZones: DangerZone[];
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class OrbitSystem {
  orbits: Orbit[] = [];
  gravityStrength: number = 500;
  tiltX: number = 0;
  tiltY: number = 0;
  centerX: number = 0;
  centerY: number = 0;
  baseRadius: number = 0;
  burstParticles: BurstParticle[] = [];
  auroraFlashAlpha: number = 0;
  auroraFlashHue: number = 180;

  generateLevel(level: number, canvasWidth: number, canvasHeight: number) {
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.baseRadius = Math.min(canvasWidth, canvasHeight) * 0.36;

    const numOrbits = Math.min(1 + Math.floor(level / 2), 5);
    const numNodes = Math.min(2 + level, 12);
    const numSwitches = Math.min(Math.floor(level / 2), 5);
    const numDangers = Math.min(Math.floor((level - 2) / 2), 3);
    const rand = seededRandom(level * 7919 + 31);

    this.orbits = [];
    const orbitSpacing = this.baseRadius / (numOrbits + 0.5);

    for (let i = 0; i < numOrbits; i++) {
      this.orbits.push({
        index: i,
        radius: this.baseRadius - i * orbitSpacing,
        nodes: [],
        switches: [],
        ramps: [],
        dangerZones: [],
      });
    }

    for (let n = 0; n < numNodes; n++) {
      const orbitIdx = n % numOrbits;
      const baseAngle = (n / numNodes) * Math.PI * 2;
      const jitter = rand() * 0.6 - 0.3;
      this.orbits[orbitIdx].nodes.push({
        orbitIndex: orbitIdx,
        angle: baseAngle + jitter,
        order: n + 1,
        activated: false,
        pulsePhase: rand() * Math.PI * 2,
      });
    }

    for (let s = 0; s < numSwitches; s++) {
      const orbitIdx = Math.floor(rand() * numOrbits);
      let angle = rand() * Math.PI * 2;
      let attempts = 0;
      while (attempts < 30) {
        let ok = true;
        for (const node of this.orbits[orbitIdx].nodes) {
          let diff = Math.abs(angle - node.angle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 0.4) { ok = false; break; }
        }
        if (ok) break;
        angle = rand() * Math.PI * 2;
        attempts++;
      }
      this.orbits[orbitIdx].switches.push({
        orbitIndex: orbitIdx,
        angle,
        cooldown: 0,
        justTriggered: false,
      });
    }

    if (numDangers > 0) {
      for (let d = 0; d < numDangers; d++) {
        const orbitIdx = Math.floor(rand() * numOrbits);
        const startAngle = rand() * Math.PI * 2;
        const span = 0.3 + rand() * 0.4;
        this.orbits[orbitIdx].dangerZones.push({
          orbitIndex: orbitIdx,
          startAngle,
          endAngle: startAngle + span,
        });
      }
    }

    for (let i = 0; i < numOrbits - 1; i++) {
      const rampAngle = rand() * Math.PI * 2;
      this.orbits[i].ramps.push({
        fromOrbit: i,
        toOrbit: i + 1,
        angle: rampAngle,
        width: 0.35,
      });
      this.orbits[i + 1].ramps.push({
        fromOrbit: i + 1,
        toOrbit: i,
        angle: rampAngle + Math.PI * (0.8 + rand() * 0.4),
        width: 0.35,
      });
    }
  }

  getTiltAngle(): number {
    return Math.atan2(this.tiltY, this.tiltX);
  }

  getTiltMagnitude(): number {
    const mag = Math.sqrt(this.tiltX * this.tiltX + this.tiltY * this.tiltY);
    return Math.min(mag, 1.0);
  }

  getTangentialAcceleration(orbitIndex: number, angle: number): number {
    const orbit = this.orbits[orbitIndex];
    if (!orbit) return 0;
    const tiltAngle = this.getTiltAngle();
    const tiltMag = this.getTiltMagnitude();
    return (this.gravityStrength * tiltMag * Math.sin(tiltAngle - angle)) / orbit.radius;
  }

  update(dt: number) {
    this.burstParticles = this.burstParticles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      return p.life > 0;
    });

    for (const orbit of this.orbits) {
      for (const sw of orbit.switches) {
        if (sw.cooldown > 0) sw.cooldown = Math.max(0, sw.cooldown - dt);
        sw.justTriggered = false;
      }
    }

    if (this.auroraFlashAlpha > 0) {
      this.auroraFlashAlpha -= dt * 1.2;
      if (this.auroraFlashAlpha < 0) this.auroraFlashAlpha = 0;
    }
  }

  spawnBurstAt(x: number, y: number, count: number, hueBase: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 150;
      this.burstParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 1.2,
        hue: hueBase + Math.random() * 80,
        size: 1.5 + Math.random() * 3,
      });
    }
  }

  activateNode(orbitIndex: number, nodeIndex: number) {
    const node = this.orbits[orbitIndex].nodes[nodeIndex];
    node.activated = true;
    const pos = this.getNodeWorldPos(orbitIndex, nodeIndex);
    this.spawnBurstAt(pos.x, pos.y, 35, 200);
  }

  triggerSwitch(orbitIndex: number, switchIndex: number) {
    const sw = this.orbits[orbitIndex].switches[switchIndex];
    sw.cooldown = 1.5;
    sw.justTriggered = true;
    this.auroraFlashAlpha = 0.5;
    this.auroraFlashHue = 180 + Math.random() * 180;
  }

  getNodeWorldPos(orbitIndex: number, nodeIndex: number): { x: number; y: number } {
    const node = this.orbits[orbitIndex].nodes[nodeIndex];
    const orbit = this.orbits[orbitIndex];
    return {
      x: this.centerX + Math.cos(node.angle) * orbit.radius,
      y: this.centerY + Math.sin(node.angle) * orbit.radius,
    };
  }

  getSwitchWorldPos(orbitIndex: number, switchIndex: number): { x: number; y: number } {
    const sw = this.orbits[orbitIndex].switches[switchIndex];
    const orbit = this.orbits[orbitIndex];
    return {
      x: this.centerX + Math.cos(sw.angle) * orbit.radius,
      y: this.centerY + Math.sin(sw.angle) * orbit.radius,
    };
  }

  getTotalNodes(): number {
    let total = 0;
    for (const orbit of this.orbits) total += orbit.nodes.length;
    return total;
  }

  getActivatedCount(): number {
    let count = 0;
    for (const orbit of this.orbits) {
      for (const node of orbit.nodes) {
        if (node.activated) count++;
      }
    }
    return count;
  }

  getNextNodeOrder(): number {
    for (const orbit of this.orbits) {
      for (const node of orbit.nodes) {
        if (!node.activated) return node.order;
      }
    }
    return -1;
  }

  isNextNode(node: EnergyNode): boolean {
    return !node.activated && node.order === this.getNextNodeOrder();
  }

  checkNodeCollision(orbitIndex: number, ballAngle: number, ballRadius: number): { orbitIdx: number; nodeIdx: number } | null {
    const orbit = this.orbits[orbitIndex];
    if (!orbit) return null;
    for (let ni = 0; ni < orbit.nodes.length; ni++) {
      const node = orbit.nodes[ni];
      if (node.activated) continue;
      if (!this.isNextNode(node)) continue;
      let diff = ballAngle - node.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const arcDist = Math.abs(diff) * orbit.radius;
      if (arcDist < ballRadius + 14) {
        return { orbitIdx: orbitIndex, nodeIdx: ni };
      }
    }
    return null;
  }

  checkSwitchCollision(orbitIndex: number, ballAngle: number, ballRadius: number): { orbitIdx: number; switchIdx: number } | null {
    const orbit = this.orbits[orbitIndex];
    if (!orbit) return null;
    for (let si = 0; si < orbit.switches.length; si++) {
      const sw = orbit.switches[si];
      if (sw.cooldown > 0) continue;
      let diff = ballAngle - sw.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const arcDist = Math.abs(diff) * orbit.radius;
      if (arcDist < ballRadius + 12) {
        return { orbitIdx: orbitIndex, switchIdx: si };
      }
    }
    return null;
  }

  checkDangerCollision(orbitIndex: number, ballAngle: number): boolean {
    const orbit = this.orbits[orbitIndex];
    if (!orbit) return false;
    for (const dz of orbit.dangerZones) {
      let a = ballAngle;
      while (a < dz.startAngle) a += Math.PI * 2;
      if (a <= dz.endAngle) return true;
      a = ballAngle;
      while (a > dz.endAngle) a -= Math.PI * 2;
      if (a >= dz.startAngle) return true;
    }
    return false;
  }

  checkRampTransition(orbitIndex: number, ballAngle: number): number | null {
    const orbit = this.orbits[orbitIndex];
    if (!orbit) return null;
    for (const ramp of orbit.ramps) {
      let diff = ballAngle - ramp.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      if (Math.abs(diff) < ramp.width / 2) {
        return ramp.toOrbit;
      }
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    this.renderOrbits(ctx, time);
    this.renderRamps(ctx);
    this.renderNodes(ctx, time);
    this.renderSwitches(ctx, time);
    this.renderDangerZones(ctx, time);
    this.renderBurstParticles(ctx);
    this.renderAuroraFlash(ctx);
  }

  private renderOrbits(ctx: CanvasRenderingContext2D, time: number) {
    for (let i = 0; i < this.orbits.length; i++) {
      const orbit = this.orbits[i];
      const hueBase = 270 - i * 35;

      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, orbit.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hueBase}, 70%, 55%, 0.15)`;
      ctx.lineWidth = 6;
      ctx.shadowColor = `hsla(${hueBase}, 100%, 65%, 0.3)`;
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();

      const segments = 72;
      for (let s = 0; s < segments; s++) {
        const a1 = (s / segments) * Math.PI * 2;
        const a2 = ((s + 1) / segments) * Math.PI * 2;
        const hue = hueBase + ((hueBase - 100) - hueBase) * (s / segments);
        const shimmer = 0.18 + 0.07 * Math.sin(time * 1.5 + s * 0.3);

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, orbit.radius, a1, a2);
        ctx.strokeStyle = `hsla(${hue}, 85%, 62%, ${shimmer})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }

  private renderRamps(ctx: CanvasRenderingContext2D) {
    for (const orbit of this.orbits) {
      for (const ramp of orbit.ramps) {
        const fromR = orbit.radius;
        const toR = this.orbits[ramp.toOrbit].radius;
        const x1 = this.centerX + Math.cos(ramp.angle) * fromR;
        const y1 = this.centerY + Math.sin(ramp.angle) * fromR;
        const x2 = this.centerX + Math.cos(ramp.angle) * toR;
        const y2 = this.centerY + Math.sin(ramp.angle) * toR;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(180, 255, 220, 0.12)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(150, 255, 200, 0.3)';
        ctx.shadowBlur = 10;
        ctx.stroke();

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 255, 220, 0.25)';
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderNodes(ctx: CanvasRenderingContext2D, time: number) {
    for (const orbit of this.orbits) {
      for (let ni = 0; ni < orbit.nodes.length; ni++) {
        const node = orbit.nodes[ni];
        const pos = this.getNodeWorldPos(node.orbitIndex, ni);
        const pulse = Math.sin(time * 3 + node.pulsePhase) * 0.3 + 0.7;

        ctx.save();
        if (node.activated) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(140, 100%, 65%, 0.7)';
          ctx.shadowColor = 'hsla(140, 100%, 65%, 0.6)';
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsla(140, 100%, 70%, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          const isNext = this.isNextNode(node);
          const baseAlpha = isNext ? 0.9 : 0.4;
          const size = isNext ? 11 : 7;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size * pulse, 0, Math.PI * 2);
          const nodeHue = isNext ? 55 : 45;
          ctx.fillStyle = `hsla(${nodeHue}, 100%, 70%, ${baseAlpha * pulse})`;
          ctx.shadowColor = `hsla(${nodeHue}, 100%, 70%, ${baseAlpha * pulse * 0.7})`;
          ctx.shadowBlur = isNext ? 16 : 8;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size * pulse + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${nodeHue}, 100%, 80%, ${baseAlpha * pulse * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (isNext) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * pulse})`;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText(String(node.order), pos.x, pos.y);
          }
        }
        ctx.restore();
      }
    }
  }

  private renderSwitches(ctx: CanvasRenderingContext2D, time: number) {
    for (const orbit of this.orbits) {
      for (let si = 0; si < orbit.switches.length; si++) {
        const sw = orbit.switches[si];
        const pos = this.getSwitchWorldPos(orbit.index, si);
        const pulse = Math.sin(time * 4 + si) * 0.2 + 0.8;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(Math.PI / 4 + time * 0.5);
        const s = 7 * (sw.cooldown > 0 ? 0.7 : pulse);

        ctx.beginPath();
        ctx.rect(-s, -s, s * 2, s * 2);
        if (sw.cooldown > 0) {
          ctx.fillStyle = `hsla(0, 40%, 35%, 0.25)`;
        } else {
          ctx.fillStyle = `hsla(340, 100%, 60%, ${0.6 * pulse})`;
          ctx.shadowColor = `hsla(340, 100%, 60%, ${0.5 * pulse})`;
          ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderDangerZones(ctx: CanvasRenderingContext2D, time: number) {
    for (const orbit of this.orbits) {
      for (const dz of orbit.dangerZones) {
        const pulse = 0.3 + Math.sin(time * 5) * 0.1;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, orbit.radius, dz.startAngle, dz.endAngle);
        ctx.strokeStyle = `hsla(0, 100%, 50%, ${pulse})`;
        ctx.lineWidth = 5;
        ctx.shadowColor = `hsla(0, 100%, 50%, ${pulse * 0.8})`;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private renderBurstParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.burstParticles) {
      const alpha = (p.life / p.maxLife) * 0.85;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.5})`;
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.restore();
    }
  }

  private renderAuroraFlash(ctx: CanvasRenderingContext2D) {
    if (this.auroraFlashAlpha <= 0) return;
    const grad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.baseRadius * 1.6
    );
    grad.addColorStop(0, `hsla(${this.auroraFlashHue}, 100%, 70%, ${this.auroraFlashAlpha * 0.25})`);
    grad.addColorStop(0.4, `hsla(${this.auroraFlashHue + 60}, 100%, 60%, ${this.auroraFlashAlpha * 0.12})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}
