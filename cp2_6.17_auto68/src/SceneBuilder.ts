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
    const geo = new THREE.SphereGeometry(data.radius, 32, 32);
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

    const orbitLine = this.buildOrbitLine(scaledOrbitRadius);
    const label = this.buildLabel(data, scaledOrbitRadius, data.radius);
    label.visible = this.displayMode.labels;

    let ring: THREE.Mesh | undefined;
    if (data.hasRing) {
      ring = this.buildRing(data, mesh);
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

  private buildOrbitLine(scaledRadius: number): THREE.Line {
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
    const mat = new THREE.LineBasicMaterial({ color: 0x4a4a5a, transparent: true, opacity: 0.4 });
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

  private buildRing(data: PlanetData, parentMesh: THREE.Mesh): THREE.Mesh {
    const innerRadius = data.radius * 1.4;
    const outerRadius = data.radius * 2.6;
    const geo = new THREE.TorusGeometry(
      (innerRadius + outerRadius) / 2,
      (outerRadius - innerRadius) / 2,
      2,
      96
    );
    const mat = new THREE.MeshStandardMaterial({
      color: data.ringColor || 0xd7ccc8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2 - (27 * Math.PI / 180);
    mesh.position.copy(parentMesh.position);
    this.scene.add(mesh);
    return mesh;
  }

  private createTexture(data: PlanetData): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = data.color;
    ctx.fillRect(0, 0, size, size);

    const baseColor = new THREE.Color(data.color);
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 40;
      const r = Math.max(0, Math.min(255, imgData.data[i] + noise));
      const g = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
      const b = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
      imgData.data[i] = r;
      imgData.data[i + 1] = g;
      imgData.data[i + 2] = b;
    }
    ctx.putImageData(imgData, 0, 0);

    if (data.nameEn === 'Jupiter' || data.nameEn === 'Saturn') {
      for (let y = 0; y < size; y += 12) {
        const bandNoise = Math.random() * 20 - 10;
        ctx.fillStyle = `rgba(${baseColor.r * 255 + bandNoise}, ${baseColor.g * 255 + bandNoise * 0.5}, ${baseColor.b * 255 + bandNoise * 0.3}, 0.3)`;
        ctx.fillRect(0, y, size, 6 + Math.random() * 6);
      }
    }

    if (data.nameEn === 'Earth') {
      ctx.fillStyle = 'rgba(34, 139, 34, 0.4)';
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 10 + Math.random() * 30, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 5 + Math.random() * 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return new THREE.CanvasTexture(canvas);
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
    return this.planets.map(p => p.mesh);
  }

  getPlanetDataByMesh(mesh: THREE.Mesh): PlanetData | undefined {
    const found = this.planets.find(p => p.mesh === mesh);
    return found?.data;
  }
}
