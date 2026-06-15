import * as THREE from 'three';

export interface LightTrail {
  id: number;
  points: THREE.Vector3[];
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  lineWidth: number;
  line: THREE.Line;
  createdAt: number;
}

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  radius: number;
  angularSpeed: number;
}

export interface ControlParams {
  lineWidth: number;
  particleSpreadSpeed: number;
}

const COLOR_START = new THREE.Color(0x6366f1);
const COLOR_MID = new THREE.Color(0xa855f7);
const COLOR_END = new THREE.Color(0xf59e0b);
const COLOR_FINAL = new THREE.Color(0xf97316);

const GRADIENT_STOPS = [COLOR_START, COLOR_MID, COLOR_END, COLOR_FINAL];

export function sampleGradient(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const segment = clamped * (GRADIENT_STOPS.length - 1);
  const index = Math.floor(segment);
  const frac = segment - index;
  if (index >= GRADIENT_STOPS.length - 1) {
    return GRADIENT_STOPS[GRADIENT_STOPS.length - 1].clone();
  }
  return new THREE.Color().lerpColors(GRADIENT_STOPS[index], GRADIENT_STOPS[index + 1], frac);
}

export function randomGradientColor(): THREE.Color {
  return sampleGradient(Math.random());
}

export function createTrailGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i].x;
    positions[i * 3 + 1] = points[i].y;
    positions[i * 3 + 2] = points[i].z;
    const t = points.length > 1 ? i / (points.length - 1) : 0;
    const c = sampleGradient(t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function updateTrailGeometry(geometry: THREE.BufferGeometry, points: THREE.Vector3[]): void {
  const needed = points.length * 3;
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  if (posAttr.count < points.length) {
    const positions = new Float32Array(needed);
    const colors = new Float32Array(needed);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;
      const t = points.length > 1 ? i / (points.length - 1) : 0;
      const c = sampleGradient(t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  } else {
    for (let i = 0; i < points.length; i++) {
      posAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
      const t = points.length > 1 ? i / (points.length - 1) : 0;
      const c = sampleGradient(t);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geometry.setDrawRange(0, points.length);
  }
}

export function screenToRay(
  mouseX: number,
  mouseY: number,
  width: number,
  height: number,
  camera: THREE.Camera
): THREE.Ray {
  const ndc = new THREE.Vector2(
    (mouseX / width) * 2 - 1,
    -(mouseY / height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray;
}

export function rayTo3DPoint(
  ray: THREE.Ray,
  camera: THREE.Camera,
  depth: number = 15
): THREE.Vector3 {
  const dir = ray.direction.clone().normalize();
  const origin = ray.origin.clone();
  return origin.add(dir.multiplyScalar(depth));
}

export function pointDistance3D(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

export function createParticleBurst(
  origin: THREE.Vector3,
  count: number,
  baseColor: THREE.Color,
  spreadSpeed: number
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = (0.5 + Math.random() * 1.5) * spreadSpeed;
    const vx = Math.sin(phi) * Math.cos(theta) * speed;
    const vy = Math.sin(phi) * Math.sin(theta) * speed;
    const vz = Math.cos(phi) * speed;
    const maxLife = 1.5 + Math.random() * 2.0;
    const color = baseColor.clone().lerp(randomGradientColor(), 0.3 + Math.random() * 0.4);
    particles.push({
      position: origin.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      )),
      velocity: new THREE.Vector3(vx, vy, vz),
      color,
      life: maxLife,
      maxLife,
      size: 0.05 + Math.random() * 0.1,
      angle: Math.random() * Math.PI * 2,
      radius: 0,
      angularSpeed: (1 + Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1),
    });
  }
  return particles;
}

export function updateParticle(p: Particle, dt: number): void {
  p.life -= dt;
  p.angle += p.angularSpeed * dt;
  p.radius += p.velocity.length() * dt * 0.3;
  const spiralX = Math.cos(p.angle) * p.radius * dt;
  const spiralZ = Math.sin(p.angle) * p.radius * dt;
  p.position.x += p.velocity.x * dt + spiralX * 0.1;
  p.position.y += p.velocity.y * dt;
  p.position.z += p.velocity.z * dt + spiralZ * 0.1;
  p.velocity.multiplyScalar(0.98);
}

export function isParticleAlive(p: Particle): boolean {
  return p.life > 0;
}

export function particleOpacity(p: Particle): number {
  return Math.max(0, p.life / p.maxLife);
}
