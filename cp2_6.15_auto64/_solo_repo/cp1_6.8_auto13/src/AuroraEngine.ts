import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuroraGenerator } from './AuroraGenerator';
import { TerrainManager } from './TerrainManager';
import { ParticleSystem } from './ParticleSystem';

export interface AuroraParams {
  auroraSpeed: number;
  crystalBrightness: number;
  particleDensity: number;
}

export class AuroraEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private auroraGenerator: AuroraGenerator;
  private terrainManager: TerrainManager;
  private particleSystem: ParticleSystem;
  private params: AuroraParams;
  private animationId: number = 0;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.params = { auroraSpeed: 1.0, crystalBrightness: 1.0, particleDensity: 1.0 };
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 12, 35);
    this.camera.lookAt(0, 8, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI * 0.75;
    this.controls.target.set(0, 5, 0);

    this.auroraGenerator = new AuroraGenerator(this.scene);
    this.terrainManager = new TerrainManager(this.scene, this.camera, this.renderer.domElement);
    this.particleSystem = new ParticleSystem(this.scene);

    this.addLights();
    this.addSkyGradient();

    window.addEventListener('resize', this.onResize);

    this.terrainManager.onCrystalClick = (data) => {
      this.particleSystem.triggerLightDust(data.position, data.energy);
    };
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x1a1a4e, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    dirLight.position.set(-10, 20, 10);
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x2244aa, 0x111133, 0.5);
    this.scene.add(hemiLight);
  }

  private addSkyGradient(): void {
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x020012) },
        uBottomColor: { value: new THREE.Color(0x0a0a3e) },
        uOffset: { value: 0.3 },
        uExponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uOffset;
        uniform float uExponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y + uOffset;
          gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(pow(max(h, 0.0), uExponent), 0.0)), 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));
  }

  updateParams(params: Partial<AuroraParams>): void {
    Object.assign(this.params, params);
    this.terrainManager.setCrystalBrightness(this.params.crystalBrightness);
    this.particleSystem.setDensity(this.params.particleDensity);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  start(): void {
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.auroraGenerator.update(elapsed, this.params.auroraSpeed);
    this.terrainManager.update(elapsed, this.params.auroraSpeed);
    this.particleSystem.update(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationId);
    this.auroraGenerator.dispose();
    this.terrainManager.dispose();
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
