import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  clock: THREE.Clock;
  mountains: THREE.Mesh[] = [];

  constructor(container: HTMLElement) {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xb8c6d4, 0.012);

    this.createBackground();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 18, 35);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 2, 0);

    this.setupLights();
    this.createMountains();
    this.createGround();
    this.setupPostProcessing();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#b0bec5');
    gradient.addColorStop(0.35, '#b8c8d0');
    gradient.addColorStop(0.65, '#a8c8c0');
    gradient.addColorStop(1, '#c8ddd8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xc8d8e0, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = false;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xd0e8f0, 0.3);
    fillLight.position.set(-10, 15, -5);
    this.scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xc8d8e0, 0x5a6b7a, 0.4);
    this.scene.add(hemiLight);
  }

  private createMountains(): void {
    const mountainMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a6b7a,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05,
    });

    const mountainMaterialDark = new THREE.MeshStandardMaterial({
      color: 0x4a5a68,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.05,
    });

    const configs = [
      { x: -16, z: -10, scaleX: 14, scaleY: 18, scaleZ: 16, material: mountainMaterialDark },
      { x: -14, z: 5, scaleX: 12, scaleY: 22, scaleZ: 14, material: mountainMaterialDark },
      { x: -18, z: 20, scaleX: 16, scaleY: 16, scaleZ: 12, material: mountainMaterial },
      { x: -12, z: -22, scaleX: 10, scaleY: 14, scaleZ: 10, material: mountainMaterial },
      { x: 16, z: -8, scaleX: 13, scaleY: 20, scaleZ: 15, material: mountainMaterialDark },
      { x: 14, z: 8, scaleX: 11, scaleY: 17, scaleZ: 13, material: mountainMaterialDark },
      { x: 18, z: 22, scaleX: 15, scaleY: 15, scaleZ: 11, material: mountainMaterial },
      { x: 13, z: -20, scaleX: 9, scaleY: 13, scaleZ: 9, material: mountainMaterial },
      { x: -8, z: -30, scaleX: 18, scaleY: 12, scaleZ: 10, material: mountainMaterial },
      { x: 8, z: 30, scaleX: 16, scaleY: 14, scaleZ: 10, material: mountainMaterial },
    ];

    for (const cfg of configs) {
      const geo = new THREE.ConeGeometry(1, 1, 6 + Math.floor(Math.random() * 4), 1);
      this.perturbVertices(geo, 0.15);
      const mesh = new THREE.Mesh(geo, cfg.material);
      mesh.position.set(cfg.x, (cfg.scaleY * 0.5) - 2, cfg.z);
      mesh.scale.set(cfg.scaleX, cfg.scaleY, cfg.scaleZ);
      mesh.rotation.y = Math.random() * Math.PI;
      this.scene.add(mesh);
      this.mountains.push(mesh);
    }

    const ridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x506070,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.05,
    });

    for (let i = 0; i < 6; i++) {
      const geo = new THREE.ConeGeometry(1, 1, 5, 1);
      this.perturbVertices(geo, 0.2);
      const mesh = new THREE.Mesh(geo, ridgeMaterial);
      const side = i % 2 === 0 ? -1 : 1;
      mesh.position.set(
        side * (20 + Math.random() * 8),
        6 + Math.random() * 10,
        -25 + i * 12 + Math.random() * 5
      );
      mesh.scale.set(10 + Math.random() * 8, 12 + Math.random() * 10, 10 + Math.random() * 6);
      mesh.rotation.y = Math.random() * Math.PI;
      this.scene.add(mesh);
      this.mountains.push(mesh);
    }
  }

  private perturbVertices(geometry: THREE.BufferGeometry, amount: number): void {
    const posAttr = geometry.getAttribute('position');
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += (Math.random() - 0.5) * amount;
      arr[i + 1] += (Math.random() - 0.5) * amount;
      arr[i + 2] += (Math.random() - 0.5) * amount;
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(120, 100, 60, 60);
    const posAttr = groundGeo.getAttribute('position');
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i];
      const z = arr[i + 1];
      const distFromCenter = Math.abs(x);

      if (distFromCenter < 8) {
        arr[i + 2] = -0.5 + Math.random() * 0.3;
      } else {
        const t = (distFromCenter - 8) / 12;
        arr[i + 2] = t * t * 8 + Math.sin(x * 0.3 + z * 0.2) * 1.5 + Math.random() * 0.5;
      }
    }

    posAttr.needsUpdate = true;
    groundGeo.computeVertexNormals();

    const nonIndexed = groundGeo.toNonIndexed();
    nonIndexed.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5a6872,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.05,
    });

    const ground = new THREE.Mesh(nonIndexed, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.scene.add(ground);
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  update(): number {
    const delta = this.clock.getDelta();
    this.controls.update();
    this.composer.render();
    return delta;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.composer.dispose();
  }
}
