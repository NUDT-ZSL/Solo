import * as THREE from 'three';
import { eventBus, AppEvents, FluidType } from '../events/EventBus';
import { hexToRgb } from '../utils/MathUtils';

export class RendererModule {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private pointLight!: THREE.PointLight;
  private particlePoints: THREE.Points | null = null;
  private currentFluidType: FluidType = 'water';
  private targetFluidType: FluidType = 'water';
  private fluidTransitionProgress: number = 1;
  private transitionDuration: number = 0.5;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(1920, 1080, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 25);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();
    this.setupEventListeners();
    this.container.appendChild(this.renderer.domElement);
    this.resize();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(10, 20, 15);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);

    this.pointLight = new THREE.PointLight(0x64b5f6, 0.8, 50);
    this.pointLight.position.set(-10, 10, -10);
    this.scene.add(this.pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    eventBus.on(AppEvents.FLUID_TYPE_CHANGED, this.handleFluidTypeChange.bind(this));
  }

  private handleResize(): void {
    this.resize();
  }

  private handleFluidTypeChange(type: FluidType): void {
    this.targetFluidType = type;
    this.fluidTransitionProgress = 0;
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, true);
    eventBus.emit(AppEvents.RENDERER_RESIZE, { width, height });
  }

  public setParticlePoints(points: THREE.Points): void {
    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
    }
    this.particlePoints = points;
    this.scene.add(this.particlePoints);
  }

  public createParticleMaterial(type: FluidType): THREE.ShaderMaterial {
    const shaders = this.getFluidShaders(type);
    const material = new THREE.ShaderMaterial({
      vertexShader: shaders.vertex,
      fragmentShader: shaders.fragment,
      uniforms: shaders.uniforms,
      transparent: true,
      depthWrite: false,
      blending: type === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexColors: true,
    });
    return material;
  }

  private getFluidShaders(type: FluidType) {
    const baseUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uSizeMultiplier: { value: 1.0 },
    };

    if (type === 'water') {
      return {
        uniforms: {
          ...baseUniforms,
          uBottomColor: { value: new THREE.Color(hexToRgb('#1a237e').r, hexToRgb('#1a237e').g, hexToRgb('#1a237e').b) },
          uTopColor: { value: new THREE.Color(hexToRgb('#64b5f6').r, hexToRgb('#64b5f6').g, hexToRgb('#64b5f6').b) },
        },
        vertex: `
          attribute float aSize;
          attribute float aAlpha;
          attribute float aRandom;
          varying float vAlpha;
          varying float vHeight;
          varying vec3 vColor;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uSizeMultiplier;
          uniform vec3 uBottomColor;
          uniform vec3 uTopColor;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float turbulence = sin(uTime * 2.0 + aRandom * 10.0) * 0.02;
            vHeight = (position.y + 2.0) / 4.0;
            vHeight = clamp(vHeight, 0.0, 1.0);
            vColor = mix(uBottomColor, uTopColor, vHeight);
            vAlpha = aAlpha;
            float size = aSize * uSizeMultiplier;
            gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
            vec3 pos = position;
            pos.x += turbulence;
            pos.z += cos(uTime * 1.5 + aRandom * 8.0) * 0.015;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragment: `
          varying float vAlpha;
          varying float vHeight;
          varying vec3 vColor;

          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
            vec3 color = vColor;
            color += vec3(0.1, 0.15, 0.2) * (1.0 - dist * 2.0);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      };
    } else if (type === 'smoke') {
      return {
        uniforms: {
          ...baseUniforms,
          uBaseColor: { value: new THREE.Color(0.85, 0.85, 0.88) },
        },
        vertex: `
          attribute float aSize;
          attribute float aAlpha;
          attribute float aRandom;
          varying float vAlpha;
          varying float vRandom;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uSizeMultiplier;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vAlpha = aAlpha;
            vRandom = aRandom;
            float sizeJitter = 1.0 + sin(uTime * 3.0 + aRandom * 15.0) * 0.15;
            gl_PointSize = aSize * uSizeMultiplier * sizeJitter * uPixelRatio * (300.0 / -mvPosition.z);
            vec3 pos = position;
            pos.x += sin(uTime * 1.0 + aRandom * 12.0) * 0.05;
            pos.z += cos(uTime * 0.8 + aRandom * 10.0) * 0.04;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragment: `
          varying float vAlpha;
          varying float vRandom;
          uniform vec3 uBaseColor;

          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            float softEdge = smoothstep(0.5, 0.05, dist);
            float noise = sin(vRandom * 50.0 + dist * 20.0) * 0.5 + 0.5;
            float alpha = softEdge * vAlpha * (0.6 + noise * 0.4);
            vec3 color = uBaseColor * (0.7 + vRandom * 0.3);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      };
    } else {
      return {
        uniforms: {
          ...baseUniforms,
          uBottomColor: { value: new THREE.Color(hexToRgb('#ffeb3b').r, hexToRgb('#ffeb3b').g, hexToRgb('#ffeb3b').b) },
          uMiddleColor: { value: new THREE.Color(hexToRgb('#ff9800').r, hexToRgb('#ff9800').g, hexToRgb('#ff9800').b) },
          uTopColor: { value: new THREE.Color(hexToRgb('#f44336').r, hexToRgb('#f44336').g, hexToRgb('#f44336').b) },
        },
        vertex: `
          attribute float aSize;
          attribute float aAlpha;
          attribute float aRandom;
          varying float vAlpha;
          varying float vHeight;
          varying float vRandom;
          varying vec3 vColor;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uSizeMultiplier;
          uniform vec3 uBottomColor;
          uniform vec3 uMiddleColor;
          uniform vec3 uTopColor;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vHeight = (position.y + 2.0) / 4.0;
            vHeight = clamp(vHeight, 0.0, 1.0);
            vRandom = aRandom;
            vAlpha = aAlpha;
            
            if (vHeight < 0.5) {
              vColor = mix(uBottomColor, uMiddleColor, vHeight * 2.0);
            } else {
              vColor = mix(uMiddleColor, uTopColor, (vHeight - 0.5) * 2.0);
            }
            
            float flicker = 1.0 + sin(uTime * 8.0 + aRandom * 20.0) * 0.2;
            gl_PointSize = aSize * uSizeMultiplier * flicker * uPixelRatio * (300.0 / -mvPosition.z);
            
            vec3 pos = position;
            pos.x += sin(uTime * 4.0 + aRandom * 15.0) * 0.03;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragment: `
          varying float vAlpha;
          varying float vHeight;
          varying float vRandom;
          varying vec3 vColor;

          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            float glow = smoothstep(0.5, 0.0, dist);
            float core = smoothstep(0.3, 0.0, dist);
            float alpha = glow * vAlpha;
            vec3 color = vColor;
            color += vec3(1.0, 0.8, 0.4) * core * 0.5;
            float blur = 1.0 + (1.0 - glow) * 0.5;
            gl_FragColor = vec4(color * blur, alpha);
          }
        `,
      };
    }
  }

  public update(deltaTime: number): void {
    if (this.fluidTransitionProgress < 1) {
      this.fluidTransitionProgress = Math.min(
        1,
        this.fluidTransitionProgress + deltaTime / this.transitionDuration
      );
      if (this.fluidTransitionProgress >= 1) {
        this.currentFluidType = this.targetFluidType;
      }
    }

    if (this.particlePoints) {
      const material = this.particlePoints.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.uTime) {
        material.uniforms.uTime.value += deltaTime;
      }
    }

    this.updateLightColorsForFluid();
  }

  private updateLightColorsForFluid(): void {
    const t = this.fluidTransitionProgress;
    let targetPointColor: THREE.Color;

    switch (this.targetFluidType) {
      case 'water':
        targetPointColor = new THREE.Color(0x64b5f6);
        break;
      case 'smoke':
        targetPointColor = new THREE.Color(0xbdbdbd);
        break;
      case 'fire':
        targetPointColor = new THREE.Color(0xff7043);
        break;
    }

    this.pointLight.color.lerp(targetPointColor, 0.02);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public getTransitionProgress(): number {
    return this.fluidTransitionProgress;
  }

  public getCurrentFluidType(): FluidType {
    return this.fluidTransitionProgress < 1 ? this.targetFluidType : this.currentFluidType;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.renderer.dispose();
    if (this.particlePoints) {
      (this.particlePoints.material as THREE.Material).dispose();
      (this.particlePoints.geometry as THREE.BufferGeometry).dispose();
    }
  }
}
