import * as THREE from 'three';
import { CelestialBodyData } from './AudioSynth';

const STAR_NAMES = ['天狼主序', '红巨星·参宿四', '蓝超巨星·猎户座', '黄矮星·太阳型', '白矮星·天狼B', '红矮星·比邻星', '脉动星·造父一', '巨星·大角星'];
const PLANET_NAMES = ['冰霜世界', '熔岩行星', '气态巨行星', '海洋行星', '沙漠行星', '风暴巨行星', '结晶行星', '暗影行星'];
const NEBULA_NAMES = ['猎户座星云', '鹰状星云', '蟹状星云', '环状星云', '玫瑰星云', '三叶星云', '马头星云', '面纱星云'];

const SPECTRAL_STARS: Record<string, { color: THREE.Color; temp: number; mass: number }> = {
  'O': { color: new THREE.Color(0.6, 0.7, 1.0), temp: 30000, mass: 40 },
  'B': { color: new THREE.Color(0.7, 0.8, 1.0), temp: 20000, mass: 10 },
  'A': { color: new THREE.Color(0.9, 0.9, 1.0), temp: 9000, mass: 2.5 },
  'F': { color: new THREE.Color(1.0, 1.0, 0.9), temp: 7000, mass: 1.4 },
  'G': { color: new THREE.Color(1.0, 0.95, 0.7), temp: 5500, mass: 1.0 },
  'K': { color: new THREE.Color(1.0, 0.8, 0.5), temp: 4000, mass: 0.7 },
  'M': { color: new THREE.Color(1.0, 0.5, 0.3), temp: 3000, mass: 0.3 },
};

const SPECTRAL_KEYS = Object.keys(SPECTRAL_STARS);

interface CelestialBody {
  data: CelestialBodyData;
  mesh: THREE.Object3D;
  glowMesh?: THREE.Object3D;
  originalScale: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface GravityWave {
  ring: THREE.Mesh;
  birth: number;
  lifetime: number;
  color: THREE.Color;
  position: THREE.Vector3;
}

export class CosmicEngine {
  private scene: THREE.Scene;
  private bodies: CelestialBody[] = [];
  private gravityWaves: GravityWave[] = [];
  private bodyGroup: THREE.Group;
  private waveGroup: THREE.Group;
  private bgMesh: THREE.Mesh | null = null;
  private starParticles: THREE.Points | null = null;
  private nebulaMeshes: THREE.Mesh[] = [];
  private clock = new THREE.Clock();

  roamSpeed = 1.0;
  signalStrength = 1.0;
  starDensity = 1.0;

  onBodyClicked: ((data: CelestialBodyData) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.bodyGroup = new THREE.Group();
    this.waveGroup = new THREE.Group();
    scene.add(this.bodyGroup);
    scene.add(this.waveGroup);
  }

  build() {
    this.createBackground();
    this.createStarField();
    this.generateBodies();
  }

  rebuild() {
    while (this.bodyGroup.children.length > 0) {
      const c = this.bodyGroup.children[0];
      this.bodyGroup.remove(c);
      this.disposeObject(c);
    }
    this.bodies = [];
    if (this.starParticles) {
      this.scene.remove(this.starParticles);
      this.disposeObject(this.starParticles);
      this.starParticles = null;
    }
    this.nebulaMeshes = [];
    this.createStarField();
    this.generateBodies();
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        const mat = (child as any).material;
        if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
        else mat.dispose();
      }
    });
  }

  private createBackground() {
    const geo = new THREE.SphereGeometry(500, 32, 32);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform float uTime;
        void main() {
          float y = normalize(vWorldPos).y;
          vec3 deepPurple = vec3(0.04, 0.01, 0.08);
          vec3 deepBlue = vec3(0.02, 0.03, 0.1);
          vec3 black = vec3(0.005, 0.005, 0.015);
          float t = y * 0.5 + 0.5;
          vec3 col = mix(black, mix(deepBlue, deepPurple, smoothstep(0.3, 0.8, t)), smoothstep(0.0, 0.6, t));
          float shimmer = sin(vWorldPos.x * 0.01 + uTime * 0.05) * sin(vWorldPos.z * 0.01 + uTime * 0.03) * 0.003;
          col += shimmer;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.bgMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.bgMesh);
  }

  private createStarField() {
    const count = Math.floor(3000 * this.starDensity);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 2.0;
      const spec = SPECTRAL_KEYS[Math.floor(Math.random() * SPECTRAL_KEYS.length)];
      const c = SPECTRAL_STARS[spec].color;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: window.devicePixelRatio },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 aColor;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          float twinkle = sin(uTime * (1.5 + aPhase) + aPhase * 6.28) * 0.3 + 0.7;
          vAlpha = twinkle;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float glow = exp(-d * d * 3.0);
          if (glow < 0.01) discard;
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
    });

    this.starParticles = new THREE.Points(geo, mat);
    this.scene.add(this.starParticles);
  }

  private generateBodies() {
    const density = this.starDensity;
    const starCount = Math.floor(8 * density);
    const planetCount = Math.floor(8 * density);
    const nebulaCount = Math.floor(4 * density);

    for (let i = 0; i < starCount; i++) {
      this.createStar(i, starCount);
    }
    for (let i = 0; i < planetCount; i++) {
      this.createPlanet(i, planetCount);
    }
    for (let i = 0; i < nebulaCount; i++) {
      this.createNebula(i, nebulaCount);
    }
  }

  private createStar(index: number, total: number) {
    const specKey = SPECTRAL_KEYS[index % SPECTRAL_KEYS.length];
    const spec = SPECTRAL_STARS[specKey];
    const name = STAR_NAMES[index % STAR_NAMES.length];
    const pos = this.randomPosition(20, 120);

    const radius = 0.6 + spec.mass * 0.04;

    const geo = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshBasicMaterial({ color: spec.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);

    const glowGeo = new THREE.SphereGeometry(radius * 2.5, 24, 24);
    const glowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: spec.color },
        uTime: { value: 0 },
        uPhase: { value: Math.random() * Math.PI * 2 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uPhase;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          float pulse = sin(uTime * 2.0 + uPhase) * 0.15 + 0.85;
          float alpha = pow(rim, 2.0) * 0.6 * pulse;
          gl_FragColor = vec4(uColor * 1.5, alpha);
        }
      `,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.copy(pos);

    this.bodyGroup.add(mesh);
    this.bodyGroup.add(glowMesh);

    const data: CelestialBodyData = {
      id: `star-${index}`,
      name,
      type: 'star',
      spectralType: specKey + '型',
      mass: parseFloat((spec.mass * (0.8 + Math.random() * 0.4)).toFixed(2)),
      temperature: Math.floor(spec.temp * (0.9 + Math.random() * 0.2)),
      description: `${specKey}型光谱恒星，表面温度约${Math.floor(spec.temp)}K`,
    };

    mesh.userData = { bodyId: data.id };
    glowMesh.userData = { bodyId: data.id };

    this.bodies.push({
      data,
      mesh,
      glowMesh,
      originalScale: radius,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 1 + Math.random() * 2,
    });
  }

  private createPlanet(index: number, total: number) {
    const hues = [0.55, 0.05, 0.08, 0.5, 0.1, 0.07, 0.75, 0.6];
    const hue = hues[index % hues.length];
    const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
    const name = PLANET_NAMES[index % PLANET_NAMES.length];
    const pos = this.randomPosition(15, 100);

    const radius = 0.4 + Math.random() * 0.6;

    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.ShaderMaterial({
      transparent: false,
      uniforms: {
        uColor1: { value: color.clone() },
        uColor2: { value: color.clone().offsetHSL(0.05, 0.1, 0.2) },
        uTime: { value: 0 },
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
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        void main() {
          float mixFactor = sin(vPosition.y * 4.0 + uTime * 0.3) * 0.5 + 0.5;
          vec3 col = mix(uColor1, uColor2, mixFactor);
          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 0.5))) * 0.5 + 0.5;
          col *= light;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);

    const ringGeo = new THREE.RingGeometry(radius * 1.5, radius * 2.2, 64);
    const ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: color.clone().offsetHSL(0, -0.2, 0.3) },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float alpha = smoothstep(0.0, 0.3, dist) * (1.0 - smoothstep(0.7, 1.0, dist));
          alpha *= 0.4 + sin(uTime * 0.5) * 0.1;
          gl_FragColor = vec4(uColor, alpha * 0.5);
        }
      `,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.rotation.x = Math.PI * 0.4 + Math.random() * 0.3;

    this.bodyGroup.add(mesh);
    this.bodyGroup.add(ring);

    const temps = [200, 800, 1500, 300, 500, 1200, 400, 100];
    const data: CelestialBodyData = {
      id: `planet-${index}`,
      name,
      type: 'planet',
      spectralType: `${hue < 0.15 ? 'M' : hue < 0.3 ? 'K' : hue < 0.5 ? 'G' : 'A'}型行星`,
      mass: parseFloat((10 + Math.random() * 400).toFixed(1)),
      temperature: temps[index % temps.length] + Math.floor(Math.random() * 100),
      description: `表面温度约${temps[index % temps.length]}K的行星`,
    };

    mesh.userData = { bodyId: data.id };
    ring.userData = { bodyId: data.id };

    this.bodies.push({
      data,
      mesh,
      glowMesh: ring,
      originalScale: radius,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.5 + Math.random(),
    });
  }

  private createNebula(index: number, total: number) {
    const hue = [0.8, 0.05, 0.5, 0.15, 0.85, 0.1, 0.65, 0.3][index % 8];
    const color = new THREE.Color().setHSL(hue, 0.6, 0.4);
    const name = NEBULA_NAMES[index % NEBULA_NAMES.length];
    const pos = this.randomPosition(40, 150);

    const size = 8 + Math.random() * 15;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: color },
        uColor2: { value: color.clone().offsetHSL(0.1, 0, 0.2) },
        uTime: { value: 0 },
        uPhase: { value: Math.random() * Math.PI * 2 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform vec3 uColor2;
        uniform float uTime;
        uniform float uPhase;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float angle = atan(center.y, center.x);
          float noise1 = sin(angle * 3.0 + uTime * 0.2 + uPhase) * 0.1;
          float noise2 = cos(angle * 5.0 - uTime * 0.15 + uPhase) * 0.05;
          float shape = smoothstep(0.5, 0.1, dist + noise1 + noise2);
          float swirl = sin(dist * 10.0 - uTime * 0.3 + angle * 2.0) * 0.15 + 0.85;
          float alpha = shape * swirl * 0.35;
          vec3 col = mix(uColor, uColor2, dist * 2.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(0, 0, 0);

    this.bodyGroup.add(mesh);
    this.nebulaMeshes.push(mesh);

    const data: CelestialBodyData = {
      id: `nebula-${index}`,
      name,
      type: 'nebula',
      spectralType: '发射星云',
      mass: parseFloat((1000 + Math.random() * 9000).toFixed(0)),
      temperature: Math.floor(5000 + Math.random() * 5000),
      description: `温度约${Math.floor(8000)}K的发射星云`,
    };

    mesh.userData = { bodyId: data.id };

    this.bodies.push({
      data,
      mesh,
      originalScale: size,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.3 + Math.random() * 0.5,
    });
  }

  private randomPosition(min: number, max: number): THREE.Vector3 {
    const r = min + Math.random() * (max - min);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.4,
      r * Math.cos(phi)
    );
  }

  spawnGravityWave(position: THREE.Vector3, color: THREE.Color) {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const innerR = 0.5;
      const outerR = 1.0;
      const geo = new THREE.RingGeometry(innerR, outerR, 64);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: color.clone() },
          uColor2: { value: color.clone().offsetHSL(0.15, 0, 0.3) },
          uProgress: { value: 0 },
          uOpacity: { value: 1.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 uColor;
          uniform vec3 uColor2;
          uniform float uProgress;
          uniform float uOpacity;
          void main() {
            vec2 c = vUv - 0.5;
            float dist = length(c);
            float ring = smoothstep(0.2, 0.35, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
            vec3 col = mix(uColor, uColor2, dist * 2.0);
            float alpha = ring * (1.0 - uProgress) * uOpacity * 0.7;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });

      const ringMesh = new THREE.Mesh(geo, mat);
      ringMesh.position.copy(position);
      ringMesh.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
      ringMesh.rotation.x += Math.random() * 0.3;

      this.waveGroup.add(ringMesh);
      this.gravityWaves.push({
        ring: ringMesh,
        birth: this.clock.getElapsedTime() + i * 0.3,
        lifetime: 2.5,
        color: color.clone(),
        position: position.clone(),
      });
    }
  }

  handleClick(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): CelestialBodyData | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const meshes = this.bodies.map((b) => b.mesh);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const bodyId = hit.userData.bodyId;
      const body = this.bodies.find((b) => b.data.id === bodyId);
      if (body) {
        const pos = body.mesh.position.clone();
        const c = this.getBodyColor(body);
        this.spawnGravityWave(pos, c);
        this.onBodyClicked?.(body.data);
        return body.data;
      }
    }
    return null;
  }

  private getBodyColor(body: CelestialBody): THREE.Color {
    if (body.data.type === 'star') {
      const specKey = body.data.spectralType.charAt(0);
      return SPECTRAL_STARS[specKey]?.color.clone() ?? new THREE.Color(1, 1, 1);
    } else if (body.data.type === 'planet') {
      return new THREE.Color().setHSL(0.55, 0.7, 0.5);
    } else {
      return new THREE.Color().setHSL(0.8, 0.6, 0.5);
    }
  }

  update(delta: number) {
    const elapsed = this.clock.getElapsedTime();
    const speed = this.roamSpeed;

    if (this.bgMesh) {
      (this.bgMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed * speed;
    }

    if (this.starParticles) {
      (this.starParticles.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed * speed;
    }

    for (const body of this.bodies) {
      const mat = (body.mesh as THREE.Mesh).material;
      if (mat instanceof THREE.ShaderMaterial) {
        mat.uniforms.uTime.value = elapsed * speed;
      }
      if (body.glowMesh) {
        const glowMat = (body.glowMesh as THREE.Mesh).material;
        if (glowMat instanceof THREE.ShaderMaterial) {
          glowMat.uniforms.uTime.value = elapsed * speed;
        }
      }

      const pulse = Math.sin(elapsed * body.pulseSpeed * speed + body.pulsePhase) * 0.05 + 1.0;
      body.mesh.scale.setScalar(pulse);
      if (body.glowMesh && body.data.type !== 'planet') {
        body.glowMesh.scale.setScalar(pulse);
      }
    }

    const toRemove: number[] = [];
    for (let i = 0; i < this.gravityWaves.length; i++) {
      const wave = this.gravityWaves[i];
      const age = elapsed - wave.birth;
      if (age < 0) continue;

      const progress = Math.min(age / wave.lifetime, 1.0);
      const scale = 1 + progress * 15 * this.signalStrength;
      wave.ring.scale.setScalar(scale);

      const mat = wave.ring.material as THREE.ShaderMaterial;
      mat.uniforms.uProgress.value = progress;

      if (progress >= 1.0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const wave = this.gravityWaves[idx];
      this.waveGroup.remove(wave.ring);
      this.disposeObject(wave.ring);
      this.gravityWaves.splice(idx, 1);
    }

    for (const nm of this.nebulaMeshes) {
      nm.rotation.z += delta * 0.02 * speed;
    }
  }
}
