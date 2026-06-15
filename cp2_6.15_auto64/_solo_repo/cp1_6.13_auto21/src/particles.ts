import * as THREE from 'three';

export type ColorTheme = 'aurora' | 'fire' | 'neon';

interface ThemeColors {
  start: THREE.Color;
  end: THREE.Color;
}

interface WindPath {
  controlPoints: THREE.Vector3[];
  originalControlPoints: THREE.Vector3[];
  speed: number;
  directionOffset: THREE.Vector3;
}

interface City {
  name: string;
  center: THREE.Vector3;
  windPaths: WindPath[];
}

interface ParticleData {
  pathIndex: number;
  progress: number;
  baseSpeed: number;
  radius: number;
  colorOffset: number;
  history: THREE.Vector3[];
}

const CITIES: City[] = [
  {
    name: '北京',
    center: new THREE.Vector3(0, 5, 0),
    windPaths: generateWindPaths(new THREE.Vector3(0, 5, 0), 15, 12),
  },
  {
    name: '上海',
    center: new THREE.Vector3(15, 3, -5),
    windPaths: generateWindPaths(new THREE.Vector3(15, 3, -5), 18, 14),
  },
  {
    name: '伦敦',
    center: new THREE.Vector3(-12, 4, 8),
    windPaths: generateWindPaths(new THREE.Vector3(-12, 4, 8), 20, 10),
  },
  {
    name: '悉尼',
    center: new THREE.Vector3(8, -8, 12),
    windPaths: generateWindPaths(new THREE.Vector3(8, -8, 12), 16, 15),
  },
  {
    name: '里约',
    center: new THREE.Vector3(-8, -6, -15),
    windPaths: generateWindPaths(new THREE.Vector3(-8, -6, -15), 14, 18),
  },
];

const THEMES: Record<ColorTheme, ThemeColors> = {
  aurora: {
    start: new THREE.Color(0x87ceeb),
    end: new THREE.Color(0xffffff),
  },
  fire: {
    start: new THREE.Color(0xff4500),
    end: new THREE.Color(0xffd700),
  },
  neon: {
    start: new THREE.Color(0xa855f7),
    end: new THREE.Color(0x22c55e),
  },
};

function generateWindPaths(center: THREE.Vector3, count: number, spread: number): WindPath[] {
  const paths: WindPath[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 3 + Math.random() * 4;
    const heightOffset = (Math.random() - 0.5) * 6;

    const p0 = new THREE.Vector3(
      center.x + Math.cos(angle) * radius - spread * 0.5,
      center.y + heightOffset,
      center.z + Math.sin(angle) * radius - spread * 0.5
    );
    const p1 = new THREE.Vector3(
      center.x + Math.cos(angle + 0.8) * (radius + 2) + spread * 0.3,
      center.y + heightOffset + (Math.random() - 0.5) * 4,
      center.z + Math.sin(angle + 0.8) * (radius + 2) + spread * 0.3
    );
    const p2 = new THREE.Vector3(
      center.x + Math.cos(angle + 1.6) * (radius + 1) - spread * 0.2,
      center.y + heightOffset + (Math.random() - 0.5) * 3,
      center.z + Math.sin(angle + 1.6) * (radius + 1) - spread * 0.2
    );
    const p3 = new THREE.Vector3(
      center.x + Math.cos(angle) * radius + spread * 0.5,
      center.y + heightOffset,
      center.z + Math.sin(angle) * radius + spread * 0.5
    );

    const controlPoints = [p0, p1, p2, p3];
    const originalControlPoints = [p0.clone(), p1.clone(), p2.clone(), p3.clone()];

    paths.push({
      controlPoints,
      originalControlPoints,
      speed: 0.8 + Math.random() * 0.6,
      directionOffset: new THREE.Vector3(0, 0, 0),
    });
  }
  return paths;
}

function cubicBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return new THREE.Vector3(
    mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
  );
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particles: ParticleData[] = [];
  private particleMesh: THREE.Points | null = null;
  private trailLines: THREE.LineSegments | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private isPaused = false;
  private speedMultiplier = 1.0;
  private currentTheme: ColorTheme = 'aurora';
  private targetTheme: ColorTheme = 'aurora';
  private themeTransitionProgress = 1.0;
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fpsHistory: number[] = [];
  private degraded = false;
  private directionUpdateAccumulator = 0;
  private baseParticleCount = 2000;
  private trailMaxPoints = 60;
  private cities: City[];
  private currentCityIndex = 0;
  private animationId: number | null = null;
  private onWindSpeedUpdate?: (speeds: { name: string; speed: number; position: THREE.Vector3 }[]) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.cities = CITIES;
  }

  setOnWindSpeedUpdate(callback: (speeds: { name: string; speed: number; position: THREE.Vector3 }[]) => void) {
    this.onWindSpeedUpdate = callback;
  }

  init(cityIndex: number) {
    this.currentCityIndex = cityIndex;
    this.clear();
    this.createParticles();
    this.animate();
  }

  private clear() {
    if (this.particleMesh) {
      this.scene.remove(this.particleMesh);
      this.geometry?.dispose();
      (this.particleMesh.material as THREE.Material).dispose();
    }
    if (this.trailLines) {
      this.scene.remove(this.trailLines);
      this.trailGeometry?.dispose();
      (this.trailLines.material as THREE.Material).dispose();
    }
    this.particles = [];
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private createParticles() {
    const city = this.cities[this.currentCityIndex];
    const particleCount = this.degraded ? Math.floor(this.baseParticleCount / 2) : this.baseParticleCount;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const pathIndex = Math.floor(Math.random() * city.windPaths.length);
      const progress = Math.random();
      const radius = 2 + Math.random() * 2;
      const colorOffset = Math.random();

      const path = city.windPaths[pathIndex];
      const pos = cubicBezier(
        path.controlPoints[0],
        path.controlPoints[1],
        path.controlPoints[2],
        path.controlPoints[3],
        progress
      );

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const theme = THEMES[this.currentTheme];
      const color = theme.start.clone().lerp(theme.end, colorOffset);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = radius;

      const history: THREE.Vector3[] = [];
      for (let j = 0; j < this.trailMaxPoints; j++) {
        history.push(pos.clone());
      }

      this.particles.push({
        pathIndex,
        progress,
        baseSpeed: path.speed,
        radius,
        colorOffset,
        history,
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    this.particleMesh = new THREE.Points(this.geometry, material);
    this.scene.add(this.particleMesh);

    if (!this.degraded) {
      this.createTrails();
    }
  }

  private createTrails() {
    const particleCount = this.particles.length;
    this.trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(particleCount * (this.trailMaxPoints - 1) * 2 * 3);
    const trailColors = new Float32Array(particleCount * (this.trailMaxPoints - 1) * 2 * 3);

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      linewidth: 1,
    });

    this.trailLines = new THREE.LineSegments(this.trailGeometry, trailMaterial);
    this.scene.add(this.trailLines);
  }

  private updateTrails() {
    if (!this.trailLines || !this.trailGeometry || this.degraded) return;

    const trailPositions = this.trailGeometry.attributes.position.array as Float32Array;
    const trailColors = this.trailGeometry.attributes.color.array as Float32Array;
    const startTheme = THEMES[this.currentTheme];
    const endTheme = THEMES[this.targetTheme];

    this.particles.forEach((particle, i) => {
      for (let j = 0; j < this.trailMaxPoints - 1; j++) {
        const idx = (i * (this.trailMaxPoints - 1) + j) * 2 * 3;
        const p1 = particle.history[j];
        const p2 = particle.history[j + 1];

        trailPositions[idx] = p1.x;
        trailPositions[idx + 1] = p1.y;
        trailPositions[idx + 2] = p1.z;
        trailPositions[idx + 3] = p2.x;
        trailPositions[idx + 4] = p2.y;
        trailPositions[idx + 5] = p2.z;

        const alpha1 = 0.6 * (1 - j / (this.trailMaxPoints - 1));
        const alpha2 = 0.6 * (1 - (j + 1) / (this.trailMaxPoints - 1));

        const startColor = startTheme.start.clone().lerp(startTheme.end, particle.colorOffset);
        const endColor = endTheme.start.clone().lerp(endTheme.end, particle.colorOffset);
        const lerpedColor = startColor.clone().lerp(endColor, this.themeTransitionProgress);

        trailColors[idx] = lerpedColor.r * alpha1;
        trailColors[idx + 1] = lerpedColor.g * alpha1;
        trailColors[idx + 2] = lerpedColor.b * alpha1;
        trailColors[idx + 3] = lerpedColor.r * alpha2;
        trailColors[idx + 4] = lerpedColor.g * alpha2;
        trailColors[idx + 5] = lerpedColor.b * alpha2;
      }
    });

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  private updateColors() {
    if (!this.geometry) return;

    const colors = this.geometry.attributes.color.array as Float32Array;
    const startTheme = THEMES[this.currentTheme];
    const endTheme = THEMES[this.targetTheme];

    this.particles.forEach((particle, i) => {
      const startColor = startTheme.start.clone().lerp(startTheme.end, particle.colorOffset);
      const endColor = endTheme.start.clone().lerp(endTheme.end, particle.colorOffset);
      const finalColor = startColor.clone().lerp(endColor, this.themeTransitionProgress);

      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    });

    this.geometry.attributes.color.needsUpdate = true;
  }

  private checkFrameRate() {
    if (this.frameCount % 60 !== 0) return;

    if (this.fpsHistory.length < 30) return;

    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    if (avgFPS < 25 && !this.degraded) {
      this.degrade();
    }
  }

  private degrade() {
    this.degraded = true;
    this.clear();
    this.createParticles();
  }

  private updateDirections() {
    const city = this.cities[this.currentCityIndex];
    city.windPaths.forEach((path) => {
      const newOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.5
      );
      path.directionOffset.copy(newOffset);

      for (let idx = 0; idx < 4; idx++) {
        if (idx > 0 && idx < 3) {
          path.controlPoints[idx].x = path.originalControlPoints[idx].x + newOffset.x;
          path.controlPoints[idx].y = path.originalControlPoints[idx].y + newOffset.y;
          path.controlPoints[idx].z = path.originalControlPoints[idx].z + newOffset.z;
        }
      }
    });
  }

  private update(deltaTime: number) {
    if (this.isPaused) return;

    if (this.themeTransitionProgress < 1.0) {
      this.themeTransitionProgress = Math.min(1.0, this.themeTransitionProgress + deltaTime);
      if (this.themeTransitionProgress >= 1.0) {
        this.currentTheme = this.targetTheme;
      }
      this.updateColors();
    }

    this.directionUpdateAccumulator += deltaTime;
    if (this.directionUpdateAccumulator >= 1.0) {
      this.directionUpdateAccumulator = 0;
      this.updateDirections();
    }

    const city = this.cities[this.currentCityIndex];
    const positions = this.geometry?.attributes.position.array as Float32Array;

    this.particles.forEach((particle, i) => {
      const path = city.windPaths[particle.pathIndex];
      particle.progress += (particle.baseSpeed * this.speedMultiplier * deltaTime) / 6;

      if (particle.progress >= 1.0) {
        particle.progress = 0;
        particle.pathIndex = Math.floor(Math.random() * city.windPaths.length);
      }

      const pos = cubicBezier(
        path.controlPoints[0],
        path.controlPoints[1],
        path.controlPoints[2],
        path.controlPoints[3],
        particle.progress
      );

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      if (particle.history.length >= this.trailMaxPoints) {
        particle.history.pop();
      }
      particle.history.unshift(pos.clone());
    });

    if (this.geometry) {
      this.geometry.attributes.position.needsUpdate = true;
    }

    if (!this.degraded) {
      this.updateTrails();
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    this.frameCount++;
    const now = performance.now();
    const deltaTime = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    const instantFPS = 1000 / (now - this.lastFrameTime);
    this.lastFrameTime = now;

    this.fpsHistory.push(instantFPS);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    this.checkFrameRate();
    this.update(deltaTime);

    if (this.isPaused && this.onWindSpeedUpdate) {
      const windSpeeds = this.cities.map((city, idx) => ({
        name: city.name,
        speed: idx === this.currentCityIndex
          ? this.particles.reduce((sum, p) => sum + p.baseSpeed * this.speedMultiplier, 0) / Math.max(1, this.particles.length)
          : 0,
        position: city.center.clone(),
      }));
      this.onWindSpeedUpdate(windSpeeds);
    }
  };

  setCity(cityIndex: number) {
    this.currentCityIndex = cityIndex;
    this.directionUpdateAccumulator = 0;
    this.clear();
    this.createParticles();
    this.animate();
  }

  setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = multiplier;
  }

  setTheme(theme: ColorTheme) {
    if (theme === this.currentTheme && this.themeTransitionProgress >= 1.0) return;
    if (this.themeTransitionProgress < 1.0) {
      this.currentTheme = this.targetTheme;
    }
    this.targetTheme = theme;
    this.themeTransitionProgress = 0;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  getIsPaused() {
    return this.isPaused;
  }

  getCities() {
    return this.cities.map(c => c.name);
  }

  getCurrentCityIndex() {
    return this.currentCityIndex;
  }

  getWindSpeeds() {
    return this.cities.map((city, idx) => ({
      name: city.name,
      speed: idx === this.currentCityIndex
        ? this.particles.reduce((sum, p) => sum + p.baseSpeed * this.speedMultiplier, 0) / Math.max(1, this.particles.length)
        : 0,
      position: city.center.clone(),
    }));
  }

  dispose() {
    this.clear();
  }
}
