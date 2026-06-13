import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateGlacierData, START_YEAR } from './data';
import type { GlacierRegion } from './data';
import { GlacierMap } from './map';
import { GlacierUI } from './ui';
import type { UICallbacks } from './ui';

const SPHERE_RADIUS = 5;
const INITIAL_CAMERA_DISTANCE = 18;
const INITIAL_POLAR_ANGLE = Math.PI / 3;
const MOBILE_CAMERA_DISTANCE = 22;

class GlacialDriftApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private glacierMap: GlacierMap;
  private ui: GlacierUI;
  private regions: GlacierRegion[];
  private currentYear: number = START_YEAR;
  private clock = new THREE.Clock();
  private isResetting = false;
  private resetStartPos = new THREE.Vector3();
  private resetTargetPos = new THREE.Vector3();
  private resetProgress = 0;
  private selectedRegion: GlacierRegion | null = null;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.setInitialCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 40;
    this.controls.enablePan = true;

    this.addLights();

    this.regions = generateGlacierData();

    this.glacierMap = new GlacierMap(this.scene);
    this.glacierMap.loadRegions(this.regions, this.currentYear);

    const callbacks: UIBallbacks = {
      onYearChange: (year: number) => this.onYearChange(year),
      onResetCamera: () => this.onResetCamera(),
      onPlayToggle: (playing: boolean) => {},
    };

    this.ui = new GlacierUI(container, callbacks);
    this.ui.setYear(this.currentYear);
    this.ui.setVolume(this.glacierMap.getTotalVolume(this.currentYear));

    this.glacierMap.setOnBarClick((region) => this.onBarClick(region));
    this.glacierMap.setOnBarHover((region) => this.onBarHover(region));

    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 15, 10);
    this.scene.add(directional);

    const point = new THREE.PointLight(0x3366cc, 0.4, 50);
    point.position.set(-10, -5, -10);
    this.scene.add(point);

    const rim = new THREE.DirectionalLight(0x6633ff, 0.3);
    rim.position.set(-5, 10, -10);
    this.scene.add(rim);
  }

  private setInitialCameraPosition(): void {
    const width = window.innerWidth;
    const distance = width < 768 ? MOBILE_CAMERA_DISTANCE : INITIAL_CAMERA_DISTANCE;
    this.camera.position.set(
      distance * Math.sin(INITIAL_POLAR_ANGLE),
      distance * Math.cos(INITIAL_POLAR_ANGLE) * 0.5,
      distance * Math.cos(INITIAL_POLAR_ANGLE),
    );
    this.camera.lookAt(0, 0, 0);
  }

  private onYearChange(year: number): void {
    this.currentYear = year;
    this.glacierMap.updateYear(year);
    this.ui.setVolume(this.glacierMap.getTotalVolume(year));
    if (this.selectedRegion) {
      this.ui.updateDetailYear(year);
    }
  }

  private onResetCamera(): void {
    this.isResetting = true;
    this.resetProgress = 0;
    this.resetStartPos.copy(this.camera.position);
    const width = window.innerWidth;
    const distance = width < 768 ? MOBILE_CAMERA_DISTANCE : INITIAL_CAMERA_DISTANCE;
    this.resetTargetPos.set(
      distance * Math.sin(INITIAL_POLAR_ANGLE),
      distance * Math.cos(INITIAL_POLAR_ANGLE) * 0.5,
      distance * Math.cos(INITIAL_POLAR_ANGLE),
    );
  }

  private onBarClick(region: GlacierRegion): void {
    this.selectedRegion = region;
    this.ui.showDetail(region, this.currentYear);
  }

  private onBarHover(_region: GlacierRegion | null): void {
    this.renderer.domElement.style.cursor = _region ? 'pointer' : 'grab';
  }

  private onClick(event: MouseEvent): void {
    const region = this.glacierMap.handleClick(event, this.camera);
    if (region) {
      this.onBarClick(region);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.glacierMap.handleMouseMove(event, this.camera);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    if (this.isResetting) {
      this.resetProgress += delta / 1.5;
      if (this.resetProgress >= 1) {
        this.resetProgress = 1;
        this.isResetting = false;
      }
      const t = this.easeInOutCubic(this.resetProgress);
      this.camera.position.lerpVectors(this.resetStartPos, this.resetTargetPos, t);
      this.camera.lookAt(0, 0, 0);
    }

    this.controls.update();
    this.glacierMap.updateAnimation(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

new GlacialDriftApp();
