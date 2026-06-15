import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VineGenerator, Vine } from './vineGenerator';
import { VineRenderer } from './renderer';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private vineGenerator: VineGenerator;
  private vineRenderer: VineRenderer;
  private ground!: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private timeScale = 1;
  private totalTime = 0;
  private lastTime = 0;
  private spacePressed = false;

  private statusBar!: HTMLElement;
  private infoCard!: HTMLElement;
  private infoAge!: HTMLElement;
  private infoLevel!: HTMLElement;
  private infoStage!: HTMLElement;
  private infoVineId: number | null = null;
  private infoNodeIdx: number | null = null;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 12, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 1, 0);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null
    };

    this.vineGenerator = new VineGenerator();
    this.vineRenderer = new VineRenderer(this.scene);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupGround();
    this.setupUI();
    this.setupEvents();

    this.lastTime = performance.now();
    requestAnimationFrame(this.animate.bind(this));
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x405040, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffee, 1.2);
    dirLight.position.set(8, 15, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x88aa88, 0.4);
    fillLight.position.set(-10, 8, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x44ff88, 0.3, 50);
    rimLight.position.set(-5, 10, -10);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(30, 64);
    const positions = groundGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      positions.setZ(i, z + (Math.random() - 0.5) * 0.05);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,
      transparent: true,
      opacity: 0.75,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private setupUI(): void {
    this.statusBar = document.getElementById('status-bar')!;
    this.infoCard = document.getElementById('info-card')!;
    this.infoAge = document.getElementById('info-age')!;
    this.infoLevel = document.getElementById('info-level')!;
    this.infoStage = document.getElementById('info-stage')!;

    setTimeout(() => {
      const panel = document.getElementById('guide-panel');
      if (panel) {
        panel.classList.add('visible');
      }
    }, 2000);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spacePressed = true;
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spacePressed = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    if (this.spacePressed) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      this.timeScale = Math.max(1, Math.min(8, this.timeScale + delta));
    }
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectGround(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  private onPointerDown(e: PointerEvent): void {
    this.updateMouse(e);

    if (e.button === 2) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hitPoint = this.raycaster.ray.origin.clone().add(
        this.raycaster.ray.direction.clone().multiplyScalar(15)
      );
      const found = this.vineGenerator.findNearestNode(hitPoint, 2);
      if (found) {
        this.showInfoCard(found.vineId, found.nodeIdx, e.clientX, e.clientY);
      } else {
        this.hideInfoCard();
      }
      return;
    }

    if (e.button === 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const vines = this.vineGenerator.getAllVines();
      for (const vine of vines) {
        for (let i = 0; i < vine.flowers.length; i++) {
          const flower = vine.flowers[i];
          if (!flower.fruitReady) continue;
          const dist = this.raycaster.ray.distanceToPoint(flower.position);
          if (dist < 0.5) {
            this.pickFruit(vine.id, i);
            return;
          }
        }
      }

      const point = this.intersectGround();
      if (point) {
        this.plantSeed(point);
      }
    }
  }

  private plantSeed(position: THREE.Vector3): void {
    const vine = this.vineGenerator.createVine(position);
    this.vineRenderer.createSeed(vine.id, position);
  }

  private pickFruit(vineId: number, flowerIdx: number): void {
    const vine = this.vineGenerator.getVine(vineId);
    if (!vine) return;
    const flower = vine.flowers[flowerIdx];
    if (!flower) return;
    const pos = flower.position.clone();
    if (this.vineGenerator.pickFruit(vineId, flowerIdx)) {
      this.vineRenderer.addFruitBurst(pos);
    }
  }

  private showInfoCard(vineId: number, nodeIdx: number, x: number, y: number): void {
    const vine = this.vineGenerator.getVine(vineId);
    if (!vine) return;
    const node = vine.nodes[nodeIdx];
    if (!node) return;

    this.infoVineId = vineId;
    this.infoNodeIdx = nodeIdx;

    this.infoCard.style.display = 'block';
    this.infoCard.style.left = `${x + 10}px`;
    this.infoCard.style.top = `${y + 10}px`;

    this.infoAge.textContent = `${vine.totalAge.toFixed(1)}s`;
    this.infoLevel.textContent = `${node.level}`;
    this.infoStage.textContent = this.vineRenderer.getStageName(vine.stage);
  }

  private hideInfoCard(): void {
    this.infoCard.style.display = 'none';
    this.infoVineId = null;
    this.infoNodeIdx = null;
  }

  private updateInfoCard(): void {
    if (this.infoVineId === null || this.infoNodeIdx === null) return;
    const vine = this.vineGenerator.getVine(this.infoVineId);
    if (!vine) {
      this.hideInfoCard();
      return;
    }
    const node = vine.nodes[this.infoNodeIdx];
    if (!node) {
      this.hideInfoCard();
      return;
    }
    this.infoAge.textContent = `${vine.totalAge.toFixed(1)}s`;
    this.infoLevel.textContent = `${node.level}`;
    this.infoStage.textContent = this.vineRenderer.getStageName(vine.stage);
  }

  private updateStatusBar(): void {
    const minutes = Math.floor(this.totalTime / 60);
    const seconds = Math.floor(this.totalTime % 60);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.statusBar.textContent = `x${this.timeScale.toFixed(1)} - ${timeStr}`;
  }

  private animate(currentTime: number): void {
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;
    this.totalTime += dt * this.timeScale;

    const sparks = this.vineGenerator.update(dt, this.timeScale);
    for (const spark of sparks) {
      this.vineRenderer.addBoundarySpark(spark.position);
    }

    const vines = this.vineGenerator.getAllVines();
    for (const vine of vines) {
      if (vine.isSinking) {
        this.vineRenderer.updateSeed(vine.id, vine.sinkProgress, this.totalTime);
      }
      this.vineRenderer.renderVine(vine, this.totalTime, this.timeScale);
    }

    this.vineRenderer.updateParticles(dt, this.timeScale);

    this.controls.update();
    this.updateInfoCard();
    this.updateStatusBar();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
