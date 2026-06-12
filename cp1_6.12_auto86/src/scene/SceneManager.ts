import * as THREE from 'three';
import { gsap } from 'gsap';
import type { AudioData } from '../audio/AudioEngine';

interface GeometryObject {
  mesh: THREE.Mesh;
  baseScale: number;
  targetScale: number;
  currentPulse: number;
  rotSpeed: THREE.Vector3;
  baseY: number;
  pitchBand: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private geometryObjects: GeometryObject[] = [];
  private particleSystem: THREE.Points | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private particleBasePositions: Float32Array = new Float32Array(0);
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private cameraDistance = 10;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 6;
  private geometryCount = 35;
  private saturation = 70;
  private currentAudioData: AudioData | null = null;
  private clock = new THREE.Clock();
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private pointLight1: THREE.PointLight;
  private pointLight2: THREE.PointLight;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 5, this.cameraDistance);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x333366, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0x8888ff, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    this.scene.add(this.directionalLight);

    this.pointLight1 = new THREE.PointLight(0x00ffff, 1, 30);
    this.pointLight1.position.set(-5, 5, -5);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0xff00ff, 1, 30);
    this.pointLight2.position.set(5, 3, 5);
    this.scene.add(this.pointLight2);

    this.createGeometryGroup();
    this.createParticleSystem(300);
    this.setupInteraction();

    this.updateCameraPosition();
  }

  private createGeometryGroup(): void {
    const geometries = [
      () => new THREE.BoxGeometry(0.6, 0.6, 0.6),
      () => new THREE.SphereGeometry(0.35, 16, 16),
      () => new THREE.TorusKnotGeometry(0.3, 0.1, 64, 8),
    ];

    for (let i = 0; i < this.geometryCount; i++) {
      const geoFn = geometries[i % geometries.length];
      const geometry = geoFn();

      const hue = (i / this.geometryCount) * 0.6 + 0.5;
      const color = new THREE.Color().setHSL(hue % 1, this.saturation / 100, 0.5);

      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.15),
        shininess: 80,
        transparent: true,
        opacity: 0.85,
      });

      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / this.geometryCount) * Math.PI * 2;
      const radius = 2 + Math.random() * 5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 6;

      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      const baseScale = 0.5 + Math.random() * 0.8;
      mesh.scale.setScalar(baseScale);

      this.scene.add(mesh);

      this.geometryObjects.push({
        mesh,
        baseScale,
        targetScale: baseScale,
        currentPulse: 1,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
        baseY: y,
        pitchBand: i / this.geometryCount,
      });
    }
  }

  private createParticleSystem(count: number): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      if (this.particleMaterial) this.particleMaterial.dispose();
    }

    const maxCount = 500;
    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    this.particleBasePositions = new Float32Array(maxCount * 3);

    for (let i = 0; i < maxCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 20;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.particleBasePositions[i * 3] = x;
      this.particleBasePositions[i * 3 + 1] = y;
      this.particleBasePositions[i * 3 + 2] = z;

      const t = i / maxCount;
      const color = new THREE.Color();
      if (t < 0.33) {
        color.setHSL(0.75, 0.8, 0.5);
      } else if (t < 0.66) {
        color.setHSL(0.5, 0.9, 0.6);
      } else {
        color.setHSL(0.9, 0.8, 0.6);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setDrawRange(0, count);

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vec3 pos = position;
          pos.x += sin(uTime * 0.5 + position.y * 0.3) * 0.3;
          pos.y += cos(uTime * 0.4 + position.x * 0.2) * 0.2;
          pos.z += sin(uTime * 0.3 + position.z * 0.25) * 0.25;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio * (8.0 / -mvPosition.z);
          vAlpha = smoothstep(20.0, 2.0, -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha * 0.7;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;

      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 3, this.cameraPhi + dy * 0.005)
      );

      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
      this.updateCameraPosition();
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(3, Math.min(20, this.cameraDistance + e.deltaY * 0.01));
      this.updateCameraPosition();
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;

      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 3, this.cameraPhi + dy * 0.005)
      );

      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
      this.updateCameraPosition();
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraTheta) * Math.cos(this.cameraPhi);
    const y = this.cameraDistance * Math.sin(this.cameraPhi);
    const z = this.cameraDistance * Math.cos(this.cameraTheta) * Math.cos(this.cameraPhi);
    this.camera.position.set(x, y + 3, z);
    this.camera.lookAt(0, 0, 0);
  }

  updateAudioData(data: AudioData): void {
    this.currentAudioData = data;

    if (data.isBeat) {
      this.triggerBeatPulse();
    }

    this.updatePitchPositions(data.pitch);
    this.updateParticleSystem(data);
    this.updateLighting(data);
  }

  private triggerBeatPulse(): void {
    for (const obj of this.geometryObjects) {
      const targetScale = obj.baseScale * 1.3;
      obj.currentPulse = 1.3;

      gsap.to(obj, {
        currentPulse: 1,
        duration: 0.2,
        ease: 'power2.out',
        onUpdate: () => {
          const s = obj.baseScale * obj.currentPulse;
          obj.mesh.scale.setScalar(s);
        },
      });
    }
  }

  private updatePitchPositions(pitch: number): void {
    if (pitch <= 0) return;

    const minFreq = 65;
    const maxFreq = 1047;
    const t = Math.log2(pitch / minFreq) / Math.log2(maxFreq / minFreq);
    const normalizedT = Math.max(0, Math.min(1, t));

    for (const obj of this.geometryObjects) {
      const targetY = (normalizedT - 0.5) * 8;
      obj.mesh.position.y += (targetY * obj.pitchBand - obj.mesh.position.y) * 0.05;
    }
  }

  private updateParticleSystem(data: AudioData): void {
    if (!this.particleSystem || !this.particleMaterial) return;

    const energy = data.spectrumEnergy;
    const normalizedEnergy = Math.min(1, energy * 50);
    const particleCount = Math.floor(100 + normalizedEnergy * 400);

    this.particleSystem.geometry.setDrawRange(0, particleCount);

    const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
    const colors = this.particleSystem.geometry.attributes.aColor.array as Float32Array;

    for (let i = 0; i < Math.min(particleCount, 500); i++) {
      const bx = this.particleBasePositions[i * 3];
      const by = this.particleBasePositions[i * 3 + 1];
      const bz = this.particleBasePositions[i * 3 + 2];

      const expandFactor = 1 + normalizedEnergy * 0.5;
      positions[i * 3] = bx * expandFactor;
      positions[i * 3 + 1] = by * expandFactor;
      positions[i * 3 + 2] = bz * expandFactor;

      const t = i / 500;
      let hue: number;
      if (t < 0.33) {
        hue = 0.75;
      } else if (t < 0.66) {
        hue = 0.5;
      } else {
        hue = 0.9;
      }
      const sat = this.saturation / 100;
      const color = new THREE.Color().setHSL(hue, sat, 0.5 + normalizedEnergy * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.aColor.needsUpdate = true;

    const sizes = this.particleSystem.geometry.attributes.aSize.array as Float32Array;
    for (let i = 0; i < 500; i++) {
      sizes[i] = 2 + normalizedEnergy * 4;
    }
    this.particleSystem.geometry.attributes.aSize.needsUpdate = true;

    this.particleMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
  }

  private updateLighting(data: AudioData): void {
    const vol = data.volume;
    this.pointLight1.intensity = 0.5 + vol * 3;
    this.pointLight2.intensity = 0.5 + vol * 2;
    this.ambientLight.intensity = 0.4 + vol * 0.4;
  }

  setGeometryDensity(count: number): void {
    if (count === this.geometryCount) return;

    for (const obj of this.geometryObjects) {
      this.scene.remove(obj.mesh);
      obj.mesh.geometry.dispose();
      (obj.mesh.material as THREE.Material).dispose();
    }
    this.geometryObjects = [];

    this.geometryCount = count;
    this.createGeometryGroup();
  }

  setSaturation(val: number): void {
    this.saturation = val;
    for (let i = 0; i < this.geometryObjects.length; i++) {
      const obj = this.geometryObjects[i];
      const hue = (i / this.geometryObjects.length) * 0.6 + 0.5;
      const color = new THREE.Color().setHSL(hue % 1, val / 100, 0.5);
      (obj.mesh.material as THREE.MeshPhongMaterial).color.copy(color);
      (obj.mesh.material as THREE.MeshPhongMaterial).emissive.copy(color).multiplyScalar(0.15);
    }
  }

  update(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    for (const obj of this.geometryObjects) {
      obj.mesh.rotation.x += obj.rotSpeed.x;
      obj.mesh.rotation.y += obj.rotSpeed.y;
      obj.mesh.rotation.z += obj.rotSpeed.z;

      if (this.currentAudioData) {
        obj.rotSpeed.x += (this.currentAudioData.volume * 0.05 - obj.rotSpeed.x) * 0.1;
        obj.rotSpeed.y += (this.currentAudioData.volume * 0.05 - obj.rotSpeed.y) * 0.1;
      }
    }

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = elapsed;
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
  }

  dispose(): void {
    for (const obj of this.geometryObjects) {
      obj.mesh.geometry.dispose();
      (obj.mesh.material as THREE.Material).dispose();
    }
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      if (this.particleMaterial) this.particleMaterial.dispose();
    }
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
