import * as THREE from 'three';

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class SpiralPath {
  private startPos: THREE.Vector3;
  private startAngle: number;
  private startRadius: number;
  private pitch: number;
  private turns: number;

  constructor(startPos: THREE.Vector3, pitch = 0.3, turns = 2) {
    this.startPos = startPos.clone();
    this.startAngle = Math.atan2(startPos.z, startPos.x);
    this.startRadius = Math.sqrt(startPos.x * startPos.x + startPos.z * startPos.z);
    this.pitch = pitch;
    this.turns = turns;
  }

  getPoint(t: number, reverse = false): THREE.Vector3 {
    const nt = reverse ? 1 - t : t;
    const eased = easeInOutCubic(nt);
    const radius = THREE.MathUtils.lerp(this.startRadius, 0, eased);
    const angleOffset = Math.PI * 2 * this.turns * eased;
    const angle = reverse
      ? this.startAngle + angleOffset - Math.PI * 2 * this.turns
      : this.startAngle + angleOffset;
    const y = THREE.MathUtils.lerp(this.startPos.y, 0, eased)
      + Math.sin(eased * Math.PI) * this.pitch;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
  }
}

export class StardustSystem {
  points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private velocities: Float32Array;
  private baseY: Float32Array;
  private count: number;

  constructor(scene: THREE.Scene, count = 150) {
    this.count = count;
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.velocities = new Float32Array(count);
    this.baseY = new Float32Array(count);
    const colorStart = new THREE.Color().setHSL(260 / 360, 0.5, 0.6);
    const colorEnd = new THREE.Color().setHSL(280 / 360, 0.5, 0.8);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const y = -3 + Math.random() * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      this.baseY[i] = y;
      const c = colorStart.clone().lerp(colorEnd, Math.random());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.01 + Math.random() * 0.02;
      this.velocities[i] = 0.05 + Math.random() * 0.1;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  update(delta: number, time: number) {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      arr[i * 3 + 1] = this.baseY[i] + Math.sin(time * this.velocities[i] + i) * 0.2;
      arr[i * 3] += Math.sin(time * 0.2 + i * 0.5) * delta * 0.05;
    }
    pos.needsUpdate = true;
    this.material.opacity = 0.25 + Math.sin(time * 0.3) * 0.1;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class TrailParticleSystem {
  points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private maxCount: number;
  private activeCount = 0;
  private lifetimes: Float32Array;
  private maxLifetime: number;
  private colorStart: THREE.Color;
  private colorEnd: THREE.Color;

  constructor(scene: THREE.Scene, maxCount = 2000, maxLifetime = 0.8) {
    this.maxCount = maxCount;
    this.maxLifetime = maxLifetime;
    this.colorStart = new THREE.Color().setHSL(25 / 360, 1, 0.6);
    this.colorEnd = new THREE.Color().setHSL(15 / 360, 1, 0.4);
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    this.lifetimes = new Float32Array(maxCount);
    for (let i = 0; i < maxCount; i++) {
      sizes[i] = 0;
      this.lifetimes[i] = 0;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  emit(position: THREE.Vector3, count: number) {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.geometry.attributes.color as THREE.BufferAttribute;
    const size = this.geometry.attributes.size as THREE.BufferAttribute;
    const parr = pos.array as Float32Array;
    const carr = col.array as Float32Array;
    const sarr = size.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = this.activeCount % this.maxCount;
      const offset = (Math.random() - 0.5) * 0.08;
      parr[idx * 3] = position.x + offset;
      parr[idx * 3 + 1] = position.y + offset;
      parr[idx * 3 + 2] = position.z + offset;
      const t = Math.random();
      const c = this.colorStart.clone().lerp(this.colorEnd, t);
      carr[idx * 3] = c.r;
      carr[idx * 3 + 1] = c.g;
      carr[idx * 3 + 2] = c.b;
      sarr[idx] = 0.02;
      this.lifetimes[idx] = this.maxLifetime * (0.7 + Math.random() * 0.3);
      this.activeCount++;
    }
    const range = Math.min(this.activeCount, this.maxCount);
    this.geometry.setDrawRange(0, range);
    pos.needsUpdate = true;
    col.needsUpdate = true;
    size.needsUpdate = true;
  }

  update(delta: number) {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.geometry.attributes.color as THREE.BufferAttribute;
    const size = this.geometry.attributes.size as THREE.BufferAttribute;
    const parr = pos.array as Float32Array;
    const carr = col.array as Float32Array;
    const sarr = size.array as Float32Array;
    const range = Math.min(this.activeCount, this.maxCount);
    for (let i = 0; i < range; i++) {
      if (this.lifetimes[i] > 0) {
        this.lifetimes[i] -= delta;
        const t = 1 - this.lifetimes[i] / this.maxLifetime;
        sarr[i] = 0.02 * (1 - t);
        carr[i * 3 + 3] = 0;
        const fade = 1 - easeInOutCubic(t);
        carr[i * 3] *= fade;
        carr[i * 3 + 1] *= fade;
        carr[i * 3 + 2] *= fade;
      }
    }
    size.needsUpdate = true;
    col.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class BurstParticleSystem {
  points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private velocities: Float32Array;
  private count: number;
  private phase: 'burst' | 'coalesce' = 'burst';
  private phaseT = 0;

  constructor(scene: THREE.Scene, count = 80) {
    this.count = count;
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    const colorA = new THREE.Color().setHSL(30 / 360, 1, 0.7);
    const colorB = new THREE.Color().setHSL(50 / 360, 1, 0.6);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 0.5 + Math.random() * 1.0;
      this.velocities[i * 3] = Math.cos(theta) * Math.cos(phi) * speed;
      this.velocities[i * 3 + 1] = Math.sin(phi) * speed;
      this.velocities[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * speed;
      const c = colorA.clone().lerp(colorB, Math.random());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.03 + Math.random() * 0.02;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  startCoalesce() {
    this.phase = 'coalesce';
    this.phaseT = 0;
  }

  update(delta: number, elapsed: number): boolean {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.geometry.attributes.color as THREE.BufferAttribute;
    const size = this.geometry.attributes.size as THREE.BufferAttribute;
    const parr = pos.array as Float32Array;
    const carr = col.array as Float32Array;
    const sarr = size.array as Float32Array;
    let done = false;
    if (this.phase === 'burst') {
      for (let i = 0; i < this.count; i++) {
        parr[i * 3] += this.velocities[i * 3] * delta;
        parr[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
        parr[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
      }
    } else {
      this.phaseT += delta;
      const t = Math.min(1, this.phaseT / 0.5);
      const eased = easeInOutCubic(t);
      for (let i = 0; i < this.count; i++) {
        parr[i * 3] *= 1 - eased * 0.12;
        parr[i * 3 + 1] *= 1 - eased * 0.12;
        parr[i * 3 + 2] *= 1 - eased * 0.12;
        sarr[i] = (0.03 + Math.random() * 0.02) * (1 - eased);
        const fade = 1 - eased * 0.9;
        carr[i * 3] *= 0.98 + fade * 0.02;
      }
      if (t >= 1) done = true;
    }
    pos.needsUpdate = true;
    size.needsUpdate = true;
    col.needsUpdate = true;
    return done;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export type TotemShapeType = 'fourPointStar' | 'spiral' | 'triangle' | 'diamond';

export class TotemFactory {
  static createRandom(scene: THREE.Scene): { mesh: THREE.Mesh; shape: TotemShapeType } {
    const shapes: TotemShapeType[] = ['fourPointStar', 'spiral', 'triangle', 'diamond'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const shape2d = this.createShape(shape);
    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    };
    const geometry = new THREE.ExtrudeGeometry(shape2d, extrudeSettings);
    geometry.center();
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(50 / 360, 0.9, 0.65),
      emissive: new THREE.Color().setHSL(45 / 360, 1, 0.4),
      emissiveIntensity: 1.2,
      metalness: 0.7,
      roughness: 0.25,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(0.01);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, shape };
  }

  private static createShape(type: TotemShapeType): THREE.Shape {
    const shape = new THREE.Shape();
    switch (type) {
      case 'fourPointStar': {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 0.3 : 0.12;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
        }
        shape.closePath();
        break;
      }
      case 'spiral': {
        const points: THREE.Vector2[] = [];
        const turns = 2.5;
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = t * Math.PI * 2 * turns;
          const r = 0.04 + t * 0.26;
          points.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
        }
        shape.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
        const outer = new THREE.Path();
        for (let i = points.length - 1; i >= 0; i--) {
          const p = points[i];
          const norm = p.length() || 1;
          const nx = -p.y / norm;
          const ny = p.x / norm;
          const thick = 0.04;
          if (i === points.length - 1) outer.moveTo(p.x + nx * thick, p.y + ny * thick);
          else outer.lineTo(p.x + nx * thick, p.y + ny * thick);
        }
        outer.closePath();
        shape.moveTo(0, 0);
        for (let i = 0; i < points.length; i++) {
          shape.lineTo(points[i].x, points[i].y);
        }
        shape.closePath();
        break;
      }
      case 'triangle': {
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
          const r = 0.3;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
        }
        shape.closePath();
        break;
      }
      case 'diamond': {
        const pts = [
          new THREE.Vector2(0, -0.3),
          new THREE.Vector2(0.2, 0),
          new THREE.Vector2(0, 0.3),
          new THREE.Vector2(-0.2, 0),
        ];
        shape.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
        shape.closePath();
        break;
      }
    }
    return shape;
  }
}

export class Shockwave {
  mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private duration: number;
  private elapsed = 0;
  private startRadius = 0.2;
  private endRadius = 1.5;

  constructor(scene: THREE.Scene, position: THREE.Vector3, duration = 0.6) {
    this.duration = duration;
    const geometry = new THREE.RingGeometry(0.18, 0.22, 64);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: 0.2 },
        uColor: { value: new THREE.Color().setHSL(50 / 360, 1, 0.7) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uRadius;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          float d = length(vPos.xy);
          float ring = 1.0 - smoothstep(uRadius - 0.15, uRadius, d);
          ring *= smoothstep(uRadius - 0.35, uRadius - 0.2, d);
          float alpha = ring * (1.0 - uTime) * 0.8;
          vec3 col = uColor * (1.2 + (1.0 - uTime) * 0.8);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.lookAt(new THREE.Vector3(0, 1, 0));
    this.mesh.rotateX(Math.PI / 2);
    scene.add(this.mesh);
  }

  update(delta: number): boolean {
    this.elapsed += delta;
    const t = Math.min(1, this.elapsed / this.duration);
    const eased = easeInOutCubic(t);
    const r = THREE.MathUtils.lerp(this.startRadius, this.endRadius, eased);
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uRadius.value = r;
    this.mesh.scale.setScalar(1 + eased * 0.5);
    return t >= 1;
  }

  dispose() {
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    this.material.dispose();
  }
}
