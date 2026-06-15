import * as THREE from 'three';
import { Planet } from './Planet';

const LINE_VERTEX_SHADER = `
  attribute float aLineAlpha;
  varying float vLineAlpha;
  varying vec2 vUvCoord;
  void main() {
    vLineAlpha = aLineAlpha;
    vUvCoord = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulse;
  uniform float uThickness;
  varying float vLineAlpha;
  varying vec2 vUvCoord;

  void main() {
    float yDist = abs(vUvCoord.y - 0.5) * 2.0;
    float coreGlow = smoothstep(1.0, 0.0, yDist);
    float outerGlow = smoothstep(1.0, 0.3, yDist) * 0.4;

    float flow = sin(vUvCoord.x * 15.0 - uTime * 3.0) * 0.3 + 0.7;
    float flow2 = sin(vUvCoord.x * 8.0 + uTime * 2.0) * 0.2 + 0.8;
    float combinedFlow = flow * flow2;

    float pulse = 0.6 + uPulse * 0.4;
    float alpha = (coreGlow + outerGlow) * combinedFlow * pulse * vLineAlpha;
    vec3 color = uColor * (1.0 + uPulse * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`;

const BURST_VERTEX_SHADER = `
  attribute float aBurstSize;
  attribute vec3 aBurstColor;
  attribute float aBurstAlpha;
  varying vec3 vBurstColor;
  varying float vBurstAlpha;

  void main() {
    vBurstColor = aBurstColor;
    vBurstAlpha = aBurstAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aBurstSize;
  }
`;

const BURST_FRAGMENT_SHADER = `
  varying vec3 vBurstColor;
  varying float vBurstAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, dist);
    glow = pow(glow, 1.8);
    gl_FragColor = vec4(vBurstColor, glow * vBurstAlpha);
  }
`;

const MAX_BURST_PARTICLES = 300;
const PULSE_INTERVAL = 2.5;

interface Connection {
  from: Planet;
  to: Planet;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  size: number;
  life: number;
  maxLife: number;
}

export class Constellation {
  private connections: Connection[] = [];
  private pulseTime = 0;
  private pulseValue = 0;
  private _lineThickness = 1;
  private burstParticles: BurstParticle[] = [];
  private burstGeometry: THREE.BufferGeometry;
  private burstMaterial: THREE.ShaderMaterial;
  private burstPoints: THREE.Points;
  private burstPosArray: Float32Array;
  private burstColorArray: Float32Array;
  private burstSizeArray: Float32Array;
  private burstAlphaArray: Float32Array;
  private time = 0;

  constructor(private scene: THREE.Scene) {
    this.burstPosArray = new Float32Array(MAX_BURST_PARTICLES * 3);
    this.burstColorArray = new Float32Array(MAX_BURST_PARTICLES * 3);
    this.burstSizeArray = new Float32Array(MAX_BURST_PARTICLES);
    this.burstAlphaArray = new Float32Array(MAX_BURST_PARTICLES);

    this.burstGeometry = new THREE.BufferGeometry();
    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(this.burstPosArray, 3));
    this.burstGeometry.setAttribute('aBurstColor', new THREE.BufferAttribute(this.burstColorArray, 3));
    this.burstGeometry.setAttribute('aBurstSize', new THREE.BufferAttribute(this.burstSizeArray, 1));
    this.burstGeometry.setAttribute('aBurstAlpha', new THREE.BufferAttribute(this.burstAlphaArray, 1));
    this.burstGeometry.setDrawRange(0, 0);

    this.burstMaterial = new THREE.ShaderMaterial({
      vertexShader: BURST_VERTEX_SHADER,
      fragmentShader: BURST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.burstPoints = new THREE.Points(this.burstGeometry, this.burstMaterial);
    this.burstPoints.frustumCulled = false;
    scene.add(this.burstPoints);
  }

  get lineThickness() { return this._lineThickness; }
  set lineThickness(v: number) { this._lineThickness = v; }

  hasConnection(from: Planet, to: Planet): boolean {
    return this.connections.some(
      c => (c.from === from && c.to === to) || (c.from === to && c.to === from)
    );
  }

  addConnection(from: Planet, to: Planet) {
    if (this.hasConnection(from, to)) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(12);
    const uvs = new Float32Array(8);
    const alphas = new Float32Array(4);

    uvs[0] = 0; uvs[1] = 0;
    uvs[2] = 0; uvs[3] = 1;
    uvs[4] = 1; uvs[5] = 0;
    uvs[6] = 1; uvs[7] = 1;
    alphas[0] = 1; alphas[1] = 1; alphas[2] = 1; alphas[3] = 1;

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('aLineAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);

    const material = new THREE.ShaderMaterial({
      vertexShader: LINE_VERTEX_SHADER,
      fragmentShader: LINE_FRAGMENT_SHADER,
      uniforms: {
        uColor: { value: new THREE.Color(0.6, 0.7, 1.0) },
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uThickness: { value: this._lineThickness },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    this.connections.push({ from, to, mesh, material });
  }

  private updateConnectionGeometry(conn: Connection) {
    const posAttr = conn.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const fx = conn.from.x, fy = conn.from.y;
    const tx = conn.to.x, ty = conn.to.y;
    const dx = tx - fx, dy = ty - fy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;

    const halfW = (3 + this._lineThickness * 4) * 0.5;
    const nx = (-dy / len) * halfW;
    const ny = (dx / len) * halfW;

    arr[0] = fx + nx; arr[1] = fy + ny; arr[2] = 0;
    arr[3] = fx - nx; arr[4] = fy - ny; arr[5] = 0;
    arr[6] = tx + nx; arr[7] = ty + ny; arr[8] = 0;
    arr[9] = tx - nx; arr[10] = ty - ny; arr[11] = 0;
    posAttr.needsUpdate = true;
  }

  private emitBurst(x: number, y: number, color: THREE.Color) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.burstParticles.length >= MAX_BURST_PARTICLES) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2;
      this.burstParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: color.r * (0.8 + Math.random() * 0.2),
        g: color.g * (0.8 + Math.random() * 0.2),
        b: color.b * (0.8 + Math.random() * 0.2),
        size: 3 + Math.random() * 3,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.6,
      });
    }
  }

  update(dt: number) {
    this.time += dt;
    this.pulseTime += dt;

    const pulseRaw = Math.sin(this.pulseTime / PULSE_INTERVAL * Math.PI * 2);
    this.pulseValue = Math.max(0, pulseRaw);

    if (this.pulseTime >= PULSE_INTERVAL) {
      this.pulseTime -= PULSE_INTERVAL;
      for (const conn of this.connections) {
        this.emitBurst(conn.from.x, conn.from.y, conn.from.color);
        this.emitBurst(conn.to.x, conn.to.y, conn.to.color);
        const mx = (conn.from.x + conn.to.x) / 2;
        const my = (conn.from.y + conn.to.y) / 2;
        const mc = conn.from.color.clone().lerp(conn.to.color, 0.5);
        this.emitBurst(mx, my, mc);
      }
    }

    for (const conn of this.connections) {
      this.updateConnectionGeometry(conn);
      conn.material.uniforms.uTime.value = this.time;
      conn.material.uniforms.uPulse.value = this.pulseValue;
      conn.material.uniforms.uThickness.value = this._lineThickness;
    }

    this.burstParticles = this.burstParticles.filter(p => {
      p.life -= dt / p.maxLife;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.97;
      p.vy *= 0.97;
      return p.life > 0;
    });

    const bn = this.burstParticles.length;
    for (let i = 0; i < bn; i++) {
      const p = this.burstParticles[i];
      const i3 = i * 3;
      this.burstPosArray[i3] = p.x;
      this.burstPosArray[i3 + 1] = p.y;
      this.burstPosArray[i3 + 2] = 0;
      this.burstColorArray[i3] = p.r;
      this.burstColorArray[i3 + 1] = p.g;
      this.burstColorArray[i3 + 2] = p.b;
      this.burstSizeArray[i] = p.size * Math.max(0, p.life);
      this.burstAlphaArray[i] = Math.max(0, p.life);
    }
    (this.burstGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.burstGeometry.attributes.aBurstColor as THREE.BufferAttribute).needsUpdate = true;
    (this.burstGeometry.attributes.aBurstSize as THREE.BufferAttribute).needsUpdate = true;
    (this.burstGeometry.attributes.aBurstAlpha as THREE.BufferAttribute).needsUpdate = true;
    this.burstGeometry.setDrawRange(0, bn);
  }

  removeConnectionsFor(planet: Planet) {
    const toRemove = this.connections.filter(c => c.from === planet || c.to === planet);
    for (const conn of toRemove) {
      this.scene.remove(conn.mesh);
      conn.mesh.geometry.dispose();
      conn.material.dispose();
    }
    this.connections = this.connections.filter(c => c.from !== planet && c.to !== planet);
  }

  clearAll() {
    for (const conn of this.connections) {
      this.scene.remove(conn.mesh);
      conn.mesh.geometry.dispose();
      conn.material.dispose();
    }
    this.connections = [];
    this.burstParticles = [];
    this.burstGeometry.setDrawRange(0, 0);
  }

  dispose() {
    this.clearAll();
    this.burstGeometry.dispose();
    this.burstMaterial.dispose();
    this.scene.remove(this.burstPoints);
  }
}
