import * as THREE from 'three';

export interface StarData {
  index: number;
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  size: number;
  baseSize: number;
  velocity: THREE.Vector3;
  brightnessBoost: number;
  selected: boolean;
  selectTimer: number;
  merged: boolean;
}

export class StarField {
  public scene: THREE.Scene;
  public starCount: number = 800;
  public stars: StarData[] = [];
  public starGroup: THREE.Group;
  public points!: THREE.Points;
  public halos!: THREE.Points;
  public radius: number = 250;
  public geometry!: THREE.BufferGeometry;
  public haloGeometry!: THREE.BufferGeometry;
  public material!: THREE.ShaderMaterial;
  public haloMaterial!: THREE.ShaderMaterial;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private brightness: Float32Array;
  private haloPositions: Float32Array;
  private haloColors: Float32Array;
  private haloSizes: Float32Array;

  private GRAVITY_STRENGTH = 8.0;
  private GRAVITY_RANGE = 60;
  public FUSION_THRESHOLD = 15;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.starGroup = new THREE.Group();
    this.scene.add(this.starGroup);

    this.positions = new Float32Array(this.starCount * 3);
    this.colors = new Float32Array(this.starCount * 3);
    this.sizes = new Float32Array(this.starCount);
    this.brightness = new Float32Array(this.starCount);

    this.haloPositions = new Float32Array(this.starCount * 3);
    this.haloColors = new Float32Array(this.starCount * 3);
    this.haloSizes = new Float32Array(this.starCount);

    this.createStars();
    this.createShaders();
    this.buildGeometry();
  }

  private createStars(): void {
    for (let i = 0; i < this.starCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = this.radius * (0.92 + Math.random() * 0.08);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const hue = 200 + Math.random() * 150;
      const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.9);
      const size = 3 + Math.random() * 5;

      const position = new THREE.Vector3(x, y, z);

      this.stars.push({
        index: i,
        position: position.clone(),
        basePosition: position.clone(),
        color: color.clone(),
        baseColor: color.clone(),
        size: size,
        baseSize: size,
        velocity: new THREE.Vector3(),
        brightnessBoost: 0,
        selected: false,
        selectTimer: 0,
        merged: false
      });
    }
  }

  private createShaders(): void {
    const vertexShader = `
      attribute float size;
      attribute float brightness;
      varying vec3 vColor;
      varying float vBrightness;
      void main() {
        vColor = color;
        vBrightness = brightness;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vBrightness;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float d = length(cxy);
        if (d > 1.0) discard;
        float alpha = pow(1.0 - d, 2.0);
        vec3 finalColor = vColor * (1.0 + vBrightness);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const haloFragmentShader = `
      varying vec3 vColor;
      varying float vBrightness;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float d = length(cxy);
        if (d > 1.0) discard;
        float alpha = pow(1.0 - d, 1.5) * 0.2;
        vec3 finalColor = vColor * (0.8 + vBrightness * 0.5);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.haloMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: haloFragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private buildGeometry(): void {
    this.updateAttributeArrays();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('brightness', new THREE.BufferAttribute(this.brightness, 1));

    this.haloGeometry = new THREE.BufferGeometry();
    this.haloGeometry.setAttribute('position', new THREE.BufferAttribute(this.haloPositions, 3));
    this.haloGeometry.setAttribute('color', new THREE.BufferAttribute(this.haloColors, 3));
    this.haloGeometry.setAttribute('size', new THREE.BufferAttribute(this.haloSizes, 1));
    this.haloGeometry.setAttribute('brightness', new THREE.BufferAttribute(new Float32Array(this.starCount), 1));

    this.points = new THREE.Points(this.geometry, this.material);
    this.halos = new THREE.Points(this.haloGeometry, this.haloMaterial);

    this.starGroup.add(this.halos);
    this.starGroup.add(this.points);
  }

  private updateAttributeArrays(): void {
    for (let i = 0; i < this.starCount; i++) {
      const star = this.stars[i];
      if (star.merged) {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = 0;
        this.positions[i * 3 + 2] = -99999;
        this.sizes[i] = 0;
        this.haloSizes[i] = 0;
        this.brightness[i] = 0;
        continue;
      }

      const pos = star.position;
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      let color = star.color;
      let size = star.size;
      let bright = star.brightnessBoost;

      if (star.selected) {
        const pulse = 0.5 + 0.5 * Math.sin(star.selectTimer * 8);
        size = star.baseSize * 2.2 * (1 + pulse * 0.2);
        color = new THREE.Color().setHSL(50 / 360, 1, 0.7 + pulse * 0.2);
        bright = Math.max(bright, 1.2);
      } else if (star.selectTimer > 0) {
        const t = star.selectTimer / 2;
        size = star.baseSize * (1 + t * 1.2);
        const goldColor = new THREE.Color().setHSL(50 / 360, 1, 0.8);
        color = star.baseColor.clone().lerp(goldColor, t);
        bright = star.brightnessBoost;
      }

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = size;
      this.brightness[i] = bright;

      this.haloPositions[i * 3] = pos.x;
      this.haloPositions[i * 3 + 1] = pos.y;
      this.haloPositions[i * 3 + 2] = pos.z;

      this.haloColors[i * 3] = color.r;
      this.haloColors[i * 3 + 1] = color.g;
      this.haloColors[i * 3 + 2] = color.b;

      this.haloSizes[i] = size * 3;
    }
  }

  public triggerNearbyFlicker(center: THREE.Vector3, radius: number = 80): void {
    for (const star of this.stars) {
      if (star.merged) continue;
      const dist = star.position.distanceTo(center);
      if (dist < radius) {
        const intensity = 1 - dist / radius;
        star.brightnessBoost = Math.max(star.brightnessBoost, 0.2 * intensity);
      }
    }
  }

  private applyGravity(dt: number): void {
    for (let i = 0; i < this.starCount; i++) {
      const starA = this.stars[i];
      if (starA.merged) continue;

      for (let j = i + 1; j < this.starCount; j++) {
        const starB = this.stars[j];
        if (starB.merged) continue;

        const dx = starB.position.x - starA.position.x;
        const dy = starB.position.y - starA.position.y;
        const dz = starB.position.z - starA.position.z;

        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > this.GRAVITY_RANGE * this.GRAVITY_RANGE) continue;

        const dist = Math.sqrt(distSq) + 0.001;
        const force = this.GRAVITY_STRENGTH / Math.max(distSq, 4);

        const fx = (dx / dist) * force * dt;
        const fy = (dy / dist) * force * dt;
        const fz = (dz / dist) * force * dt;

        starA.velocity.x += fx;
        starA.velocity.y += fy;
        starA.velocity.z += fz;
        starB.velocity.x -= fx;
        starB.velocity.y -= fy;
        starB.velocity.z -= fz;
      }
    }
  }

  public update(dt: number): Array<{ starA: StarData; starB: StarData; center: THREE.Vector3; avgColor: THREE.Color }> {
    this.applyGravity(dt);

    const fusions: Array<{ starA: StarData; starB: StarData; center: THREE.Vector3; avgColor: THREE.Color }> = [];

    for (const star of this.stars) {
      if (star.merged) continue;

      star.velocity.multiplyScalar(0.96);

      star.position.add(star.velocity.clone().multiplyScalar(dt));

      const toCenter = star.position.clone();
      const distFromCenter = toCenter.length();
      const idealR = star.basePosition.length();

      if (distFromCenter > 0) {
        const radialForce = (idealR - distFromCenter) * 0.5;
        toCenter.normalize().multiplyScalar(radialForce * dt);
        star.velocity.add(toCenter);
      }

      if (star.brightnessBoost > 0) {
        star.brightnessBoost = Math.max(0, star.brightnessBoost - dt * (0.2 / 0.3));
      }

      if (star.selected) {
        star.selectTimer += dt;
      } else if (star.selectTimer > 0) {
        star.selectTimer = Math.max(0, star.selectTimer - dt);
      }
    }

    const checked = new Set<string>();
    for (let i = 0; i < this.starCount; i++) {
      const starA = this.stars[i];
      if (starA.merged) continue;

      for (let j = i + 1; j < this.starCount; j++) {
        const starB = this.stars[j];
        if (starB.merged) continue;

        const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const dist = starA.position.distanceTo(starB.position);
        if (dist < this.FUSION_THRESHOLD) {
          const center = starA.position.clone().add(starB.position).multiplyScalar(0.5);
          const avgColor = starA.baseColor.clone().lerp(starB.baseColor, 0.5);

          const totalSize = starA.baseSize + starB.baseSize;

          starA.position.copy(center);
          starA.basePosition.copy(center.clone().normalize().multiplyScalar(starA.basePosition.length()));
          starA.baseSize = Math.min(18, totalSize * 1.5 * 0.5);
          starA.size = starA.baseSize;
          starA.baseColor = avgColor.clone();
          starA.color = avgColor.clone();
          starA.velocity.add(starB.velocity).multiplyScalar(0.5);

          starB.merged = true;

          fusions.push({ starA, starB, center, avgColor });
        }
      }
    }

    this.updateAttributeArrays();

    if (this.geometry.attributes.position) this.geometry.attributes.position.needsUpdate = true;
    if (this.geometry.attributes.color) this.geometry.attributes.color.needsUpdate = true;
    if (this.geometry.attributes.size) this.geometry.attributes.size.needsUpdate = true;
    if (this.geometry.attributes.brightness) this.geometry.attributes.brightness.needsUpdate = true;

    if (this.haloGeometry.attributes.position) this.haloGeometry.attributes.position.needsUpdate = true;
    if (this.haloGeometry.attributes.color) this.haloGeometry.attributes.color.needsUpdate = true;
    if (this.haloGeometry.attributes.size) this.haloGeometry.attributes.size.needsUpdate = true;

    return fusions;
  }

  public selectStar(index: number): void {
    const star = this.stars[index];
    if (!star || star.merged) return;
    star.selected = true;
    star.selectTimer = 0;
    setTimeout(() => {
      star.selected = false;
    }, 2000);
  }

  public getActiveStars(): StarData[] {
    return this.stars.filter(s => !s.merged);
  }

  public getStarByIndex(index: number): StarData | null {
    const star = this.stars[index];
    return (star && !star.merged) ? star : null;
  }

  public render(): void {}
}
