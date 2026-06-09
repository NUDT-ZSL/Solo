import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  initialSize: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  mesh: THREE.Mesh;
}

const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uTime;

  void main() {
    vAlpha = aSize;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = (1.0 - dist * 2.0) * vAlpha;
    vec3 color = vColor + vec3(0.3) * (1.0 - dist * 2.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

export class ParticleEffect {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles: number = 200;
  private particleGeometry: THREE.SphereGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeometry = new THREE.SphereGeometry(1, 8, 8);
  }

  public spawnBurst(position: THREE.Vector3, baseColor: THREE.Color): void {
    const count = 60;
    const availableSlots = this.maxParticles - this.particles.length;
    const actualCount = Math.min(count, availableSlots);

    if (actualCount <= 0) return;

    for (let i = 0; i < actualCount; i++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      const upBias = new THREE.Vector3(0, 1, 0);
      direction.lerp(upBias, 0.15);
      direction.normalize();

      const speed = 1.5 + Math.random() * 1.5;
      const velocity = direction.multiplyScalar(speed);

      const life = 0.8;
      const size = 0.06 + Math.random() * 0.08;

      const particleColor = baseColor.clone();
      const hueShift = (Math.random() - 0.5) * 0.08;
      const hsl = { h: 0, s: 0, l: 0 };
      particleColor.getHSL(hsl);
      hsl.h = (hsl.h + hueShift + 1) % 1;
      hsl.l = Math.min(1, hsl.l + 0.15);
      particleColor.setHSL(hsl.h, hsl.s, hsl.l);

      const targetColor = new THREE.Color(0xffffff);

      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(this.particleGeometry, material);
      mesh.position.copy(position);
      mesh.scale.setScalar(size);
      mesh.renderOrder = 10;

      const particle: Particle = {
        position: mesh.position,
        velocity,
        life,
        maxLife: life,
        size,
        initialSize: size,
        color: particleColor,
        targetColor,
        mesh
      };

      this.particles.push(particle);
      this.scene.add(mesh);
    }
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= delta * 1.5;

      p.velocity.multiplyScalar(0.985);

      p.position.add(p.velocity.clone().multiplyScalar(delta));

      const lifeRatio = p.life / p.maxLife;

      p.size = p.initialSize * lifeRatio;
      p.mesh.scale.setScalar(p.size);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = lifeRatio;
      (mat.color as THREE.Color).copy(p.color).lerp(p.targetColor, 1 - lifeRatio);
    }
  }
}
