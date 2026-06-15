import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ParticleSystem } from './particleSystem';
import { analyzeText, getComplementaryColor, type EmotionData } from './emotionData';

const PARTICLE_COUNT = 3000;
const STAR_COUNT = 80;
const NEBULA_RADIUS = 60;
const TRANSITION_DURATION = 0.5;

export type OnEmotionChangeCallback = (label: string) => void;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private particleSystem: ParticleSystem | null = null;
  private nebula!: THREE.Points;
  private nebulaPositions!: Float32Array;
  private nebulaBasePositions!: Float32Array;
  private nebulaColors!: Float32Array;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private time = 0;

  private transitioning = false;
  private transitionProgress = 0;
  private transitionPhase: 'fade-out' | 'fade-in' | 'idle' = 'idle';
  private pendingText: string | null = null;

  private onEmotionChange: OnEmotionChangeCallback | null = null;
  private currentEmotionLabel = '';

  private cameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.composer = this.createComposer();
    this.createNebula();
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,
      0.2,
      0.3
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return composer;
  }

  private createNebula(): void {
    const geometry = new THREE.BufferGeometry();
    this.nebulaPositions = new Float32Array(STAR_COUNT * 3);
    this.nebulaBasePositions = new Float32Array(STAR_COUNT * 3);
    this.nebulaColors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const opacities = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = NEBULA_RADIUS * (0.85 + Math.random() * 0.15);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.7;
      const z = r * Math.sin(phi) * Math.sin(theta);

      this.nebulaPositions[i * 3] = x;
      this.nebulaPositions[i * 3 + 1] = y;
      this.nebulaPositions[i * 3 + 2] = z;
      this.nebulaBasePositions[i * 3] = x;
      this.nebulaBasePositions[i * 3 + 1] = y;
      this.nebulaBasePositions[i * 3 + 2] = z;

      this.nebulaColors[i * 3] = 0.8;
      this.nebulaColors[i * 3 + 1] = 0.8;
      this.nebulaColors[i * 3 + 2] = 1.0;
      sizes[i] = 0.5 + Math.random() * 1.0;
      opacities[i] = 0.2 + Math.random() * 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.nebulaPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.nebulaColors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.nebula = new THREE.Points(geometry, material);
    this.nebula.frustumCulled = false;
    this.scene.add(this.nebula);
  }

  private updateNebulaColor(emotionData: EmotionData): void {
    const complement = getComplementaryColor(emotionData.primaryColor);
    for (let i = 0; i < STAR_COUNT; i++) {
      const variation = 0.85 + Math.random() * 0.3;
      this.nebulaColors[i * 3] = Math.min(1, complement.r * variation);
      this.nebulaColors[i * 3 + 1] = Math.min(1, complement.g * variation);
      this.nebulaColors[i * 3 + 2] = Math.min(1, complement.b * variation);
    }
    (this.nebula.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public setEmotionChangeCallback(callback: OnEmotionChangeCallback): void {
    this.onEmotionChange = callback;
  }

  public generateSculpture(text: string): void {
    if (this.transitioning) {
      this.pendingText = text;
      return;
    }

    const emotionData = analyzeText(text, PARTICLE_COUNT);

    if (this.particleSystem) {
      this.transitioning = true;
      this.transitionPhase = 'fade-out';
      this.transitionProgress = 0;
      this.pendingText = text;
      this.currentEmotionLabel = emotionData.label;
      this.updateNebulaColor(emotionData);
    } else {
      this.createNewParticleSystem(text);
    }
  }

  private createNewParticleSystem(text: string): void {
    if (this.particleSystem) {
      this.particleSystem.dispose();
      this.particleSystem = null;
    }

    this.particleSystem = new ParticleSystem(this.scene);
    const emotionData = analyzeText(text, PARTICLE_COUNT);
    this.particleSystem.generateFromEmotion(emotionData);
    this.currentEmotionLabel = emotionData.label;
    this.updateNebulaColor(emotionData);

    if (this.onEmotionChange) {
      this.onEmotionChange(this.currentEmotionLabel);
    }
  }

  public handlePointerClick(clientX: number, clientY: number, canvasRect: DOMRect): void {
    if (this.transitioning || !this.particleSystem) return;

    this.pointer.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.pointer.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const particleIndex = this.particleSystem.getParticleIndexFromRay(this.raycaster.ray);

    if (particleIndex >= 0) {
      this.particleSystem.triggerExplosion(particleIndex);
    }
  }

  public handleResize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  public update(): void {
    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    this.time += deltaTime;

    if (this.transitioning) {
      this.transitionProgress += deltaTime / TRANSITION_DURATION;

      if (this.transitionPhase === 'fade-out') {
        const fadeProgress = this.easeOutCubic(Math.min(1, this.transitionProgress));
        if (this.particleSystem) {
          this.particleSystem.opacity = 1 - fadeProgress;
        }
        if (this.transitionProgress >= 1) {
          if (this.pendingText) {
            this.createNewParticleSystem(this.pendingText);
            this.pendingText = null;
          }
          this.transitionPhase = 'fade-in';
          this.transitionProgress = 0;
          if (this.particleSystem) {
            this.particleSystem.opacity = 0;
          }
        }
      } else if (this.transitionPhase === 'fade-in') {
        const fadeProgress = this.easeOutCubic(Math.min(1, this.transitionProgress));
        if (this.particleSystem) {
          this.particleSystem.opacity = fadeProgress;
        }
        if (this.transitionProgress >= 1) {
          this.transitionPhase = 'idle';
          this.transitioning = false;
          this.transitionProgress = 0;
          if (this.particleSystem) {
            this.particleSystem.opacity = 1;
          }
          if (this.pendingText) {
            const nextText = this.pendingText;
            this.pendingText = null;
            this.generateSculpture(nextText);
          }
        }
      }
    }

    if (this.particleSystem) {
      this.particleSystem.update(this.time, deltaTime);
    }

    this.updateNebula(deltaTime);
    this.composer.render();
  }

  private updateNebula(deltaTime: number): void {
    const rotationSpeed = 0.05;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const parallaxOffset = camDir.multiplyScalar(-3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const bx = this.nebulaBasePositions[i * 3];
      const by = this.nebulaBasePositions[i * 3 + 1];
      const bz = this.nebulaBasePositions[i * 3 + 2];

      const cosA = Math.cos(this.time * rotationSpeed);
      const sinA = Math.sin(this.time * rotationSpeed);
      const cosB = Math.cos(this.time * rotationSpeed * 0.7 + i);
      const sinB = Math.sin(this.time * rotationSpeed * 0.7 + i);

      let x = bx * cosA - bz * sinA;
      let z = bx * sinA + bz * cosA;
      let y = by;

      const x2 = x * cosB - z * sinB;
      const z2 = x * sinB + z * cosB;
      x = x2;
      z = z2;

      this.nebulaPositions[i * 3] = x + parallaxOffset.x;
      this.nebulaPositions[i * 3 + 1] = y + parallaxOffset.y;
      this.nebulaPositions[i * 3 + 2] = z + parallaxOffset.z;
    }

    (this.nebula.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public getCurrentEmotionLabel(): string {
    return this.currentEmotionLabel;
  }

  public dispose(): void {
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    this.nebula.geometry.dispose();
    (this.nebula.material as THREE.Material).dispose();
    this.scene.remove(this.nebula);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public setCameraTarget(target: THREE.Vector3): void {
    this.cameraTarget.copy(target);
  }
}
