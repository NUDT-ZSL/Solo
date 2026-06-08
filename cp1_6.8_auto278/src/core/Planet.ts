import * as THREE from 'three';

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5);
    float dist = length(vUv - center) * 2.0;

    float core = smoothstep(1.0, 0.3, dist);
    float halo = smoothstep(1.4, 0.4, dist) * 0.35;

    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float band1 = sin(angle * 3.0 + uTime * 0.4) * 0.12;
    float band2 = sin(angle * 5.0 - uTime * 0.3 + 1.5) * 0.08;
    float band3 = cos(dist * 8.0 + uTime * 0.2) * 0.06;
    float pattern = 0.85 + band1 + band2 + band3;

    vec3 color = uColor * pattern;
    color += uColor * halo * 0.6;
    float alpha = core + halo;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class Planet {
  mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  mass: number;
  radius: number;
  color: THREE.Color;
  vx = 0;
  vy = 0;
  isDragging = false;
  isHovered = false;
  private time = 0;
  private infoEl: HTMLElement | null = null;

  constructor(
    public x: number,
    public y: number,
    mass: number,
    color: THREE.Color,
    private scene: THREE.Scene
  ) {
    this.mass = mass;
    this.radius = this.calcRadius(mass);
    this.color = color.clone();

    const size = this.radius * 4;
    const geometry = new THREE.PlaneGeometry(size, size);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uColor: { value: this.color },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(x, y, 0.1);
    scene.add(this.mesh);
  }

  private calcRadius(mass: number): number {
    return Math.pow(mass, 0.4) * 8 + 10;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius * 1.5;
  }

  update(dt: number, planets: Planet[], gravityStrength: number) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;

    if (!this.isDragging) {
      const G = gravityStrength * 0.8;
      for (const other of planets) {
        if (other === this) continue;
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distSq = dx * dx + dy * dy;
        const minDist = (this.radius + other.radius) * 1.5;
        const effectiveDistSq = Math.max(distSq, minDist * minDist);
        const dist = Math.sqrt(effectiveDistSq);
        const force = G * this.mass * other.mass / effectiveDistSq;
        this.vx += (dx / dist) * force / this.mass * dt * 60;
        this.vy += (dy / dist) * force / this.mass * dt * 60;
      }
      this.vx *= 0.995;
      this.vy *= 0.995;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
    }

    this.mesh.position.set(this.x, this.y, 0.1);
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.mesh.position.set(x, y, 0.1);
  }

  showInfo(container: HTMLElement) {
    this.hideInfo();
    const el = document.createElement('div');
    el.className = 'planet-info';
    el.innerHTML = `
      <div class="planet-info-title">星球信息</div>
      <div class="planet-info-row"><span>质量</span><span>${this.mass.toFixed(1)}</span></div>
      <div class="planet-info-row"><span>半径</span><span>${this.radius.toFixed(1)}</span></div>
      <div class="planet-info-row"><span>颜色</span><span class="planet-info-color" style="background:rgb(${Math.round(this.color.r*255)},${Math.round(this.color.g*255)},${Math.round(this.color.b*255)})"></span></div>
    `;
    const sx = this.x + window.innerWidth / 2 + this.radius + 15;
    const sy = -this.y + window.innerHeight / 2 - 30;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    container.appendChild(el);
    this.infoEl = el;
    requestAnimationFrame(() => el.classList.add('planet-info-visible'));
  }

  hideInfo() {
    if (this.infoEl) {
      this.infoEl.remove();
      this.infoEl = null;
    }
  }

  addMass(amount: number) {
    this.mass += amount;
    const newRadius = this.calcRadius(this.mass);
    if (Math.abs(newRadius - this.radius) > 1) {
      this.radius = newRadius;
      this.mesh.geometry.dispose();
      const size = this.radius * 4;
      this.mesh.geometry = new THREE.PlaneGeometry(size, size);
    }
  }

  dispose() {
    this.hideInfo();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
