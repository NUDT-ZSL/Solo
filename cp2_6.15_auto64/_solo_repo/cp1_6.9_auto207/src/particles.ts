import * as THREE from 'three';
import { RainbowBridge } from './bridge';

interface GlidingDot {
  progress: number;
  speed: number;
  widthT: number;
  acceleration: number;
  direction: number;
  baseColor: THREE.Color;
  trail: THREE.Vector3[];
  trailMaxLength: number;
  active: boolean;
  age: number;
  lifetime: number;
  spawnTimer: number;
  particleSpawnRate: number;
}

interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  angularVelocity: number;
  type: 'dot' | 'poly';
  sides: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private bridge: RainbowBridge | null = null;

  private glidingDots: GlidingDot[] = [];
  private burstParticles: BurstParticle[] = [];

  private gliderGeometry!: THREE.SphereGeometry;
  private gliderMaterial!: THREE.ShaderMaterial;
  private gliderMesh!: THREE.InstancedMesh;
  private maxGliders = 16;

  private trailGeometry!: THREE.BufferGeometry;
  private trailMaterial!: THREE.ShaderMaterial;
  private trailLines!: THREE.LineSegments;
  private maxTrailPoints = 800;

  private burstGeometry!: THREE.BufferGeometry;
  private burstMaterial!: THREE.ShaderMaterial;
  private burstPoints!: THREE.Points;
  private maxBurstParticles = 1000;

  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();

  private burstPolyMeshes: THREE.InstancedMesh[] = [];
  private maxPolyPerType = 200;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.build();
  }

  setBridge(bridge: RainbowBridge) {
    this.bridge = bridge;
  }

  private build() {
    this.gliderGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    this.gliderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vInstanceColor;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vInstanceColor = instanceColor;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vInstanceColor;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
          vec3 emissive = vInstanceColor * (1.5 + fresnel * 2.0);
          float pulse = sin(uTime * 8.0) * 0.2 + 0.8;
          gl_FragColor = vec4(emissive * pulse, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.gliderMesh = new THREE.InstancedMesh(
      this.gliderGeometry,
      this.gliderMaterial,
      this.maxGliders
    );
    this.gliderMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const instColors = new Float32Array(this.maxGliders * 3);
    this.gliderMesh.instanceColor = new THREE.InstancedBufferAttribute(instColors, 3);
    this.gliderMesh.count = 0;
    this.scene.add(this.gliderMesh);

    this.trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(this.maxTrailPoints * 2 * 3);
    const trailColors = new Float32Array(this.maxTrailPoints * 2 * 3);
    const trailAlphas = new Float32Array(this.maxTrailPoints * 2);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    this.trailGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(trailAlphas, 1));

    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(vColor, vAlpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailLines);

    this.burstGeometry = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(this.maxBurstParticles * 3);
    const burstColors = new Float32Array(this.maxBurstParticles * 3);
    const burstSizes = new Float32Array(this.maxBurstParticles);
    const burstAlphas = new Float32Array(this.maxBurstParticles);
    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
    this.burstGeometry.setAttribute('color', new THREE.BufferAttribute(burstColors, 3));
    this.burstGeometry.setAttribute('aSize', new THREE.BufferAttribute(burstSizes, 1));
    this.burstGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(burstAlphas, 1));

    this.burstMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = aSize * (200.0 / dist) * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          vec3 col = vColor * (0.8 + smoothstep(0.5, 0.1, d) * 0.6);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.burstPoints = new THREE.Points(this.burstGeometry, this.burstMaterial);
    this.scene.add(this.burstPoints);

    this.createPolyMeshes();
  }

  private createPolyMeshes() {
    const sides = [3, 4, 5, 6];
    for (const s of sides) {
      const shape = new THREE.Shape();
      const angleStep = (Math.PI * 2) / s;
      for (let i = 0; i <= s; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
          varying vec3 vInstanceColor;
          varying vec2 vUv;
          void main() {
            vInstanceColor = instanceColor;
            vUv = uv;
            vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec3 vInstanceColor;
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vec2 c = vUv - 0.5;
            float d = length(c);
            float edge = smoothstep(0.5, 0.42, d);
            float glow = smoothstep(0.5, 0.3, d) * 0.4;
            vec3 col = vInstanceColor * (edge + glow);
            gl_FragColor = vec4(col, edge);
          }
        `
      });
      const mesh = new THREE.InstancedMesh(geo, mat, this.maxPolyPerType);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const instC = new Float32Array(this.maxPolyPerType * 3);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(instC, 3);
      mesh.count = 0;
      this.burstPolyMeshes.push(mesh);
      this.scene.add(mesh);
    }
  }

  spawnGlider(startArcT: number, startWidthT: number, baseColor: THREE.Color) {
    if (!this.bridge) return;

    const dir = Math.random() < 0.5 ? -1 : 1;
    const glider: GlidingDot = {
      progress: startArcT,
      speed: 0.25,
      widthT: startWidthT,
      acceleration: 1.8,
      direction: dir,
      baseColor: baseColor.clone(),
      trail: [],
      trailMaxLength: 60,
      active: true,
      age: 0,
      lifetime: 2.2,
      spawnTimer: 0,
      particleSpawnRate: 0.008
    };

    this.glidingDots.push(glider);

    for (let i = 0; i < 30; i++) {
      const p = this.bridge.sampleSurface(startArcT, startWidthT);
      this.spawnBurstAt(p, baseColor, 0.6);
    }
  }

  private spawnBurstAt(pos: THREE.Vector3, baseColor: THREE.Color, intensity: number = 1) {
    const count = Math.floor(8 + Math.random() * 10 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.burstParticles.length >= this.maxBurstParticles * 0.9) break;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = (0.5 + Math.random() * 3) * intensity;
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      const color = baseColor.clone();
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      color.setHSL(
        hsl.h + (Math.random() - 0.5) * 0.1,
        Math.min(1, hsl.s + 0.1),
        Math.min(1, hsl.l + (Math.random() - 0.3) * 0.2)
      );

      const maxLife = 0.4 + Math.random() * 0.8;
      const isPoly = Math.random() < 0.25;

      this.burstParticles.push({
        position: pos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        )),
        velocity: vel,
        color,
        size: 0.05 + Math.random() * 0.12 * intensity,
        life: maxLife,
        maxLife,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 8,
        type: isPoly ? 'poly' : 'dot',
        sides: Math.floor(Math.random() * 4)
      });
    }
  }

  update(delta: number) {
    if (!this.bridge) return;

    this.gliderMaterial.uniforms.uTime.value += delta;
    for (const mesh of this.burstPolyMeshes) {
      (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value += delta;
    }

    for (const g of this.glidingDots) {
      if (!g.active) continue;

      g.age += delta;
      g.speed += g.acceleration * delta;
      const step = g.speed * delta * g.direction;
      g.progress = THREE.MathUtils.clamp(g.progress + step, 0.01, 0.99);

      if (g.progress <= 0.02 || g.progress >= 0.98 || g.age >= g.lifetime) {
        g.active = false;
        const endPos = this.bridge.sampleSurface(g.progress, g.widthT);
        for (let i = 0; i < 50; i++) {
          this.spawnBurstAt(endPos, g.baseColor, 1.2);
        }
      }

      const curPos = this.bridge.sampleSurface(g.progress, g.widthT);
      g.trail.unshift(curPos.clone());
      if (g.trail.length > g.trailMaxLength) {
        g.trail.pop();
      }

      g.spawnTimer += delta;
      while (g.spawnTimer >= g.particleSpawnRate && g.active) {
        g.spawnTimer -= g.particleSpawnRate;
        this.spawnBurstAt(curPos, g.baseColor, 0.3);
      }
    }

    this.glidingDots = this.glidingDots.filter(g => g.active || g.trail.length > 2);
    this.updateGliderRender();
    this.updateTrailRender();

    for (const p of this.burstParticles) {
      p.life -= delta;
      p.velocity.multiplyScalar(0.96);
      p.velocity.y -= 0.5 * delta;
      p.position.addScaledVector(p.velocity, delta);
      p.rotation += p.angularVelocity * delta;
    }
    this.burstParticles = this.burstParticles.filter(p => p.life > 0);
    this.updateBurstRender();
  }

  private updateGliderRender() {
    const active = this.glidingDots.filter(g => g.active);
    this.gliderMesh.count = Math.min(active.length, this.maxGliders);

    for (let i = 0; i < this.gliderMesh.count; i++) {
      const g = active[i];
      if (!this.bridge) continue;
      const pos = this.bridge.sampleSurface(g.progress, g.widthT);
      const scale = 0.8 + (g.age / g.lifetime) * 0.8;
      this.dummy.position.copy(pos);
      this.dummy.scale.setScalar(scale);
      this.dummy.rotation.set(0, 0, Math.random() * Math.PI);
      this.dummy.updateMatrix();
      this.gliderMesh.setMatrixAt(i, this.dummy.matrix);

      const color = g.baseColor;
      this.tempColor.copy(color);
      this.tempColor.lerp(new THREE.Color(0xffffff), 0.3);
      this.gliderMesh.setColorAt(i, this.tempColor);
    }

    this.gliderMesh.instanceMatrix.needsUpdate = true;
    if (this.gliderMesh.instanceColor) {
      (this.gliderMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    }
  }

  private updateTrailRender() {
    const positions = this.trailGeometry.attributes.position as THREE.BufferAttribute;
    const colors = this.trailGeometry.attributes.color as THREE.BufferAttribute;
    const alphas = this.trailGeometry.attributes.aAlpha as THREE.BufferAttribute;

    let lineIndex = 0;
    const maxLines = this.maxTrailPoints;

    for (const g of this.glidingDots) {
      if (g.trail.length < 2) continue;
      for (let i = 0; i < g.trail.length - 1 && lineIndex < maxLines; i++) {
        const p1 = g.trail[i];
        const p2 = g.trail[i + 1];
        const t = i / (g.trail.length - 1);
        const alpha = (1 - t) * (g.active ? 0.9 : Math.max(0, 1 - (1 - t) * 2));
        const fade = Math.pow(1 - t, 1.5);

        positions.setXYZ(lineIndex * 2, p1.x, p1.y, p1.z);
        positions.setXYZ(lineIndex * 2 + 1, p2.x, p2.y, p2.z);

        const c = g.baseColor;
        const brightness = 0.7 + fade * 0.6;
        colors.setXYZ(lineIndex * 2, c.r * brightness, c.g * brightness, c.b * brightness);
        colors.setXYZ(lineIndex * 2 + 1, c.r * brightness * 0.9, c.g * brightness * 0.9, c.b * brightness * 0.9);

        alphas.setXY(lineIndex * 2, alpha, alpha * 0.9);

        lineIndex++;
      }
    }

    for (let i = lineIndex; i < maxLines; i++) {
      positions.setXYZ(i * 2, 0, 0, 0);
      positions.setXYZ(i * 2 + 1, 0, 0, 0);
      alphas.setXY(i * 2, 0, 0);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    alphas.needsUpdate = true;
    (this.trailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateBurstRender() {
    const positions = this.burstGeometry.attributes.position as THREE.BufferAttribute;
    const colors = this.burstGeometry.attributes.color as THREE.BufferAttribute;
    const sizes = this.burstGeometry.attributes.aSize as THREE.BufferAttribute;
    const alphas = this.burstGeometry.attributes.aAlpha as THREE.BufferAttribute;

    const dots = this.burstParticles.filter(p => p.type === 'dot');
    const renderCount = Math.min(dots.length, this.maxBurstParticles);

    for (let i = 0; i < renderCount; i++) {
      const p = dots[i];
      const t = p.life / p.maxLife;
      positions.setXYZ(i, p.position.x, p.position.y, p.position.z);
      colors.setXYZ(i, p.color.r, p.color.g, p.color.b);
      sizes.setX(i, p.size * (0.5 + t * 0.8));
      alphas.setX(i, t);
    }

    for (let i = renderCount; i < this.maxBurstParticles; i++) {
      positions.setXYZ(i, 0, -1000, 0);
      alphas.setX(i, 0);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;

    const polys = this.burstParticles.filter(p => p.type === 'poly');
    const polyBySide: BurstParticle[][] = [[], [], [], []];
    for (const p of polys) polyBySide[p.sides].push(p);

    for (let si = 0; si < 4; si++) {
      const mesh = this.burstPolyMeshes[si];
      const list = polyBySide[si];
      const cnt = Math.min(list.length, this.maxPolyPerType);
      mesh.count = cnt;
      for (let i = 0; i < cnt; i++) {
        const p = list[i];
        const t = p.life / p.maxLife;
        this.dummy.position.copy(p.position);
        const s = p.size * 6 * (0.5 + t * 0.8);
        this.dummy.scale.set(s, s, s);
        this.dummy.rotation.z = p.rotation;
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        mesh.setColorAt(i, p.color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        (mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
      }
    }
  }
}
