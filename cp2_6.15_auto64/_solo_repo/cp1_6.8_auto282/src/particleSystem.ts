import * as THREE from 'three';
import {
  MAJOR_RADIUS,
  MINOR_RADIUS,
  getTorusPoint,
  CorridorState,
} from './corridor';

interface Shockwave {
  center: THREE.Vector3;
  radius: number;
  maxRadius: number;
  strength: number;
  age: number;
  lifetime: number;
}

const MAX_PARTICLES = 100000;

function corridorColor(t: number): [number, number, number] {
  t = ((t % 1) + 1) % 1;
  if (t < 0.33) {
    const s = t / 0.33;
    return [0.08 + s * 0.15, 0.15 + s * 0.05, 0.75 + s * 0.1];
  } else if (t < 0.67) {
    const s = (t - 0.33) / 0.34;
    return [0.23 + s * 0.42, 0.2 - s * 0.05, 0.85 - s * 0.2];
  } else {
    const s = (t - 0.67) / 0.33;
    return [0.65 + s * 0.25, 0.15 + s * 0.45, 0.65 - s * 0.45];
  }
}

export class ParticleSystem {
  private mesh: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private basePositions: Float32Array;
  private baseColors: Float32Array;
  private thetas: Float32Array;
  private phis: Float32Array;
  private rhos: Float32Array;
  private shockwaves: Shockwave[] = [];
  private lightLinesGroup: THREE.Group;
  private lightLineUniforms: { uTime: { value: number } };
  private visibleCount: number;
  private elapsed: number = 0;

  constructor(scene: THREE.Scene, initialDensity: number = 0.6) {
    this.visibleCount = Math.floor(MAX_PARTICLES * initialDensity);

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.basePositions = new Float32Array(MAX_PARTICLES * 3);
    this.baseColors = new Float32Array(MAX_PARTICLES * 3);
    this.thetas = new Float32Array(MAX_PARTICLES);
    this.phis = new Float32Array(MAX_PARTICLES);
    this.rhos = new Float32Array(MAX_PARTICLES);

    this.generateParticles();

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDist = -mvPosition.z;
          gl_PointSize = aSize * (250.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          alpha = pow(alpha, 1.6);
          float fog = smoothstep(180.0, 30.0, vDist);
          gl_FragColor = vec4(vColor * 1.2, alpha * fog);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(geometry, material);
    scene.add(this.mesh);

    this.lightLinesGroup = new THREE.Group();
    this.lightLineUniforms = { uTime: { value: 0 } };
    this.createLightLines();
    scene.add(this.lightLinesGroup);
  }

  private generateParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const rho = MINOR_RADIUS * Math.sqrt(Math.random()) * 0.95;

      this.thetas[i] = theta;
      this.phis[i] = phi;
      this.rhos[i] = rho;

      const [x, y, z] = getTorusPoint(theta, phi, rho);
      const i3 = i * 3;
      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      const t = theta / (Math.PI * 2);
      const [r, g, b] = corridorColor(t);
      this.baseColors[i3] = r;
      this.baseColors[i3 + 1] = g;
      this.baseColors[i3 + 2] = b;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.colors[i3] = r;
      this.colors[i3 + 1] = g;
      this.colors[i3 + 2] = b;

      this.sizes[i] = i < this.visibleCount
        ? 1.0 + Math.random() * 2.0
        : 0;
    }
  }

  private createLightLines(): void {
    const lineCount = 6;
    const segmentsPerLine = 600;
    const phiOffsets = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];

    for (let l = 0; l < lineCount; l++) {
      const positions = new Float32Array(segmentsPerLine * 3);
      const lineParams = new Float32Array(segmentsPerLine);

      for (let s = 0; s < segmentsPerLine; s++) {
        const theta = (s / segmentsPerLine) * Math.PI * 2;
        const phi = phiOffsets[l] + theta * 0.5;
        const rho = MINOR_RADIUS * 0.9;
        const [x, y, z] = getTorusPoint(theta, phi, rho);
        const s3 = s * 3;
        positions[s3] = x;
        positions[s3 + 1] = y;
        positions[s3 + 2] = z;
        lineParams[s] = s / segmentsPerLine;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('aLineParam', new THREE.BufferAttribute(lineParams, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.lightLineUniforms.uTime,
        },
        vertexShader: `
          attribute float aLineParam;
          varying float vLineParam;
          void main() {
            vLineParam = aLineParam;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying float vLineParam;
          void main() {
            float flow = fract(vLineParam * 5.0 - uTime * 0.3);
            float brightness = smoothstep(0.0, 0.25, flow) * smoothstep(1.0, 0.75, flow);
            brightness = pow(brightness, 0.8);
            vec3 c1 = vec3(0.15, 0.3, 0.9);
            vec3 c2 = vec3(0.7, 0.15, 0.6);
            vec3 c3 = vec3(0.9, 0.55, 0.15);
            vec3 color;
            if (vLineParam < 0.33) {
              color = mix(c1, c2, vLineParam / 0.33);
            } else if (vLineParam < 0.67) {
              color = mix(c2, c3, (vLineParam - 0.33) / 0.34);
            } else {
              color = mix(c3, c1, (vLineParam - 0.67) / 0.33);
            }
            gl_FragColor = vec4(color * brightness * 2.0, brightness * 0.6);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geom, mat);
      this.lightLinesGroup.add(line);
    }
  }

  addShockwave(center: THREE.Vector3, strength: number = 1.0): void {
    this.shockwaves.push({
      center: center.clone(),
      radius: 0,
      maxRadius: MINOR_RADIUS * 2.5,
      strength,
      age: 0,
      lifetime: 2.0,
    });
  }

  setDensity(ratio: number): void {
    this.visibleCount = Math.floor(MAX_PARTICLES * ratio);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.sizes[i] = i < this.visibleCount
        ? 1.0 + Math.random() * 2.0
        : 0;
    }
    const attr = this.mesh.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  update(deltaTime: number, corridorState: CorridorState): void {
    this.elapsed += deltaTime;
    this.lightLineUniforms.uTime.value = this.elapsed;

    for (let w = this.shockwaves.length - 1; w >= 0; w--) {
      const sw = this.shockwaves[w];
      sw.age += deltaTime;
      sw.radius = (sw.age / sw.lifetime) * sw.maxRadius;
      if (sw.age >= sw.lifetime) {
        this.shockwaves.splice(w, 1);
      }
    }

    const distortion = corridorState.distortionAmount;
    const rotAngle = corridorState.rotationAngle;

    for (let i = 0; i < this.visibleCount; i++) {
      const i3 = i * 3;
      let px = this.basePositions[i3];
      let py = this.basePositions[i3 + 1];
      let pz = this.basePositions[i3 + 2];
      let cr = this.baseColors[i3];
      let cg = this.baseColors[i3 + 1];
      let cb = this.baseColors[i3 + 2];

      if (distortion > 0.001) {
        const theta = this.thetas[i];
        const phi = this.phis[i];
        const warp = Math.sin(theta * 3 + this.elapsed * 1.5) * distortion * 0.8;
        const nx = Math.cos(phi) * Math.cos(theta);
        const ny = Math.sin(phi);
        const nz = Math.cos(phi) * Math.sin(theta);
        px += nx * warp;
        py += ny * warp;
        pz += nz * warp;
      }

      for (let w = 0; w < this.shockwaves.length; w++) {
        const sw = this.shockwaves[w];
        const dx = px - sw.center.x;
        const dy = py - sw.center.y;
        const dz = pz - sw.center.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < sw.radius && dist > 0.01) {
          const life = 1 - sw.age / sw.lifetime;
          const proximity = 1 - dist / sw.radius;
          const force = proximity * life * sw.strength * 2.0;
          const invDist = 1 / dist;
          px += dx * invDist * force * 3.0;
          py += dy * invDist * force * 3.0;
          pz += dz * invDist * force * 3.0;

          const colorMix = proximity * life * 0.8;
          cr = cr * (1 - colorMix) + 1.0 * colorMix;
          cg = cg * (1 - colorMix) + 0.9 * colorMix;
          cb = cb * (1 - colorMix) + 0.6 * colorMix;
        }
      }

      this.positions[i3] = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;
      this.colors[i3] = cr;
      this.colors[i3 + 1] = cg;
      this.colors[i3 + 2] = cb;
    }

    const posAttr = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.mesh.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    this.mesh.rotation.y = rotAngle;
    this.lightLinesGroup.rotation.y = rotAngle;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
    this.lightLinesGroup.children.forEach((child) => {
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.ShaderMaterial).dispose();
      }
    });
  }
}
