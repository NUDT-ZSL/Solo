import * as THREE from 'three';
import { StarParams, StarStage, StarEngineEvents, EngineEvent, STAGE_NAMES } from './types';
import { STAR_PRESETS, temperatureToColor } from '../data/starData';

type EventCallback<T extends EngineEvent> = StarEngineEvents[T];

export class StarEngine {
  private scene: THREE.Scene;
  private mass: number = 1;
  private currentAge: number = 0;
  private starMesh: THREE.Mesh | null = null;
  private starGlow: THREE.Mesh | null = null;
  private blackHoleLens: THREE.Mesh | null = null;
  private light: THREE.PointLight | null = null;
  private currentStage: StarStage = StarStage.PROTOSTAR;
  private lastNotifiedStage: StarStage | null = null;
  private hasExploded: boolean = false;
  private targetScale: number = 1;
  private currentScale: number = 1;
  private targetColor: THREE.Color = new THREE.Color('#FFD700');
  private currentColor: THREE.Color = new THREE.Color('#FFD700');
  private eventListeners: Map<EngineEvent, Set<EventCallback<EngineEvent>>> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  constructor(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.setupClickHandler();
  }

  private setupClickHandler(): void {
    this.domElement.addEventListener('click', (event) => {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.starMesh) {
        const intersects = this.raycaster.intersectObject(this.starMesh);
        if (intersects.length > 0) {
          this.emit('click', undefined as never);
        }
      }
    });
  }

  on<T extends EngineEvent>(event: T, callback: EventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off<T extends EngineEvent>(event: T, callback: EventCallback<T>): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit<T extends EngineEvent>(event: T, data: Parameters<EventCallback<T>>[0]): void {
    this.eventListeners.get(event)?.forEach((cb) => {
      (cb as (data: Parameters<EventCallback<T>>[0]) => void)(data);
    });
  }

  createStar(mass: number): void {
    this.mass = mass;
    this.currentAge = 0;
    this.currentStage = StarStage.PROTOSTAR;
    this.lastNotifiedStage = null;
    this.hasExploded = false;

    this.removeStar();

    const preset = STAR_PRESETS.find(p => p.mass === mass) || STAR_PRESETS[0];
    const firstStage = preset.stages[0];

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: firstStage.color,
    });

    this.starMesh = new THREE.Mesh(geometry, material);
    this.starMesh.name = 'star';
    this.scene.add(this.starMesh);

    const glowGeometry = new THREE.SphereGeometry(1.3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(firstStage.color) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    this.starGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(this.starGlow);

    this.light = new THREE.PointLight(firstStage.color, 2, 100);
    this.scene.add(this.light);

    this.currentScale = firstStage.scale;
    this.targetScale = firstStage.scale;
    this.currentColor = new THREE.Color(firstStage.color);
    this.targetColor = new THREE.Color(firstStage.color);

    this.updateStarTransform();
    this.emitParams();
  }

  private removeStar(): void {
    if (this.starMesh) {
      this.scene.remove(this.starMesh);
      this.starMesh.geometry.dispose();
      (this.starMesh.material as THREE.Material).dispose();
      this.starMesh = null;
    }
    if (this.starGlow) {
      this.scene.remove(this.starGlow);
      this.starGlow.geometry.dispose();
      (this.starGlow.material as THREE.Material).dispose();
      this.starGlow = null;
    }
    if (this.blackHoleLens) {
      this.scene.remove(this.blackHoleLens);
      this.blackHoleLens.geometry.dispose();
      (this.blackHoleLens.material as THREE.Material).dispose();
      this.blackHoleLens = null;
    }
    if (this.light) {
      this.scene.remove(this.light);
      this.light = null;
    }
  }

  setAge(age: number): void {
    this.currentAge = age;
    this.update(0);
  }

  update(deltaTime: number): void {
    if (!this.starMesh) return;

    const preset = STAR_PRESETS.find(p => p.mass === this.mass) || STAR_PRESETS[0];
    
    let accumulatedTime = 0;
    let currentStageData = preset.stages[0];
    let stageProgress = 0;

    for (let i = 0; i < preset.stages.length; i++) {
      const stage = preset.stages[i];
      if (this.currentAge < accumulatedTime + stage.duration || stage.duration === Infinity) {
        currentStageData = stage;
        this.currentStage = stage.stage;
        stageProgress = stage.duration === Infinity 
          ? 0 
          : (this.currentAge - accumulatedTime) / stage.duration;
        break;
      }
      accumulatedTime += stage.duration;
    }

    if (this.currentStage !== this.lastNotifiedStage) {
      this.lastNotifiedStage = this.currentStage;
      this.emit('stageChange', [this.currentStage, STAGE_NAMES[this.currentStage]] as never);
    }

    if ((this.currentStage === StarStage.SUPERNOVA || this.currentStage === StarStage.PLANETARY_NEBULA) && !this.hasExploded) {
      this.hasExploded = true;
      this.emit('explosion', preset.explosionType as never);
    }

    const progress = this.easeInOutCubic(Math.max(0, Math.min(1, stageProgress)));
    
    const params = this.interpolateStageParams(currentStageData, progress);
    
    this.targetScale = params.scale;
    this.targetColor = new THREE.Color(params.color);

    this.currentScale += (this.targetScale - this.currentScale) * deltaTime * 2;
    this.currentColor.lerp(this.targetColor, deltaTime * 2);

    this.updateStarTransform();

    if (this.currentStage === StarStage.BLACK_HOLE && !this.blackHoleLens) {
      this.createBlackHoleLens();
    }

    this.emit('paramsUpdate', params as never);
  }

  private updateStarTransform(): void {
    if (!this.starMesh || !this.starGlow) return;

    const scale = this.currentScale;
    this.starMesh.scale.setScalar(scale);
    this.starGlow.scale.setScalar(scale * 1.3);

    if (this.currentStage === StarStage.BLACK_HOLE) {
      (this.starMesh.material as THREE.MeshBasicMaterial).color.set('#000000');
      (this.starMesh.material as THREE.MeshBasicMaterial).transparent = true;
      (this.starMesh.material as THREE.MeshBasicMaterial).opacity = 1;
    } else {
      (this.starMesh.material as THREE.MeshBasicMaterial).color.copy(this.currentColor);
    }

    if (this.starGlow.material instanceof THREE.ShaderMaterial) {
      this.starGlow.material.uniforms.glowColor.value.copy(this.currentColor);
      this.starGlow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        this.camera.position,
        this.starGlow.position
      );
    }

    if (this.light) {
      if (this.currentStage === StarStage.BLACK_HOLE) {
        this.light.intensity = 0;
      } else {
        this.light.color.copy(this.currentColor);
        this.light.intensity = 1 + Math.log10(Math.max(1, this.getLuminosity())) * 0.3;
      }
    }

    if (this.blackHoleLens) {
      this.blackHoleLens.scale.setScalar(scale * 2);
    }
  }

  private createBlackHoleLens(): void {
    const lensGeometry = new THREE.SphereGeometry(1, 64, 64);
    const lensMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = length(vUv - center);
          
          float edge = 0.45;
          float ringWidth = 0.1;
          
          float ring = smoothstep(edge, edge + ringWidth, dist) * 
                       (1.0 - smoothstep(edge + ringWidth, edge + ringWidth * 2, dist));
          
          float innerGlow = (1.0 - smoothstep(0.0, edge, dist)) * 0.3;
          
          float rotation = time * 0.2;
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5) + rotation;
          float swirl = sin(angle * 8.0 + time) * 0.5 + 0.5;
          
          vec3 color1 = vec3(0.42, 0.39, 1.0);
          vec3 color2 = vec3(0.0, 0.85, 1.0);
          vec3 ringColor = mix(color1, color2, swirl);
          
          vec3 finalColor = ringColor * ring * (0.5 + swirl * 0.5) + 
                            vec3(0.1, 0.05, 0.2) * innerGlow;
          
          float alpha = ring * 0.8 + innerGlow * 0.5;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.blackHoleLens = new THREE.Mesh(lensGeometry, lensMaterial);
    this.scene.add(this.blackHoleLens);
  }

  private interpolateStageParams(stage: typeof STAR_PRESETS[0]['stages'][0], progress: number): StarParams {
    const logProgress = progress;

    const radius = stage.startRadius + (stage.endRadius - stage.startRadius) * logProgress;
    const temperature = stage.startTemp + (stage.endTemp - stage.startTemp) * logProgress;
    const luminosity = stage.startLuminosity + (stage.endLuminosity - stage.startLuminosity) * logProgress;
    
    const scale = stage.stage === StarStage.BLACK_HOLE 
      ? 0.8 
      : 0.5 + Math.min(4.5, Math.log10(Math.max(1, radius)) * 1.5);

    return {
      mass: this.mass,
      radius,
      temperature,
      luminosity: Math.max(0, luminosity),
      stage: stage.stage,
      age: this.currentAge,
      color: temperatureToColor(temperature),
      scale,
    };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private getLuminosity(): number {
    const preset = STAR_PRESETS.find(p => p.mass === this.mass) || STAR_PRESETS[0];
    let accumulatedTime = 0;
    
    for (const stage of preset.stages) {
      if (this.currentAge < accumulatedTime + stage.duration || stage.duration === Infinity) {
        const progress = stage.duration === Infinity
          ? 0
          : (this.currentAge - accumulatedTime) / stage.duration;
        return stage.startLuminosity + (stage.endLuminosity - stage.startLuminosity) * progress;
      }
      accumulatedTime += stage.duration;
    }
    return 1;
  }

  private emitParams(): void {
    const preset = STAR_PRESETS.find(p => p.mass === this.mass) || STAR_PRESETS[0];
    const firstStage = preset.stages[0];
    this.emit('paramsUpdate', {
      mass: this.mass,
      radius: firstStage.startRadius,
      temperature: firstStage.startTemp,
      luminosity: firstStage.startLuminosity,
      stage: firstStage.stage,
      age: this.currentAge,
      color: firstStage.color,
      scale: firstStage.scale,
    } as never);
  }

  getStarMesh(): THREE.Mesh | null {
    return this.starMesh;
  }

  getMass(): number {
    return this.mass;
  }

  dispose(): void {
    this.removeStar();
    this.eventListeners.clear();
  }
}
