import * as THREE from 'three';
import { ParticleData } from './nebula';

export interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  id: number;
}

export interface Shockwave {
  center: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
}

export class StageSystem {
  scene: THREE.Scene;
  domElement: HTMLElement;
  camera: THREE.Camera;

  coreCount = 200;
  coreParticles: ParticleData[] = [];
  corePoints: THREE.Points;
  coreGeometry: THREE.BufferGeometry;
  coreMaterial: THREE.ShaderMaterial;
  corePositions: Float32Array;
  coreColors: Float32Array;
  coreSizes: Float32Array;
  coreAlphas: Float32Array;

  burstParticles: BurstParticle[] = [];
  maxBurst = 500;
  burstPoints: THREE.Points;
  burstGeometry: THREE.BufferGeometry;
  burstMaterial: THREE.ShaderMaterial;
  burstPositions: Float32Array;
  burstColors: Float32Array;
  burstSizes: Float32Array;
  burstAlphas: Float32Array;
  burstCount = 0;

  shockwaves: Shockwave[] = [];
  shockwaveMeshes: THREE.Mesh[] = [];

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  private idCounter = 10000;

  onShockwaveCallback: ((center: THREE.Vector3, radius: number, width: number) => void) | null = null;

  constructor(scene: THREE.Scene, domElement: HTMLElement, camera: THREE.Camera) {
    this.scene = scene;
    this.domElement = domElement;
    this.camera = camera;

    this.corePositions = new Float32Array(this.coreCount * 3);
    this.coreColors = new Float32Array(this.coreCount * 3);
    this.coreSizes = new Float32Array(this.coreCount);
    this.coreAlphas = new Float32Array(this.coreCount);

    this.coreGeometry = new THREE.BufferGeometry();
    this.coreGeometry.setAttribute('position', new THREE.BufferAttribute(this.corePositions, 3));
    this.coreGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.coreColors, 3));
    this.coreGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.coreSizes, 1));
    this.coreGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.coreAlphas, 1));

    this.coreMaterial = this.createShader();
    this.corePoints = new THREE.Points(this.coreGeometry, this.coreMaterial);
    this.scene.add(this.corePoints);

    this.burstPositions = new Float32Array(this.maxBurst * 3);
    this.burstColors = new Float32Array(this.maxBurst * 3);
    this.burstSizes = new Float32Array(this.maxBurst);
    this.burstAlphas = new Float32Array(this.maxBurst);

    this.burstGeometry = new THREE.BufferGeometry();
    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(this.burstPositions, 3));
    this.burstGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.burstColors, 3));
    this.burstGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.burstSizes, 1));
    this.burstGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.burstAlphas, 1));
    this.burstGeometry.setDrawRange(0, 0);

    this.burstMaterial = this.createShader();
    this.burstPoints = new THREE.Points(this.burstGeometry, this.burstMaterial);
    this.scene.add(this.burstPoints);

    this.initCore();
    this.attachEvents();
  }

  private createShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (300.0 / max(1.0, -mv.z));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.1, d) * 0.8;
          float a = (core * 1.2 + halo) * vAlpha;
          gl_FragColor = vec4(vColor * (1.5 + core), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private initCore() {
    const warmY = hexToRgb('#FFD700');
    const pinkO = hexToRgb('#FF6B6B');

    for (let i = 0; i < this.coreCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 30;
      const y = (Math.random() - 0.5) * 30;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const t = Math.random();
      const col = new THREE.Color(
        warmY.r + (pinkO.r - warmY.r) * t,
        warmY.g + (pinkO.g - warmY.g) * t,
        warmY.b + (pinkO.b - warmY.b) * t
      );

      const particle: ParticleData = {
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(),
        color: col.clone(),
        baseColor: col.clone(),
        size: 4 + Math.random() * 4,
        alpha: 0.8 + Math.random() * 0.2,
        brightBoost: 1,
        brightTimer: 0,
        colorMixTimer: 0,
        mixedColor: null,
        radius: Math.sqrt(x * x + z * z),
        phase: Math.random() * Math.PI * 2,
        spiralRadius: 5 + Math.random() * 10,
        spiralPhase: Math.random() * Math.PI * 2,
        riseSpeed: 0.3 + Math.random() * 0.5,
        id: this.idCounter++
      };
      this.coreParticles.push(particle);
    }
    this.syncCoreBuffers();
  }

  private syncCoreBuffers() {
    for (let i = 0; i < this.coreCount; i++) {
      const p = this.coreParticles[i];
      this.corePositions[i * 3] = p.position.x;
      this.corePositions[i * 3 + 1] = p.position.y;
      this.corePositions[i * 3 + 2] = p.position.z;

      const boost = p.brightBoost;
      this.coreColors[i * 3] = Math.min(1, p.color.r * boost);
      this.coreColors[i * 3 + 1] = Math.min(1, p.color.g * boost);
      this.coreColors[i * 3 + 2] = Math.min(1, p.color.b * boost);

      this.coreSizes[i] = p.size;
      this.coreAlphas[i] = p.alpha;
    }
    (this.coreGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.coreGeometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.coreGeometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.coreGeometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  private syncBurstBuffers() {
    const count = Math.min(this.burstParticles.length, this.maxBurst);
    for (let i = 0; i < count; i++) {
      const b = this.burstParticles[i];
      this.burstPositions[i * 3] = b.position.x;
      this.burstPositions[i * 3 + 1] = b.position.y;
      this.burstPositions[i * 3 + 2] = b.position.z;

      this.burstColors[i * 3] = b.color.r;
      this.burstColors[i * 3 + 1] = b.color.g;
      this.burstColors[i * 3 + 2] = b.color.b;

      this.burstSizes[i] = b.size;
      this.burstAlphas[i] = b.life / b.maxLife;
    }
    this.burstGeometry.setDrawRange(0, count);
    (this.burstGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.burstGeometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.burstGeometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.burstGeometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  private attachEvents() {
    const handleClick = (e: MouseEvent) => {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const planeNormal = new THREE.Vector3(0, 0, 1);
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      planeNormal.copy(camDir).negate();

      const plane = new THREE.Plane(planeNormal, 0);
      const hitPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, hitPoint);

      if (hitPoint.length() < 250) {
        this.triggerBurst(hitPoint);
      }
    };

    let dragTimeout: number | null = null;
    let isDragging = false;
    let startX = 0, startY = 0;

    this.domElement.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
      if (dragTimeout) window.clearTimeout(dragTimeout);
    });

    this.domElement.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) {
        isDragging = true;
      }
    });

    this.domElement.addEventListener('pointerup', (e) => {
      if (!isDragging) {
        handleClick(e);
      }
    });
  }

  triggerBurst(center: THREE.Vector3) {
    const burstCount = 80;
    const white = { r: 1, g: 1, b: 1 };

    for (let i = 0; i < burstCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      const speed = 15 + Math.random() * 15;
      const t = Math.pow(Math.random(), 0.4);
      const randomColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);

      const color = new THREE.Color(
        white.r + (randomColor.r - white.r) * t,
        white.g + (randomColor.g - white.g) * t,
        white.b + (randomColor.b - white.b) * t
      );

      this.burstParticles.push({
        position: center.clone(),
        velocity: dir.multiplyScalar(speed),
        color,
        life: 0.6,
        maxLife: 0.6,
        size: 3 + Math.random() * 2,
        id: this.idCounter++
      });
    }

    const shockwave: Shockwave = {
      center: center.clone(),
      radius: 5,
      maxRadius: 400,
      life: 2.5,
      maxLife: 2.5
    };
    this.shockwaves.push(shockwave);

    const geometry = new THREE.RingGeometry(1, 1.05, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.lookAt(this.camera.position);
    this.scene.add(mesh);
    this.shockwaveMeshes.push(mesh);
  }

  update(time: number, dt: number) {
    for (let i = 0; i < this.coreCount; i++) {
      const p = this.coreParticles[i];
      const wobble = 5 + 10 * Math.abs(Math.sin(time * 0.5 + p.phase));
      const angle = time * 1.2 + p.phase;

      const cx = Math.cos(p.phase) * p.spiralRadius;
      const cz = Math.sin(p.phase) * p.spiralRadius;

      p.position.x = cx + Math.sin(angle * 2) * wobble * 0.5;
      p.position.z = cz + Math.cos(angle * 1.7) * wobble * 0.5;
      p.position.y = Math.sin(time + p.phase * 2) * wobble;

      if (p.brightTimer > 0) {
        p.brightTimer -= dt;
        if (p.brightTimer <= 0) p.brightBoost = 1;
        else p.brightBoost = 1 + p.brightTimer / 0.3;
      }
      if (p.colorMixTimer > 0) {
        p.colorMixTimer -= dt;
        if (p.colorMixTimer <= 0) {
          p.color.copy(p.baseColor);
          p.mixedColor = null;
        } else if (p.mixedColor) {
          const t = p.colorMixTimer / 0.08;
          p.color.lerpColors(p.mixedColor, p.baseColor, 1 - t);
        }
      }
    }
    this.syncCoreBuffers();

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const b = this.burstParticles[i];
      b.position.addScaledVector(b.velocity, dt * 60);
      b.velocity.multiplyScalar(0.97);
      b.life -= dt;
      if (b.life <= 0) {
        this.burstParticles.splice(i, 1);
      }
    }
    this.syncBurstBuffers();

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      const speed = 180;
      s.radius += speed * dt;
      s.life -= dt;

      if (this.onShockwaveCallback) {
        this.onShockwaveCallback(s.center, s.radius, 25);
      }

      const mesh = this.shockwaveMeshes[i];
      const scale = s.radius;
      mesh.scale.set(scale, scale, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 * (s.life / s.maxLife));
      mesh.lookAt(this.camera.position);

      if (s.life <= 0 || s.radius >= s.maxRadius) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        this.shockwaveMeshes.splice(i, 1);
      }
    }
  }

  getAllParticles(): ParticleData[] {
    return [...this.coreParticles];
  }

  getBurstParticles(): BurstParticle[] {
    return this.burstParticles;
  }
}
