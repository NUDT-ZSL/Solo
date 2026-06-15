import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public clock: THREE.Clock;

  private container: HTMLElement;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private spherical: { radius: number; theta: number; phi: number };
  private targetSpherical: { radius: number; theta: number; phi: number };

  private readonly MIN_RADIUS = 15;
  private readonly MAX_RADIUS = 120;
  private readonly MIN_PHI = 0.1;
  private readonly MAX_PHI = Math.PI - 0.1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.spherical = { radius: 50, theta: Math.PI * 0.25, phi: Math.PI * 0.35 };
    this.targetSpherical = { ...this.spherical };

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupBackground();
    this.setupFog();
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera.position.set(50, 40, 50);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x7c4dff, 0x00838f, 0.4);
    this.scene.add(hemisphereLight);

    const pointLight1 = new THREE.PointLight(0xffd700, 2, 100);
    pointLight1.position.set(-20, 10, -20);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4fc3f7, 2, 100);
    pointLight2.position.set(20, 5, 20);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff4081, 1.5, 80);
    pointLight3.position.set(0, 15, 0);
    this.scene.add(pointLight3);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.3, '#1a1a4e');
    gradient.addColorStop(0.6, '#2d1b69');
    gradient.addColorStop(1, '#0d0015');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupFog(): void {
    this.scene.fog = new THREE.FogExp2(0x1a0a3e, 0.008);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.targetSpherical.theta -= deltaX * 0.005;
    this.targetSpherical.phi = Math.max(
      this.MIN_PHI,
      Math.min(this.MAX_PHI, this.targetSpherical.phi - deltaY * 0.005)
    );

    this.previousMouse = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.previousMouse.x;
    const deltaY = e.touches[0].clientY - this.previousMouse.y;

    this.targetSpherical.theta -= deltaX * 0.005;
    this.targetSpherical.phi = Math.max(
      this.MIN_PHI,
      Math.min(this.MAX_PHI, this.targetSpherical.phi - deltaY * 0.005)
    );

    this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    this.targetSpherical.radius = Math.max(
      this.MIN_RADIUS,
      Math.min(this.MAX_RADIUS, this.targetSpherical.radius * zoomFactor)
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCameraPosition(): void {
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.08;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.08;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.08;

    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  public resetView(): void {
    this.targetSpherical = { radius: 50, theta: Math.PI * 0.25, phi: Math.PI * 0.35 };
  }

  public render(callback?: (delta: number, elapsed: number) => void): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.updateCameraPosition();

      if (callback) {
        callback(delta, elapsed);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public getRaycaster(): { raycaster: THREE.Raycaster; mouse: THREE.Vector2 } {
    return {
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2()
    };
  }

  public setFogColor(color: string): void {
    const c = new THREE.Color(color);
    (this.scene.fog as THREE.FogExp2).color = c;
  }
}
