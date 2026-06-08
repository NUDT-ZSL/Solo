import * as THREE from 'three';

const SPHERE_RADIUS = 1.8;
const SEGMENTS_PER_STRAND = 20;
const LATITUDE_COUNT = 16;
const LONGITUDE_COUNT = 24;
const PARTICLE_COUNT = 2800;
const TIDAL_PERIOD = 8.0;
const TIDAL_AMPLITUDE = 0.15;

interface RippleState {
  origin: THREE.Vector3;
  startTime: number;
  duration: number;
}

interface ShockwaveState {
  origin: THREE.Vector3;
  startTime: number;
  duration: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private lightNetGroup: THREE.Group;
  private strands: THREE.Line[] = [];
  private strandOriginalPositions: Float32Array[] = [];
  private nodes: THREE.Mesh[] = [];
  private nodeOriginalPositions: THREE.Vector3[] = [];
  private particles: THREE.Points;
  private particleVelocities: Float32Array;
  private particleOriginalPositions: Float32Array;
  private glowMesh: THREE.Mesh | null = null;
  private backgroundMesh: THREE.Mesh;

  private tidalSpeed: number = 1.0;
  private brightness: number = 1.0;
  private particleSpeed: number = 1.0;
  private glowEnabled: boolean = true;

  private ripples: RippleState[] = [];
  private shockwaves: ShockwaveState[] = [];

  private currentTidalPhase: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lightNetGroup = new THREE.Group();
    this.scene.add(this.lightNetGroup);

    this.createBackground();
    this.createLightNet();
    this.createNodes();
    this.createParticles();
    this.createGlowMesh();
    this.createAmbientLight();
  }

  private createBackground(): void {
    const bgGeom = new THREE.SphereGeometry(50, 32, 32);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uColor1: { value: new THREE.Color(0x000000) },
        uColor2: { value: new THREE.Color(0x0a0a2e) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vWorldPos;
        void main() {
          float t = clamp((vWorldPos.y + 50.0) / 100.0, 0.0, 1.0);
          gl_FragColor = vec4(mix(uColor1, uColor2, t), 1.0);
        }
      `,
    });
    this.backgroundMesh = new THREE.Mesh(bgGeom, bgMat);
    this.scene.add(this.backgroundMesh);
  }

  private createLightNet(): void {
    for (let i = 0; i < LATITUDE_COUNT; i++) {
      const phi = (Math.PI * i) / (LATITUDE_COUNT - 1);
      const r = SPHERE_RADIUS * Math.sin(phi);
      const y = SPHERE_RADIUS * Math.cos(phi);
      this.createStrandCircle(r, y, LONGITUDE_COUNT, true);
    }

    for (let j = 0; j < LONGITUDE_COUNT; j++) {
      const theta = (2 * Math.PI * j) / LONGITUDE_COUNT;
      this.createMeridianStrand(theta);
    }
  }

  private createStrandCircle(
    radius: number,
    y: number,
    pointCount: number,
    isLatitude: boolean
  ): void {
    if (radius < 0.01) {
      return;
    }
    const positions = new Float32Array((pointCount + 1) * 3);
    const colors = new Float32Array((pointCount + 1) * 3);

    for (let i = 0; i <= pointCount; i++) {
      const theta = (2 * Math.PI * i) / pointCount;
      const idx = i * 3;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      const distFromCenter = Math.sqrt(x * x + y * y + z * z) / SPHERE_RADIUS;
      const t = Math.abs(y) / SPHERE_RADIUS;
      const warmColor = new THREE.Color(0xffcc44);
      const coolColor = new THREE.Color(0x4488ff);
      const c = warmColor.clone().lerp(coolColor, t);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    this.strands.push(line);
    this.strandOriginalPositions.push(new Float32Array(positions));
    this.lightNetGroup.add(line);
  }

  private createMeridianStrand(theta: number): void {
    const pointCount = SEGMENTS_PER_STRAND * 2;
    const positions = new Float32Array((pointCount + 1) * 3);
    const colors = new Float32Array((pointCount + 1) * 3);

    for (let i = 0; i <= pointCount; i++) {
      const phi = Math.PI * (i / pointCount);
      const idx = i * 3;
      const r = SPHERE_RADIUS * Math.sin(phi);
      const y = SPHERE_RADIUS * Math.cos(phi);
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      const t = Math.abs(y) / SPHERE_RADIUS;
      const warmColor = new THREE.Color(0xffcc44);
      const coolColor = new THREE.Color(0x4488ff);
      const c = warmColor.clone().lerp(coolColor, t);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    this.strands.push(line);
    this.strandOriginalPositions.push(new Float32Array(positions));
    this.lightNetGroup.add(line);
  }

  private createNodes(): void {
    const nodeGeom = new THREE.SphereGeometry(0.025, 8, 8);
    const intersections: Map<string, boolean> = new Map();

    for (let i = 0; i < LATITUDE_COUNT; i++) {
      const phi = (Math.PI * i) / (LATITUDE_COUNT - 1);
      const r = SPHERE_RADIUS * Math.sin(phi);
      const y = SPHERE_RADIUS * Math.cos(phi);
      if (r < 0.01) continue;

      for (let j = 0; j < LONGITUDE_COUNT; j++) {
        const theta = (2 * Math.PI * j) / LONGITUDE_COUNT;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
        if (intersections.has(key)) continue;
        intersections.set(key, true);

        const t = Math.abs(y) / SPHERE_RADIUS;
        const warmColor = new THREE.Color(0xffdd66);
        const coolColor = new THREE.Color(0x6699ff);
        const nodeColor = warmColor.clone().lerp(coolColor, t);

        const nodeMat = new THREE.MeshBasicMaterial({
          color: nodeColor,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const node = new THREE.Mesh(nodeGeom, nodeMat);
        node.position.set(x, y, z);
        node.userData.isNode = true;
        node.userData.originalColor = nodeColor.clone();
        node.userData.originalScale = 1.0;
        this.nodes.push(node);
        this.nodeOriginalPositions.push(node.position.clone());
        this.lightNetGroup.add(node);
      }
    }
  }

  private createParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    this.particleVelocities = new Float32Array(PARTICLE_COUNT * 3);
    this.particleOriginalPositions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = SPHERE_RADIUS * (0.92 + Math.random() * 0.16);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      this.particleOriginalPositions[idx] = x;
      this.particleOriginalPositions[idx + 1] = y;
      this.particleOriginalPositions[idx + 2] = z;

      const tangent = new THREE.Vector3(
        -Math.sin(theta),
        Math.cos(theta) * Math.cos(phi),
        0
      ).normalize();

      const speed = 0.2 + Math.random() * 0.3;
      this.particleVelocities[idx] = tangent.x * speed;
      this.particleVelocities[idx + 1] = tangent.y * speed;
      this.particleVelocities[idx + 2] = tangent.z * speed;

      const t = Math.abs(z) / SPHERE_RADIUS;
      const warmColor = new THREE.Color(0xffcc44);
      const coolColor = new THREE.Color(0x4488ff);
      const c = warmColor.clone().lerp(coolColor, t);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;

      sizes[i] = 1.5 + Math.random() * 2.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uBrightness: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vAlpha = clamp(1.0 - (-mvPos.z - 2.0) / 20.0, 0.3, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uBrightness;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha * uBrightness;
          vec3 core = vColor * 2.0 * uBrightness;
          vec3 trail = vColor * uBrightness;
          vec3 col = mix(trail, core, smoothstep(0.3, 0.0, d));
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.lightNetGroup.add(this.particles);
  }

  private createGlowMesh(): void {
    const glowGeom = new THREE.SphereGeometry(SPHERE_RADIUS * 1.05, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: new THREE.Color(0xffcc44) },
        uColor2: { value: new THREE.Color(0x4488ff) },
        uOpacity: { value: 0.12 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float t = abs(vPosition.y) / ${SPHERE_RADIUS.toFixed(1)};
          vec3 col = mix(uColor1, uColor2, t);
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          gl_FragColor = vec4(col, fresnel * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    });

    this.glowMesh = new THREE.Mesh(glowGeom, glowMat);
    this.lightNetGroup.add(this.glowMesh);
  }

  private createAmbientLight(): void {
    const ambient = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambient);
  }

  update(elapsed: number, delta: number): void {
    this.currentTidalPhase = (elapsed * this.tidalSpeed * (2 * Math.PI)) / TIDAL_PERIOD;
    const tidalScale = 1.0 + TIDAL_AMPLITUDE * Math.sin(this.currentTidalPhase);

    this.lightNetGroup.scale.setScalar(tidalScale);

    this.autoRotate(elapsed);

    this.updateStrandFlow(elapsed);

    this.updateParticles(elapsed, delta, tidalScale);

    this.updateRipples(elapsed);

    this.updateShockwaves(elapsed, tidalScale);

    this.updateGlow(tidalScale);

    this.updateBrightness();
  }

  private autoRotate(elapsed: number): void {
    this.lightNetGroup.rotation.y = elapsed * 0.05;
  }

  private updateStrandFlow(elapsed: number): void {
    for (let s = 0; s < this.strands.length; s++) {
      const strand = this.strands[s];
      const posAttr = strand.geometry.getAttribute('position') as THREE.BufferAttribute;
      const origPositions = this.strandOriginalPositions[s];
      const positions = posAttr.array as Float32Array;
      const vertexCount = positions.length / 3;

      for (let i = 0; i < vertexCount; i++) {
        const idx = i * 3;
        const ox = origPositions[idx];
        const oy = origPositions[idx + 1];
        const oz = origPositions[idx + 2];

        const flowOffset = Math.sin(elapsed * 2.0 + i * 0.5 + s * 0.3) * 0.008;
        positions[idx] = ox + flowOffset;
        positions[idx + 1] = oy + flowOffset * 0.5;
        positions[idx + 2] = oz + flowOffset * 0.7;
      }

      posAttr.needsUpdate = true;
    }
  }

  private updateParticles(elapsed: number, delta: number, tidalScale: number): void {
    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const speedMultiplier = this.particleSpeed * (1.0 + 0.3 * Math.sin(this.currentTidalPhase));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;

      let px = positions[idx];
      let py = positions[idx + 1];
      let pz = positions[idx + 2];

      px += this.particleVelocities[idx] * delta * speedMultiplier;
      py += this.particleVelocities[idx + 1] * delta * speedMultiplier;
      pz += this.particleVelocities[idx + 2] * delta * speedMultiplier;

      const dist = Math.sqrt(px * px + py * py + pz * pz);
      const maxDist = SPHERE_RADIUS * tidalScale * 1.12;
      const minDist = SPHERE_RADIUS * tidalScale * 0.88;

      if (dist > maxDist || dist < minDist) {
        const ox = this.particleOriginalPositions[idx];
        const oy = this.particleOriginalPositions[idx + 1];
        const oz = this.particleOriginalPositions[idx + 2];
        px = ox * tidalScale;
        py = oy * tidalScale;
        pz = oz * tidalScale;

        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const tangent = new THREE.Vector3(
          -Math.sin(theta),
          Math.cos(theta) * Math.cos(phi),
          0
        ).normalize();
        const speed = 0.2 + Math.random() * 0.3;
        this.particleVelocities[idx] = tangent.x * speed;
        this.particleVelocities[idx + 1] = tangent.y * speed;
        this.particleVelocities[idx + 2] = tangent.z * speed;
      }

      positions[idx] = px;
      positions[idx + 1] = py;
      positions[idx + 2] = pz;
    }

    posAttr.needsUpdate = true;
  }

  private updateRipples(elapsed: number): void {
    const toRemove: number[] = [];

    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const ripple = this.ripples[r];
      const progress = (elapsed - ripple.startTime) / ripple.duration;

      if (progress >= 1.0) {
        toRemove.push(r);
        continue;
      }

      const rippleRadius = progress * SPHERE_RADIUS * 1.5;
      const fadeOut = 1.0 - progress;

      for (const node of this.nodes) {
        const dist = node.position.distanceTo(ripple.origin);
        const distFromWave = Math.abs(dist - rippleRadius);
        const waveWidth = 0.4;
        if (distFromWave < waveWidth) {
          const intensity = (1.0 - distFromWave / waveWidth) * fadeOut;
          const origColor = node.userData.originalColor as THREE.Color;
          const mat = node.material as THREE.MeshBasicMaterial;
          mat.color.copy(origColor).lerp(new THREE.Color(0xffffff), intensity * 0.7);
          mat.opacity = 0.9 + intensity * 0.1;
          node.scale.setScalar(1.0 + intensity * 0.5);
        }
      }

      for (let s = 0; s < this.strands.length; s++) {
        const strand = this.strands[s];
        const posAttr = strand.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;
        const origPositions = this.strandOriginalPositions[s];
        const vertexCount = positions.length / 3;

        for (let i = 0; i < vertexCount; i++) {
          const idx = i * 3;
          const px = positions[idx];
          const py = positions[idx + 1];
          const pz = positions[idx + 2];
          const pos = new THREE.Vector3(px, py, pz);
          const dist = pos.distanceTo(ripple.origin);
          const distFromWave = Math.abs(dist - rippleRadius);

          if (distFromWave < waveWidth) {
            const intensity = (1.0 - distFromWave / waveWidth) * fadeOut;
            const direction = pos.clone().sub(ripple.origin).normalize();
            positions[idx] += direction.x * intensity * 0.03;
            positions[idx + 1] += direction.y * intensity * 0.03;
            positions[idx + 2] += direction.z * intensity * 0.03;
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    for (const idx of toRemove) {
      this.ripples.splice(idx, 1);
    }
  }

  private updateShockwaves(elapsed: number, tidalScale: number): void {
    const toRemove: number[] = [];

    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      const progress = (elapsed - sw.startTime) / sw.duration;

      if (progress >= 1.0) {
        toRemove.push(s);
        continue;
      }

      const waveRadius = progress * SPHERE_RADIUS * 2.5 * tidalScale;
      const fadeOut = 1.0 - progress;

      for (let si = 0; si < this.strands.length; si++) {
        const strand = this.strands[si];
        const posAttr = strand.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;
        const vertexCount = positions.length / 3;

        for (let i = 0; i < vertexCount; i++) {
          const idx = i * 3;
          const px = positions[idx];
          const py = positions[idx + 1];
          const pz = positions[idx + 2];
          const pos = new THREE.Vector3(px, py, pz);
          const dist = pos.distanceTo(sw.origin);
          const distFromWave = Math.abs(dist - waveRadius);
          const waveWidth = 0.8;

          if (distFromWave < waveWidth) {
            const intensity = (1.0 - distFromWave / waveWidth) * fadeOut;
            const direction = pos.clone().normalize();
            positions[idx] += direction.x * intensity * 0.06;
            positions[idx + 1] += direction.y * intensity * 0.06;
            positions[idx + 2] += direction.z * intensity * 0.06;
          }
        }
        posAttr.needsUpdate = true;
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;
        const px = positions[idx];
        const py = positions[idx + 1];
        const pz = positions[idx + 2];
        const pos = new THREE.Vector3(px, py, pz);
        const dist = pos.distanceTo(sw.origin);
        const distFromWave = Math.abs(dist - waveRadius);

        if (distFromWave < waveWidth && dist > 0.01) {
          const intensity = (1.0 - distFromWave / waveWidth) * fadeOut;
          const direction = pos.clone().normalize();
          this.particleVelocities[idx] += direction.x * intensity * 0.5 * fadeOut;
          this.particleVelocities[idx + 1] += direction.y * intensity * 0.5 * fadeOut;
          this.particleVelocities[idx + 2] += direction.z * intensity * 0.5 * fadeOut;
        }
      }
    }

    for (const idx of toRemove) {
      this.shockwaves.splice(idx, 1);
    }
  }

  private updateGlow(tidalScale: number): void {
    if (this.glowMesh) {
      this.glowMesh.visible = this.glowEnabled;
      if (this.glowEnabled) {
        this.glowMesh.scale.setScalar(tidalScale);
      }
    }
  }

  private updateBrightness(): void {
    for (const strand of this.strands) {
      const mat = strand.material as THREE.LineBasicMaterial;
      mat.opacity = 0.5 * this.brightness;
    }

    for (const node of this.nodes) {
      const mat = node.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 * this.brightness;
    }

    if (this.glowMesh) {
      const mat = this.glowMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = 0.12 * this.brightness;
    }

    const particleMat = this.particles.material as THREE.ShaderMaterial;
    particleMat.uniforms.uBrightness.value = this.brightness;
  }

  triggerRipple(origin: THREE.Vector3): void {
    const localOrigin = this.lightNetGroup.worldToLocal(origin.clone());
    this.ripples.push({
      origin: localOrigin,
      startTime: performance.now() / 1000,
      duration: 2.0,
    });
  }

  triggerShockwave(origin: THREE.Vector3): void {
    const localOrigin = this.lightNetGroup.worldToLocal(origin.clone());
    this.shockwaves.push({
      origin: localOrigin,
      startTime: performance.now() / 1000,
      duration: 3.0,
    });
  }

  findNearestNode(worldPoint: THREE.Vector3): THREE.Mesh | null {
    let closest: THREE.Mesh | null = null;
    let minDist = Infinity;

    for (const node of this.nodes) {
      const worldPos = new THREE.Vector3();
      node.getWorldPosition(worldPos);
      const dist = worldPos.distanceTo(worldPoint);
      if (dist < minDist) {
        minDist = dist;
        closest = node;
      }
    }

    if (closest && minDist < 0.5) {
      return closest;
    }
    return null;
  }

  getNodes(): THREE.Mesh[] {
    return this.nodes;
  }

  getLightNetGroup(): THREE.Group {
    return this.lightNetGroup;
  }

  setTidalSpeed(v: number): void {
    this.tidalSpeed = v;
  }

  setBrightness(v: number): void {
    this.brightness = v;
  }

  setParticleSpeed(v: number): void {
    this.particleSpeed = v;
  }

  setGlowEnabled(v: boolean): void {
    this.glowEnabled = v;
  }
}
