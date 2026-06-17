import * as THREE from 'three';
import { PlanetData, DisplayMode } from './types';

interface PlanetObject {
  mesh: THREE.Mesh;
  data: PlanetData;
  scaledOrbitRadius: number;
  angle: number;
  angularSpeed: number;
  orbitLine: THREE.Line;
  label: THREE.Sprite;
  ring?: THREE.Mesh;
  ringGeometry?: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  texture: THREE.CanvasTexture | null;
}

export class SceneBuilder {
  scene: THREE.Scene;
  sun: THREE.Mesh;
  sunLight: THREE.PointLight;
  sunGlow: THREE.Sprite;
  planets: PlanetObject[] = [];
  starField: THREE.Points;
  private displayMode: DisplayMode = { orbits: true, labels: false, texture: false };

  constructor() {
    this.scene = new THREE.Scene();
    this.starField = this.buildStarField();
    this.sun = this.buildSun();
    this.sunLight = this.buildSunLight();
    this.sunGlow = this.buildSunGlow();
  }

  build(planetsData: PlanetData[]): void {
    planetsData.forEach((data, index) => {
      const planet = this.buildPlanet(data, index);
      this.planets.push(planet);
    });
  }

  private buildSun(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(15, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    return mesh;
  }

  private buildSunLight(): THREE.PointLight {
    const light = new THREE.PointLight(0xffffff, 2, 1000);
    light.position.set(0, 0, 0);
    this.scene.add(light);
    return light;
  }

  private buildSunGlow(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255,235,59,0.6)');
    gradient.addColorStop(0.3, 'rgba(255,235,59,0.2)');
    gradient.addColorStop(1, 'rgba(255,235,59,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(60, 60, 1);
    this.scene.add(sprite);
    return sprite;
  }

  private buildStarField(): THREE.Points {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 500 + Math.random() * 500;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.7;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    return points;
  }

  private getScaledOrbitRadius(data: PlanetData, index: number): number {
    const baseOrbits = [25, 42, 60, 82, 120, 160, 200, 240];
    return baseOrbits[index];
  }

  private buildPlanet(data: PlanetData, index: number): PlanetObject {
    const scaledOrbitRadius = this.getScaledOrbitRadius(data, index);
    const geo = new THREE.SphereGeometry(data.radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x000000,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.planetName = data.name;

    const startAngle = (index / 8) * Math.PI * 2 + Math.random() * 0.5;
    mesh.position.set(
      scaledOrbitRadius * Math.cos(startAngle),
      0,
      scaledOrbitRadius * Math.sin(startAngle)
    );
    this.scene.add(mesh);

    const texture = this.createTexture(data);

    const orbitLine = this.buildOrbitLine(scaledOrbitRadius, data.color);
    const label = this.buildLabel(data, scaledOrbitRadius, data.radius);
    label.visible = this.displayMode.labels;

    let ring: THREE.Mesh | undefined;
    if (data.hasRing) {
      ring = this.buildSaturnRing(data, mesh);
    }

    const angularSpeed = Math.PI * 0.8 / Math.pow(data.distanceFromSun, 1.5);

    return {
      mesh,
      data,
      scaledOrbitRadius,
      angle: startAngle,
      angularSpeed,
      orbitLine,
      label,
      ring,
      material: mat,
      texture,
    };
  }

  private buildOrbitLine(scaledRadius: number, planetColor: string): THREE.Line {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        scaledRadius * Math.cos(theta),
        0,
        scaledRadius * Math.sin(theta)
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const color = new THREE.Color(planetColor);
    color.multiplyScalar(0.4);
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geo, mat);
    line.visible = this.displayMode.orbits;
    this.scene.add(line);
    return line;
  }

  private buildLabel(data: PlanetData, scaledRadius: number, planetRadius: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(data.name, 128, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(data.name, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(8, 2, 1);
    sprite.position.set(
      scaledRadius,
      planetRadius + 3,
      0
    );
    this.scene.add(sprite);
    return sprite;
  }

  private buildSaturnRing(data: PlanetData, parentMesh: THREE.Mesh): THREE.Mesh {
    const innerRadius = data.radius * 1.4;
    const outerRadius = data.radius * 2.8;
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);

    const ringTexture = this.createRingTexture(data);
    const mat = new THREE.MeshStandardMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      roughness: 0.9,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2 - (27 * Math.PI / 180);
    mesh.position.copy(parentMesh.position);
    mesh.userData.planetName = data.name;
    this.scene.add(mesh);
    return mesh;
  }

  private createRingTexture(data: PlanetData): THREE.CanvasTexture {
    const width = 1024;
    const height = 64;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const ringColor = new THREE.Color(data.ringColor || '#d7ccc8');

    for (let x = 0; x < width; x++) {
      const t = x / width;
      const distanceFromCenter = Math.abs(t - 0.5) * 2;

      const bandCount = 12;
      const bandPos = (t * bandCount) % 1;
      const bandVariation = Math.sin(t * Math.PI * bandCount) * 0.15 + 0.85;

      const opacity = Math.max(0, 1 - distanceFromCenter * 1.2) * bandVariation;

      const noise = (Math.random() - 0.5) * 0.1;
      const r = Math.min(1, Math.max(0, ringColor.r + noise));
      const g = Math.min(1, Math.max(0, ringColor.g + noise * 0.8));
      const b = Math.min(1, Math.max(0, ringColor.b + noise * 0.6));

      for (let y = 0; y < height; y++) {
        const alpha = opacity * (0.7 + Math.random() * 0.3);
        ctx.fillStyle = `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createTexture(data: PlanetData): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = data.color;
    ctx.fillRect(0, 0, size, size / 2);

    const imgData = ctx.getImageData(0, 0, size, size / 2);
    this.addPerlinNoise(imgData, 15, 0.3);

    switch (data.nameEn) {
      case 'Mercury':
        this.applyMercuryTexture(imgData, size);
        break;
      case 'Venus':
        this.applyVenusTexture(imgData, size);
        break;
      case 'Earth':
        this.applyEarthTexture(ctx, imgData, size);
        break;
      case 'Mars':
        this.applyMarsTexture(imgData, size);
        break;
      case 'Jupiter':
        this.applyJupiterTexture(ctx, imgData, size);
        break;
      case 'Saturn':
        this.applySaturnTexture(ctx, imgData, size);
        break;
      case 'Uranus':
        this.applyUranusTexture(imgData, size);
        break;
      case 'Neptune':
        this.applyNeptuneTexture(imgData, size);
        break;
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private addPerlinNoise(imgData: ImageData, scale: number, intensity: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const noise = this.generateNoiseGrid(w, h, scale);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const idx = i / 4;
      const n = noise[idx] * intensity * 255;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + n));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + n));
    }
  }

  private generateNoiseGrid(w: number, h: number, scale: number): Float32Array {
    const gridW = Math.ceil(w / scale) + 1;
    const gridH = Math.ceil(h / scale) + 1;
    const grid = new Float32Array(gridW * gridH);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = Math.random();
    }

    const result = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x / scale;
        const gy = y / scale;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const fx = gx - x0;
        const fy = gy - y0;

        const smoothFx = fx * fx * (3 - 2 * fx);
        const smoothFy = fy * fy * (3 - 2 * fy);

        const a = grid[y0 * gridW + x0];
        const b = grid[y0 * gridW + x0 + 1];
        const c = grid[(y0 + 1) * gridW + x0];
        const d = grid[(y0 + 1) * gridW + x0 + 1];

        const ab = a + smoothFx * (b - a);
        const cd = c + smoothFx * (d - c);
        result[y * w + x] = (ab + smoothFy * (cd - ab)) * 2 - 1;
      }
    }
    return result;
  }

  private applyMercuryTexture(imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const craterCount = 80;

    for (let i = 0; i < craterCount; i++) {
      const cx = Math.floor(Math.random() * w);
      const cy = Math.floor(Math.random() * h);
      const craterR = 2 + Math.floor(Math.random() * 15);
      const depth = 0.15 + Math.random() * 0.25;

      for (let dy = -craterR; dy <= craterR; dy++) {
        for (let dx = -craterR; dx <= craterR; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          if (px < 0 || px >= w || py < 0 || py >= h) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > craterR) continue;

          const idx = (py * w + px) * 4;
          const factor = 1 - (dist / craterR) * (dist / craterR);
          const darken = -depth * factor * 255;

          imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + darken));
          imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + darken));
          imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + darken));
        }
      }
    }
  }

  private applyVenusTexture(imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const noise = this.generateNoiseGrid(w, h, 40);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise[y * w + x];
        const swirl = Math.sin((y / h * 6) + (x / w * 2)) * 0.3 + n * 0.5;
        const brightness = swirl * 30;

        imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + brightness * 1.2));
        imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + brightness));
        imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + brightness * 0.8));
      }
    }
  }

  private applyEarthTexture(ctx: CanvasRenderingContext2D, imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;

    const oceanColors = { r: 26, g: 78, b: 138 };
    const deepOcean = { r: 15, g: 52, b: 96 };

    const landNoise = this.generateNoiseGrid(w, h, 60);
    const cloudNoise = this.generateNoiseGrid(w, h, 30);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = landNoise[y * w + x];
        const cn = cloudNoise[y * w + x];

        const lat = Math.abs((y / h) - 0.5) * 2;
        const polarFactor = Math.max(0, (lat - 0.75) / 0.25);

        if (n > 0.15) {
          const landAmount = (n - 0.15) / 0.85;
          let lr, lg, lb;

          if (landAmount < 0.3) {
            const t = landAmount / 0.3;
            lr = 194 + t * (46 - 194);
            lg = 178 + t * (139 - 178);
            lb = 128 + t * (87 - 128);
          } else if (landAmount < 0.6) {
            const t = (landAmount - 0.3) / 0.3;
            lr = 46 + t * (34 - 46);
            lg = 139 + t * (139 - 139);
            lb = 87 + t * (34 - 87);
          } else {
            const t = (landAmount - 0.6) / 0.4;
            lr = 34 + t * (180 - 34);
            lg = 139 + t * (180 - 139);
            lb = 34 + t * (180 - 34);
          }

          imgData.data[idx] = lr;
          imgData.data[idx + 1] = lg;
          imgData.data[idx + 2] = lb;
        } else {
          const depthFactor = (0.15 - n) / 0.15;
          imgData.data[idx] = oceanColors.r + (deepOcean.r - oceanColors.r) * depthFactor;
          imgData.data[idx + 1] = oceanColors.g + (deepOcean.g - oceanColors.g) * depthFactor;
          imgData.data[idx + 2] = oceanColors.b + (deepOcean.b - oceanColors.b) * depthFactor;
        }

        if (polarFactor > 0) {
          const iceAmount = polarFactor * (0.5 + Math.random() * 0.5);
          imgData.data[idx] = imgData.data[idx] * (1 - iceAmount) + 255 * iceAmount;
          imgData.data[idx + 1] = imgData.data[idx + 1] * (1 - iceAmount) + 255 * iceAmount;
          imgData.data[idx + 2] = imgData.data[idx + 2] * (1 - iceAmount) + 255 * iceAmount;
        }

        if (cn > 0.4) {
          const cloudAmount = (cn - 0.4) / 0.6 * 0.7;
          imgData.data[idx] = imgData.data[idx] * (1 - cloudAmount) + 255 * cloudAmount;
          imgData.data[idx + 1] = imgData.data[idx + 1] * (1 - cloudAmount) + 255 * cloudAmount;
          imgData.data[idx + 2] = imgData.data[idx + 2] * (1 - cloudAmount) + 255 * cloudAmount;
        }
      }
    }
  }

  private applyMarsTexture(imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const noise = this.generateNoiseGrid(w, h, 25);
    const darkNoise = this.generateNoiseGrid(w, h, 50);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise[y * w + x];
        const dn = darkNoise[y * w + x];

        const brightness = n * 25;
        const darkSpot = dn < -0.3 ? -35 : 0;

        imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + brightness + darkSpot));
        imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + brightness * 0.8 + darkSpot * 0.7));
        imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + brightness * 0.6 + darkSpot * 0.5));
      }
    }
  }

  private applyJupiterTexture(ctx: CanvasRenderingContext2D, imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const bands = 10;

    const bandColors = [
      { r: 228, g: 187, b: 143 },
      { r: 201, g: 147, b: 98 },
      { r: 240, g: 214, b: 180 },
      { r: 189, g: 132, b: 84 },
      { r: 235, g: 200, b: 160 },
      { r: 176, g: 115, b: 69 },
      { r: 228, g: 187, b: 143 },
      { r: 201, g: 147, b: 98 },
      { r: 240, g: 214, b: 180 },
      { r: 189, g: 132, b: 84 },
    ];

    const noise = this.generateNoiseGrid(w, h, 20);
    const waveNoise = this.generateNoiseGrid(w, h, 60);

    for (let y = 0; y < h; y++) {
      const bandIdx = Math.min(bands - 1, Math.floor((y / h) * bands));
      const bandColor = bandColors[bandIdx];
      const nextColor = bandColors[Math.min(bandIdx + 1, bands - 1)];
      const localT = ((y / h) * bands) % 1;
      const smoothT = localT * localT * (3 - 2 * localT);

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise[y * w + x];
        const wn = waveNoise[y * w + x];

        const waveOffset = wn * 0.15;
        const waveY = Math.min(1, Math.max(0, (y / h) + waveOffset * 0.05));
        const waveBandIdx = Math.min(bands - 1, Math.floor(waveY * bands));
        const waveBandColor = bandColors[waveBandIdx];
        const waveNextColor = bandColors[Math.min(waveBandIdx + 1, bands - 1)];
        const waveLocalT = (waveY * bands) % 1;
        const waveSmoothT = waveLocalT * waveLocalT * (3 - 2 * waveLocalT);

        let r = waveBandColor.r + (waveNextColor.r - waveBandColor.r) * waveSmoothT;
        let g = waveBandColor.g + (waveNextColor.g - waveBandColor.g) * waveSmoothT;
        let b = waveBandColor.b + (waveNextColor.b - waveBandColor.b) * waveSmoothT;

        const noiseBrightness = n * 15;
        r = Math.max(0, Math.min(255, r + noiseBrightness));
        g = Math.max(0, Math.min(255, g + noiseBrightness * 0.9));
        b = Math.max(0, Math.min(255, b + noiseBrightness * 0.8));

        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
      }
    }

    const spotX = w * 0.7;
    const spotY = h * 0.6;
    const spotR = 35;
    for (let dy = -spotR; dy <= spotR; dy++) {
      for (let dx = -spotR; dx <= spotR; dx++) {
        const px = Math.floor(spotX + dx);
        const py = Math.floor(spotY + dy * 0.6);
        if (px < 0 || px >= w || py < 0 || py >= h) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > spotR) continue;

        const idx = (py * w + px) * 4;
        const edge = dist / spotR;
        const factor = 1 - edge * edge;
        const spotAmount = factor * 0.8;

        const spotR2 = 190;
        const spotG = 70;
        const spotB = 50;

        imgData.data[idx] = imgData.data[idx] * (1 - spotAmount) + spotR2 * spotAmount;
        imgData.data[idx + 1] = imgData.data[idx + 1] * (1 - spotAmount) + spotG * spotAmount;
        imgData.data[idx + 2] = imgData.data[idx + 2] * (1 - spotAmount) + spotB * spotAmount;
      }
    }
  }

  private applySaturnTexture(ctx: CanvasRenderingContext2D, imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const bands = 8;

    const noise = this.generateNoiseGrid(w, h, 30);
    const waveNoise = this.generateNoiseGrid(w, h, 80);

    const baseColor = { r: 255, g: 213, b: 79 };

    for (let y = 0; y < h; y++) {
      const bandT = (y / h) * bands;
      const bandIdx = Math.floor(bandT);
      const localT = bandT % 1;
      const smoothT = localT * localT * (3 - 2 * localT);

      const bandVariation = Math.sin(bandIdx * 0.9) * 0.08 + 0.96;

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise[y * w + x];
        const wn = waveNoise[y * w + x];

        const waveOffset = wn * 0.1;
        const waveY = (y / h) + waveOffset * 0.03;
        const waveBandT = waveY * bands;
        const waveLocalT = waveBandT % 1;
        const waveSmoothT = waveLocalT * waveLocalT * (3 - 2 * waveLocalT);

        const shade = 0.88 + waveSmoothT * 0.12 + n * 0.06;

        let r = baseColor.r * shade * bandVariation;
        let g = baseColor.g * shade * (bandVariation - 0.02);
        let b = baseColor.b * shade * (bandVariation - 0.05);

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
      }
    }
  }

  private applyUranusTexture(imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const noise = this.generateNoiseGrid(w, h, 40);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise[y * w + x];

        const lat = Math.abs((y / h) - 0.5);
        const bandVariation = Math.sin(y / h * Math.PI * 5) * 0.04 + 0.98;

        const brightness = n * 12 * bandVariation;
        imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + brightness * 0.7));
        imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + brightness));
        imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + brightness * 1.1));
      }
    }
  }

  private applyNeptuneTexture(imgData: ImageData, size: number): void {
    const w = imgData.width;
    const h = imgData.height;
    const noise = this.generateNoiseGrid(w, h, 35);
    const darkNoise = this.generateNoiseGrid(w, h, 60);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise[y * w + x];
        const dn = darkNoise[y * w + x];

        const brightness = n * 18;
        const bandVar = Math.sin(y / h * Math.PI * 7) * 8;

        if (dn > 0.5) {
          const darkSpot = (dn - 0.5) / 0.5 * 25;
          imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + brightness + bandVar - darkSpot * 0.5));
          imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + brightness + bandVar - darkSpot * 0.3));
          imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + brightness + bandVar + darkSpot));
        } else {
          imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + brightness + bandVar));
          imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + brightness + bandVar));
          imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + brightness + bandVar));
        }
      }
    }
  }

  update(deltaTime: number, timeMultiplier: number): void {
    for (const planet of this.planets) {
      planet.angle += planet.angularSpeed * deltaTime * timeMultiplier;
      const x = planet.scaledOrbitRadius * Math.cos(planet.angle);
      const z = planet.scaledOrbitRadius * Math.sin(planet.angle);
      planet.mesh.position.set(x, 0, z);
      planet.mesh.rotation.y += 0.01 * timeMultiplier;

      if (planet.label) {
        planet.label.position.set(x, planet.data.radius + 3, z);
      }

      if (planet.ring) {
        planet.ring.position.set(x, 0, z);
      }
    }
  }

  toggleOrbits(visible: boolean): void {
    this.displayMode.orbits = visible;
    for (const planet of this.planets) {
      planet.orbitLine.visible = visible;
    }
  }

  toggleLabels(visible: boolean): void {
    this.displayMode.labels = visible;
    for (const planet of this.planets) {
      planet.label.visible = visible;
    }
  }

  toggleTexture(enabled: boolean): void {
    this.displayMode.texture = enabled;
    for (const planet of this.planets) {
      if (enabled && planet.texture) {
        planet.material.map = planet.texture;
      } else {
        planet.material.map = null;
      }
      planet.material.needsUpdate = true;
    }
  }

  highlightPlanet(name: string): void {
    for (const planet of this.planets) {
      if (planet.data.name === name) {
        planet.material.emissive = new THREE.Color(0x333333);
      } else {
        planet.material.emissive = new THREE.Color(0x000000);
      }
    }
  }

  clearHighlight(): void {
    for (const planet of this.planets) {
      planet.material.emissive = new THREE.Color(0x000000);
    }
  }

  getPlanetMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const planet of this.planets) {
      meshes.push(planet.mesh);
      if (planet.ring) {
        meshes.push(planet.ring);
      }
    }
    return meshes;
  }

  getPlanetDataByMesh(mesh: THREE.Mesh): PlanetData | undefined {
    for (const planet of this.planets) {
      if (planet.mesh === mesh || planet.ring === mesh) {
        return planet.data;
      }
    }
    return undefined;
  }
}
