import * as THREE from 'three';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private cameraRadius: number = 22;
  private targetTheta: number = this.cameraTheta;
  private targetPhi: number = this.cameraPhi;
  private targetRadius: number = this.cameraRadius;
  private autoRotate: boolean = true;
  private autoRotateSpeed: number = 0.05;
  private minPhi: number = 0.3;
  private maxPhi: number = Math.PI / 2 - 0.1;
  private minRadius: number = 8;
  private maxRadius: number = 40;
  private dampingFactor: number = 0.08;

  private lookAtTarget: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  private defaultTheta: number;
  private defaultPhi: number;
  private defaultRadius: number;

  private touchStartDist: number = 0;
  private isTouchDragging: boolean = false;
  private singleTouchTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTapTime: number = 0;

  constructor(container: HTMLElement) {
    this.defaultTheta = this.cameraTheta;
    this.defaultPhi = this.cameraPhi;
    this.defaultRadius = this.cameraRadius;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLighting();
    this.setupBackground();
    this.updateCameraPosition();
    this.setupControls(container);
    this.setupResize(container);
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x6644aa, 0.4);
    this.scene.add(ambient);

    const pointLight1 = new THREE.PointLight(0xff66cc, 2.0, 30);
    pointLight1.position.set(8, 10, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x33ccff, 2.0, 30);
    pointLight2.position.set(-8, 8, -5);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xaa44ff, 1.5, 25);
    pointLight3.position.set(0, 12, 0);
    this.scene.add(pointLight3);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(0, 20, 10);
    this.scene.add(dirLight);
  }

  private setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0015');
    gradient.addColorStop(0.4, '#120025');
    gradient.addColorStop(0.7, '#0d0020');
    gradient.addColorStop(1, '#050010');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    this.scene.background = texture;

    const fog = new THREE.FogExp2(0x0a0015, 0.02);
    this.scene.fog = fog;
  }

  private updateCameraPosition() {
    const x = this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.lookAtTarget);
  }

  private setupControls(container: HTMLElement) {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.previousMouse.x = e.clientX;
        this.previousMouse.y = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.targetTheta -= dx * 0.005;
      this.targetPhi += dy * 0.005;
      this.targetPhi = THREE.MathUtils.clamp(this.targetPhi, this.minPhi, this.maxPhi);
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
      this.autoRotate = false;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      setTimeout(() => {
        if (!this.isDragging) this.autoRotate = true;
      }, 3000);
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetRadius += e.deltaY * 0.02;
      this.targetRadius = THREE.MathUtils.clamp(this.targetRadius, this.minRadius, this.maxRadius);
    }, { passive: false });

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isTouchDragging = true;
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isTouchDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isTouchDragging) {
        const dx = e.touches[0].clientX - this.previousMouse.x;
        const dy = e.touches[0].clientY - this.previousMouse.y;
        this.targetTheta -= dx * 0.005;
        this.targetPhi += dy * 0.005;
        this.targetPhi = THREE.MathUtils.clamp(this.targetPhi, this.minPhi, this.maxPhi);
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
        this.autoRotate = false;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = this.touchStartDist - dist;
        this.targetRadius += delta * 0.05;
        this.targetRadius = THREE.MathUtils.clamp(this.targetRadius, this.minRadius, this.maxRadius);
        this.touchStartDist = dist;
      }
    }, { passive: false });

    el.addEventListener('touchend', () => {
      this.isTouchDragging = false;
      setTimeout(() => {
        this.autoRotate = true;
      }, 3000);
    });
  }

  private setupResize(container: HTMLElement) {
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  resetView() {
    this.targetTheta = this.defaultTheta;
    this.targetPhi = this.defaultPhi;
    this.targetRadius = this.defaultRadius;
    this.autoRotate = true;
  }

  update() {
    const delta = this.clock.getDelta();

    if (this.autoRotate) {
      this.targetTheta += this.autoRotateSpeed * delta;
    }

    this.cameraTheta += (this.targetTheta - this.cameraTheta) * this.dampingFactor;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * this.dampingFactor;
    this.cameraRadius += (this.targetRadius - this.cameraRadius) * this.dampingFactor;

    this.updateCameraPosition();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
