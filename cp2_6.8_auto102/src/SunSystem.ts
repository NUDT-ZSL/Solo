import * as THREE from 'three';

export interface SunPosition {
  azimuth: number;
  elevation: number;
  direction: THREE.Vector3;
}

export class SunSystem {
  private scene: THREE.Scene;
  public directionalLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public sunMesh: THREE.Mesh;
  public sunLightHelper: THREE.Object3D;
  private sunGlow: THREE.Mesh;

  private dayOfYear: number = 172;
  private timeOfDay: number = 12.5;
  private readonly latitude: number = 40;
  private readonly sunDistance: number = 50;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -60;
    this.directionalLight.shadow.camera.right = 60;
    this.directionalLight.shadow.camera.top = 60;
    this.directionalLight.shadow.camera.bottom = -60;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    const sunGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sunMesh);

    const glowGeometry = new THREE.SphereGeometry(10, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xFFD700) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.65 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.1);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    this.sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(this.sunGlow);

    this.sunLightHelper = new THREE.Object3D();
  }

  public setTime(dayOfYear: number, timeOfDay: number): void {
    this.dayOfYear = Math.max(1, Math.min(365, dayOfYear));
    this.timeOfDay = Math.max(6, Math.min(18, timeOfDay));
    this.updateSunPosition();
  }

  public getDayOfYear(): number {
    return this.dayOfYear;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public getSunPosition(): SunPosition {
    const { azimuth, elevation, direction } = this.calculateSunPosition();
    return { azimuth, elevation, direction };
  }

  private calculateSunPosition(): SunPosition {
    const declination = 23.5 * Math.cos((2 * Math.PI * (this.dayOfYear - 172)) / 365);
    const noonElevation = 90 - Math.abs(this.latitude - declination);
    const hourAngle = (this.timeOfDay - 12) * 15;

    const latRad = (this.latitude * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;
    const haRad = (hourAngle * Math.PI) / 180;

    const sinElevation =
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = (Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180) / Math.PI;

    let cosAzimuth =
      (Math.sin(decRad) - Math.sin(latRad) * Math.sin((elevation * Math.PI) / 180)) /
      (Math.cos(latRad) * Math.cos((elevation * Math.PI) / 180));
    cosAzimuth = Math.max(-1, Math.min(1, cosAzimuth));
    let azimuth = (Math.acos(cosAzimuth) * 180) / Math.PI;
    if (hourAngle > 0) azimuth = 360 - azimuth;

    const azRad = (azimuth * Math.PI) / 180;
    const elRad = (elevation * Math.PI) / 180;

    const x = Math.cos(elRad) * Math.sin(azRad);
    const y = Math.sin(elRad);
    const z = Math.cos(elRad) * Math.cos(azRad);

    const direction = new THREE.Vector3(x, y, z).normalize();

    return { azimuth, elevation, direction };
  }

  private updateSunPosition(): void {
    const { direction } = this.calculateSunPosition();

    const lightPos = direction.clone().multiplyScalar(this.sunDistance);
    this.directionalLight.position.copy(lightPos);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();

    this.sunMesh.position.copy(lightPos);
    this.sunGlow.position.copy(lightPos);

    if (this.directionalLight.shadow.camera instanceof THREE.OrthographicCamera) {
      this.directionalLight.shadow.camera.updateProjectionMatrix();
    }
  }

  public updateSunGlow(camera: THREE.Camera): void {
    const viewVector = new THREE.Vector3().subVectors(camera.position, this.sunGlow.position);
    (this.sunGlow.material as THREE.ShaderMaterial).uniforms.viewVector.value = viewVector;
  }

  public initialize(): void {
    this.updateSunPosition();
  }
}
