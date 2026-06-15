import * as THREE from 'three';

export interface SceneInitResult {
  scene: THREE.Scene;
  starField: THREE.Points;
  groundGrid: THREE.GridHelper;
  ambientLight: THREE.AmbientLight;
  rimLight: THREE.DirectionalLight;
  stratumTexture: THREE.Texture;
  stratumPlane: THREE.Mesh;
}

export class SceneInit {
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0C10);
    this.scene.fog = new THREE.Fog(0x0B0C10, 15, 40);
  }

  public init(): SceneInitResult {
    const starField = this.createStarField();
    const groundGrid = this.createGroundGrid();
    const ambientLight = this.createAmbientLight();
    const rimLight = this.createRimLight();
    const { texture: stratumTexture, plane: stratumPlane } = this.createStratumTexture();

    this.scene.add(starField);
    this.scene.add(groundGrid);
    this.scene.add(ambientLight);
    this.scene.add(rimLight);
    this.scene.add(stratumPlane);

    return {
      scene: this.scene,
      starField,
      groundGrid,
      ambientLight,
      rimLight,
      stratumTexture,
      stratumPlane
    };
  }

  private createStarField(): THREE.Points {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      sizes[i] = 0.01 + Math.random() * 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    stars.name = 'starField';
    return stars;
  }

  private createGroundGrid(): THREE.GridHelper {
    const size = 30;
    const divisions = 30;
    const grid = new THREE.GridHelper(size, divisions, 0x45A29E, 0x1F2833);
    grid.position.y = -2;
    grid.material.transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    grid.name = 'groundGrid';
    return grid;
  }

  private createAmbientLight(): THREE.AmbientLight {
    const color = new THREE.Color().setHSL(0.6, 0.1, 0.85);
    const tempKelvin = 6500;
    this.applyColorTemperature(color, tempKelvin);
    const light = new THREE.AmbientLight(color, 0.4);
    light.name = 'ambientLight';
    return light;
  }

  private createRimLight(): THREE.DirectionalLight {
    const color = new THREE.Color().setHSL(0.1, 0.2, 0.8);
    const tempKelvin = 4500;
    this.applyColorTemperature(color, tempKelvin);
    const light = new THREE.DirectionalLight(color, 0.6);
    light.position.set(-5, 8, -5);
    light.name = 'rimLight';
    return light;
  }

  private applyColorTemperature(color: THREE.Color, kelvin: number): void {
    const temp = kelvin / 100;
    let red: number, green: number, blue: number;

    if (temp <= 66) {
      red = 255;
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
    }

    if (temp >= 66) {
      blue = 255;
    } else if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    }

    red = Math.min(255, Math.max(0, red)) / 255;
    green = Math.min(255, Math.max(0, green)) / 255;
    blue = Math.min(255, Math.max(0, blue)) / 255;

    color.setRGB(red * color.r, green * color.g, blue * color.b);
  }

  private createStratumTexture(): { texture: THREE.Texture; plane: THREE.Mesh } {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(512, 512);
    const data = imageData.data;

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const idx = (y * 512 + x) * 4;
        
        const noise1 = this.valueNoise(x * 0.02, y * 0.02);
        const noise2 = this.valueNoise(x * 0.08 + 100, y * 0.08 + 100);
        const noise3 = this.valueNoise(x * 0.005, y * 0.005 + 50);
        const combined = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);

        const layerFactor = y / 512;
        
        const baseR = 80 + layerFactor * 40;
        const baseG = 60 + layerFactor * 30;
        const baseB = 40 + layerFactor * 20;

        const variation = combined * 60;
        const layerStripe = Math.sin(y * 0.05 + noise3 * 5) * 15;

        data[idx] = Math.min(255, Math.max(0, baseR + variation + layerStripe));
        data[idx + 1] = Math.min(255, Math.max(0, baseG + variation * 0.8 + layerStripe));
        data[idx + 2] = Math.min(255, Math.max(0, baseB + variation * 0.6 + layerStripe));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(12, 12);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1.95;
    plane.position.set(0, -1.95, 0);
    plane.name = 'stratumPlane';

    return { texture, plane };
  }

  private valueNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const v00 = this.hash(xi, yi);
    const v10 = this.hash(xi + 1, yi);
    const v01 = this.hash(xi, yi + 1);
    const v11 = this.hash(xi + 1, yi + 1);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const x0 = v00 + (v10 - v00) * u;
    const x1 = v01 + (v11 - v01) * u;

    return x0 + (x1 - x0) * v;
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }
}
