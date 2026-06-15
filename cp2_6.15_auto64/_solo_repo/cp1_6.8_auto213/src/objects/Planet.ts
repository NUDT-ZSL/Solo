import Phaser from 'phaser';

const FRAGMENT_SHADER = `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uGravityRadius;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);

  float alpha = smoothstep(0.5, 0.3, dist) * 0.2;
  float pulse = sin(uTime * 2.0) * 0.05 + 0.15;
  alpha += smoothstep(0.32, 0.28, dist) * pulse;

  vec3 color = mix(vec3(0.3, 0.5, 1.0), vec3(0.1, 0.2, 0.6), dist);
  gl_FragColor = vec4(color, alpha);
}
`;

export class Planet extends Phaser.GameObjects.Container {
  private planetCore: Phaser.GameObjects.Arc;
  private glowRing: Phaser.GameObjects.Arc;
  private gravityField: Phaser.GameObjects.Graphics;
  private orbitRing: Phaser.GameObjects.Arc;
  private rotAngle: number = 0;
  private orbitDots: Phaser.GameObjects.Arc[] = [];

  public gravityRadius: number;
  public planetRadius: number;
  public planetColor: number;
  private rotationSpeed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    color: number,
    gravityRadius: number,
    rotationSpeed: number,
  ) {
    super(scene, x, y);
    this.planetRadius = radius;
    this.planetColor = color;
    this.gravityRadius = gravityRadius;
    this.rotationSpeed = rotationSpeed;

    this.gravityField = scene.add.graphics();
    this.drawGravityField(0.3);
    this.add(this.gravityField);

    this.glowRing = scene.add.arc(0, 0, radius + 8, 0, 360, false, color, 0.15);
    this.add(this.glowRing);

    this.orbitRing = scene.add.arc(0, 0, radius + 16, 0, 360, false, 0xffffff, 0.08);
    this.add(this.orbitRing);

    this.planetCore = scene.add.arc(0, 0, radius, 0, 360, false, color, 0.7);
    this.add(this.planetCore);

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const dot = scene.add.arc(
        Math.cos(angle) * (radius * 0.55),
        Math.sin(angle) * (radius * 0.55),
        2, 0, 360, false, 0xffffff, 0.4,
      );
      this.orbitDots.push(dot);
      this.add(dot);
    }

    scene.add.existing(this);
  }

  private drawGravityField(baseAlpha: number): void {
    this.gravityField.clear();
    for (let i = 3; i >= 0; i--) {
      const r = this.gravityRadius * (1 - i * 0.2);
      const alpha = baseAlpha * (0.03 + i * 0.01);
      this.gravityField.lineStyle(1, this.planetColor, alpha);
      this.gravityField.strokeCircle(0, 0, r);
    }
    this.gravityField.fillStyle(this.planetColor, 0.03);
    this.gravityField.fillCircle(0, 0, this.gravityRadius);
  }

  update(time: number, delta: number): void {
    this.rotAngle += this.rotationSpeed * (delta / 16.67);

    for (let i = 0; i < this.orbitDots.length; i++) {
      const angle = this.rotAngle + (Math.PI * 2 / 6) * i;
      this.orbitDots[i].setPosition(
        Math.cos(angle) * (this.planetRadius * 0.55),
        Math.sin(angle) * (this.planetRadius * 0.55),
      );
    }

    const pulseScale = 1 + Math.sin(time * 0.003) * 0.05;
    this.glowRing.setScale(pulseScale);
    this.glowRing.setAlpha(0.12 + Math.sin(time * 0.002) * 0.05);

    this.orbitRing.setScale(1 + Math.sin(time * 0.002 + 1) * 0.03);
    this.orbitRing.setAlpha(0.06 + Math.sin(time * 0.0015) * 0.03);
  }

  getDeflection(waveX: number, waveY: number, deflectionAngle: number): { dx: number; dy: number } {
    const dx = this.x - waveX;
    const dy = this.y - waveY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.gravityRadius || dist < this.planetRadius) {
      return { dx: 0, dy: 0 };
    }

    const strength = (1 - dist / this.gravityRadius) * deflectionAngle;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { dx: 0, dy: 0 };

    return {
      dx: (dx / len) * strength,
      dy: (dy / len) * strength,
    };
  }
}
