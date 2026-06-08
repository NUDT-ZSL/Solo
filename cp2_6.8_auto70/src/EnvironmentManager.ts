import * as THREE from 'three';

interface ColorStop {
  time: number;
  color: THREE.Color;
}

export class EnvironmentManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private groundMesh: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private currentTime: number = 12;

  private skyColorStops: ColorStop[] = [
    { time: 0, color: new THREE.Color('#0B0B2E') },
    { time: 5, color: new THREE.Color('#0B0B2E') },
    { time: 6.5, color: new THREE.Color('#FF7F50') },
    { time: 10, color: new THREE.Color('#87CEEB') },
    { time: 16, color: new THREE.Color('#87CEEB') },
    { time: 18.5, color: new THREE.Color('#FF7F50') },
    { time: 20, color: new THREE.Color('#0B0B2E') },
    { time: 24, color: new THREE.Color('#0B0B2E') },
  ];

  private static readonly GROUND_REFLECTIVITY_DAY = 0.2;
  private static readonly GROUND_REFLECTIVITY_NIGHT = 0.05;
  public static readonly TIME_MIN = 0;
  public static readonly TIME_MAX = 24;
  public static readonly TIME_STEP = 0.1;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    this.createGround();
    this.createGrid();
    this.updateEnvironment();
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(22, 22);
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
    });

    this.groundMesh = new THREE.Mesh(geometry, material);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  private createGrid(): void {
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      0x444444,
      0x444444
    );
    gridHelper.position.y = 0.001;
    this.scene.add(gridHelper);
  }

  public setTime(time: number): void {
    const clamped = Math.max(
      EnvironmentManager.TIME_MIN,
      Math.min(EnvironmentManager.TIME_MAX, time)
    );
    this.currentTime = Math.round(clamped * 10) / 10;
    this.updateEnvironment();
  }

  public getTime(): number {
    return this.currentTime;
  }

  public isNight(): boolean {
    return this.currentTime < 6 || this.currentTime > 20;
  }

  public getNightTransitionProgress(): number {
    const t = this.currentTime;
    if (t <= 5 || t >= 21) return 1;
    if (t >= 7 && t <= 19) return 0;
    if (t > 5 && t < 7) {
      return 1 - (t - 5) / 2;
    }
    return (t - 19) / 2;
  }

  private updateEnvironment(): void {
    const skyColor = this.interpolateColor(this.skyColorStops, this.currentTime);
    this.scene.background = skyColor;

    this.updateSunPosition();
    this.updateLighting();
    this.updateGroundReflectivity();
  }

  private interpolateColor(stops: ColorStop[], time: number): THREE.Color {
    if (stops.length === 0) return new THREE.Color(0x000000);
    if (time <= stops[0].time) return stops[0].color.clone();
    if (time >= stops[stops.length - 1].time)
      return stops[stops.length - 1].color.clone();

    for (let i = 0; i < stops.length - 1; i++) {
      const curr = stops[i];
      const next = stops[i + 1];
      if (time >= curr.time && time <= next.time) {
        const t = (time - curr.time) / (next.time - curr.time);
        return curr.color.clone().lerp(next.color, t);
      }
    }

    return stops[stops.length - 1].color.clone();
  }

  private updateSunPosition(): void {
    const t = this.currentTime;
    const azimuth = ((t - 6) / 12) * Math.PI;
    const elevation = Math.sin(((t - 6) / 12) * Math.PI) * (Math.PI / 2.5);

    const distance = 20;
    const sunX = Math.cos(azimuth) * Math.cos(elevation) * distance;
    const sunY = Math.max(0.5, Math.sin(elevation) * distance);
    const sunZ = Math.sin(azimuth) * Math.cos(elevation) * distance * 0.5;

    this.directionalLight.position.set(sunX, sunY, sunZ);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();
  }

  private updateLighting(): void {
    const t = this.currentTime;
    let directionalIntensity: number;
    let ambientIntensity: number;

    if (t >= 6 && t <= 18) {
      const dayProgress = (t - 6) / 12;
      const middayFactor = Math.sin(dayProgress * Math.PI);
      directionalIntensity = 0.6 + middayFactor * 0.6;
      ambientIntensity = 0.4 + middayFactor * 0.3;
    } else {
      let nightProgress: number;
      if (t < 6) {
        nightProgress = 1 - t / 6;
      } else {
        nightProgress = (t - 18) / 6;
      }
      nightProgress = Math.min(1, Math.max(0, nightProgress));
      directionalIntensity = 0.1 + (1 - nightProgress) * 0.4;
      ambientIntensity = 0.15 + (1 - nightProgress) * 0.25;
    }

    this.directionalLight.intensity = directionalIntensity;
    this.ambientLight.intensity = ambientIntensity;

    const sunColor = this.interpolateColor(
      [
        { time: 0, color: new THREE.Color('#2a2a5e') },
        { time: 6, color: new THREE.Color('#ffaa66') },
        { time: 12, color: new THREE.Color('#ffffff') },
        { time: 18, color: new THREE.Color('#ff8844') },
        { time: 24, color: new THREE.Color('#2a2a5e') },
      ],
      t
    );
    this.directionalLight.color = sunColor;

    const ambientColor = this.interpolateColor(
      [
        { time: 0, color: new THREE.Color('#1a1a3e') },
        { time: 6, color: new THREE.Color('#ffccaa') },
        { time: 12, color: new THREE.Color('#e8f4ff') },
        { time: 18, color: new THREE.Color('#ffbb88') },
        { time: 24, color: new THREE.Color('#1a1a3e') },
      ],
      t
    );
    this.ambientLight.color = ambientColor;
  }

  private updateGroundReflectivity(): void {
    if (!this.groundMesh) return;

    const nightFactor = this.getNightTransitionProgress();
    const reflectivity =
      EnvironmentManager.GROUND_REFLECTIVITY_DAY * (1 - nightFactor) +
      EnvironmentManager.GROUND_REFLECTIVITY_NIGHT * nightFactor;

    const material = this.groundMesh.material as THREE.MeshStandardMaterial;
    material.metalness = reflectivity * 0.5;
    material.roughness = 0.9 - reflectivity * 0.3;

    const groundColor = this.interpolateColor(
      [
        { time: 0, color: new THREE.Color('#222222') },
        { time: 6, color: new THREE.Color('#555555') },
        { time: 12, color: new THREE.Color('#666666') },
        { time: 18, color: new THREE.Color('#555555') },
        { time: 24, color: new THREE.Color('#222222') },
      ],
      this.currentTime
    );
    material.color = groundColor;
  }

  public getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  public getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  public static formatTime(time: number): string {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
