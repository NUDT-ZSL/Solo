import * as THREE from 'three';
import { EcoElementFactory, EcoElementData, EcoElementType, UpdateContext } from './EcoElementFactory';

export interface EcoIndicators {
  humidity: number;
  temperature: number;
  biodiversity: number;
}

export class EcoBottleManager {
  public scene: THREE.Scene;
  public bottleGroup: THREE.Group;
  public bottleRadius = 2.5;
  private factory: EcoElementFactory;
  private elements: EcoElementData[] = [];
  private bottleMesh: THREE.Mesh | null = null;
  private baseMesh: THREE.Group | null = null;
  private indicatorLabels: { humidity: THREE.Mesh; temperature: THREE.Mesh; biodiversity: THREE.Mesh } | null = null;
  private indicators: EcoIndicators = { humidity: 30, temperature: 22, biodiversity: 5 };
  private targetIndicators: EcoIndicators = { humidity: 30, temperature: 22, biodiversity: 5 };
  private mouseLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private groundMesh: THREE.Mesh | null = null;

  private weatherParticles: THREE.Points | null = null;
  private weatherParticleData: { positions: Float32Array; velocities: Float32Array; types: Float32Array; rotations: Float32Array; rotSpeed: Float32Array; sizes: Float32Array } | null = null;
  private weatherSnowMaterial: THREE.ShaderMaterial | null = null;
  private weatherRainMaterial: THREE.PointsMaterial | null = null;
  private maxWeatherParticles = 1000;
  private weatherMode: 'none' | 'rain' | 'storm' | 'snow' = 'none';
  private lightningGroup: THREE.Group | null = null;
  private lightningLines: THREE.Line[] = [];
  private lightningLight: THREE.PointLight | null = null;
  private lightningTimer = 0;
  private lightningActive = false;
  private flashOverlay: HTMLDivElement | null = null;

  private previewRing: THREE.Mesh | null = null;
  private previewVisible = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.factory = new EcoElementFactory(scene, this.bottleRadius);
    this.bottleGroup = new THREE.Group();
    this.scene.add(this.bottleGroup);

    this.ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(this.ambientLight);

    this.mouseLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.mouseLight.position.set(2, 3, 2);
    this.mouseLight.castShadow = true;
    this.scene.add(this.mouseLight);

    const fillLight = new THREE.DirectionalLight(0x8ab4f8, 0.3);
    fillLight.position.set(-2, 1, -1);
    this.scene.add(fillLight);

    this.createBottle();
    this.createWeatherParticles();
    this.createPreviewRing();
    this.createFlashOverlay();
  }

  private createBottle(): void {
    const bottleGeo = new THREE.SphereGeometry(this.bottleRadius, 48, 36);
    const bottleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      ior: 1.5,
      side: THREE.DoubleSide,
    });
    this.bottleMesh = new THREE.Mesh(bottleGeo, bottleMat);
    this.bottleGroup.add(this.bottleMesh);

    const rimGeo = new THREE.TorusGeometry(this.bottleRadius, 0.04, 12, 48);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8d48a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const topRim = new THREE.Mesh(rimGeo, rimMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = this.bottleRadius * 0.75;
    this.bottleGroup.add(topRim);

    this.createBase();
    this.createGround();
  }

  private createBase(): void {
    this.baseMesh = new THREE.Group();

    const baseTopRadius = this.bottleRadius * 1.1;
    const baseBottomRadius = this.bottleRadius * 1.25;
    const baseHeight = 0.3;

    const baseGeo = new THREE.CylinderGeometry(baseTopRadius, baseBottomRadius, baseHeight, 48);
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0x5d4e37,
      metalness: 0.2,
      roughness: 0.7,
      clearcoat: 0.5,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -this.bottleRadius - baseHeight / 2 + 0.05;
    base.receiveShadow = true;
    this.baseMesh.add(base);

    const ringGeo = new THREE.TorusGeometry(baseTopRadius * 0.95, 0.03, 8, 48);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9a84c,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -this.bottleRadius + 0.05;
    this.baseMesh.add(ring);

    this.createIndicatorLabels();

    this.bottleGroup.add(this.baseMesh);
  }

  private createIndicatorLabels(): void {
    const labelY = -this.bottleRadius - 0.18;
    const radius = this.bottleRadius * 0.7;

    const createLabel = (text: string, angle: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#e8d48a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 24);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('--', 128, 46);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.8, 0.2, 1);
      sprite.position.set(
        Math.cos(angle) * radius,
        labelY,
        Math.sin(angle) * radius
      );
      sprite.userData = { canvas, ctx, texture };
      return sprite;
    };

    const humidityLabel = createLabel('湿度', -Math.PI / 2 - 0.4);
    const tempLabel = createLabel('温度', -Math.PI / 2);
    const bioLabel = createLabel('生物多样性', -Math.PI / 2 + 0.4);

    this.indicatorLabels = {
      humidity: humidityLabel as unknown as THREE.Mesh,
      temperature: tempLabel as unknown as THREE.Mesh,
      biodiversity: bioLabel as unknown as THREE.Mesh,
    };

    this.baseMesh!.add(humidityLabel);
    this.baseMesh!.add(tempLabel);
    this.baseMesh!.add(bioLabel);
  }

  private updateIndicatorLabels(): void {
    if (!this.indicatorLabels) return;

    const update = (mesh: THREE.Object3D, label: string, value: string, color: string) => {
      const { canvas, ctx, texture } = mesh.userData;
      ctx.clearRect(0, 0, 256, 64);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#e8d48a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 128, 20);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillText(value, 128, 46);
      ctx.shadowBlur = 0;
      texture.needsUpdate = true;
    };

    update(this.indicatorLabels.humidity as unknown as THREE.Object3D, '湿度', this.indicators.humidity.toFixed(1) + '%', '#4FC3F7');
    update(this.indicatorLabels.temperature as unknown as THREE.Object3D, '温度', this.indicators.temperature.toFixed(1) + '°C', '#FF9800');
    update(this.indicatorLabels.biodiversity as unknown as THREE.Object3D, '多样性', this.indicators.biodiversity.toFixed(1), '#66BB6A');
  }

  private createGround(): void {
    const groundGeo = new THREE.CircleGeometry(this.bottleRadius * 0.9, 48);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3d5c2e });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -this.bottleRadius + 0.02;
    this.groundMesh.receiveShadow = true;
    this.bottleGroup.add(this.groundMesh);

    const innerGeo = new THREE.CircleGeometry(this.bottleRadius * 0.85, 48);
    const innerMat = new THREE.MeshLambertMaterial({ color: 0x4a6b38 });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = -this.bottleRadius + 0.025;
    this.bottleGroup.add(inner);
  }

  private createWeatherParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxWeatherParticles * 3);
    const velocities = new Float32Array(this.maxWeatherParticles * 3);
    const types = new Float32Array(this.maxWeatherParticles);
    const rotations = new Float32Array(this.maxWeatherParticles);
    const rotSpeed = new Float32Array(this.maxWeatherParticles);
    const sizes = new Float32Array(this.maxWeatherParticles);

    for (let i = 0; i < this.maxWeatherParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -10;
      positions[i * 3 + 2] = 0;
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
      types[i] = 0;
      rotations[i] = Math.random() * Math.PI * 2;
      rotSpeed[i] = (Math.random() - 0.5) * 4;
      sizes[i] = 0.04 + Math.random() * 0.04;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.weatherSnowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aRotation;
        attribute float aSize;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vRotation;
        void main() {
          vRotation = aRotation + uTime * 2.0;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * 300.0 * uPixelRatio / -mvPosition.z;
        }
      `,
      fragmentShader: `
        varying float vRotation;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 ruv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
          float r = length(ruv);
          float angle = atan(ruv.y, ruv.x);
          float hex = cos(3.0 * angle);
          float hexDist = r * (1.0 + 0.08 * hex);
          if (hexDist > 0.48) discard;
          float edge = smoothstep(0.48, 0.42, hexDist);
          float core = smoothstep(0.4, 0.1, r);
          float alpha = edge * (0.7 + 0.3 * core);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.weatherRainMaterial = new THREE.PointsMaterial({
      color: 0x4fc3f7,
      size: 0.03,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.weatherParticles = new THREE.Points(geometry, this.weatherRainMaterial);
    this.weatherParticleData = { positions, velocities, types, rotations, rotSpeed, sizes };
    this.bottleGroup.add(this.weatherParticles);

    this.lightningGroup = new THREE.Group();
    this.bottleGroup.add(this.lightningGroup);

    this.lightningLight = new THREE.PointLight(0xaaccff, 0, 20, 2);
    this.lightningGroup.add(this.lightningLight);
  }

  private createPreviewRing(): void {
    const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4c078,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.previewRing = new THREE.Mesh(ringGeo, ringMat);
    this.previewRing.rotation.x = -Math.PI / 2;
    this.previewRing.position.y = -this.bottleRadius + 0.03;
    this.previewRing.visible = false;
    this.bottleGroup.add(this.previewRing);
  }

  private createFlashOverlay(): void {
    this.flashOverlay = document.createElement('div');
    this.flashOverlay.className = 'flash-overlay';
    document.body.appendChild(this.flashOverlay);
  }

  public setPreviewPosition(position: THREE.Vector3 | null): void {
    if (!this.previewRing) return;
    if (position) {
      this.previewRing.position.set(position.x, -this.bottleRadius + 0.03, position.z);
      this.previewRing.visible = true;
      this.previewVisible = true;
    } else {
      this.previewRing.visible = false;
      this.previewVisible = false;
    }
  }

  public addElement(type: EcoElementType, position: THREE.Vector3): EcoElementData {
    const bottlePos = new THREE.Vector3();
    this.bottleGroup.getWorldPosition(bottlePos);
    const localPos = position.clone().sub(bottlePos);

    const dist = Math.sqrt(localPos.x ** 2 + localPos.z ** 2);
    const maxDist = this.bottleRadius * 0.85;
    if (dist > maxDist) {
      const scale = maxDist / dist;
      localPos.x *= scale;
      localPos.z *= scale;
    }

    if (type !== 'weather') {
      localPos.y = -this.bottleRadius + 0.02;
    } else {
      localPos.y = this.bottleRadius * 0.3;
    }

    const worldPos = bottlePos.add(localPos);
    const element = this.factory.createElement(type, localPos);
    this.elements.push(element);

    this.recalculateIndicators();
    this.updateWeatherMode();

    return element;
  }

  public removeElement(id: string): boolean {
    const idx = this.elements.findIndex(e => e.id === id);
    if (idx < 0) return false;
    const el = this.elements[idx];
    this.factory.removeElement(el);
    this.elements.splice(idx, 1);
    this.recalculateIndicators();
    this.updateWeatherMode();
    return true;
  }

  public getElements(): EcoElementData[] {
    return this.elements;
  }

  public getIndicators(): EcoIndicators {
    return { ...this.indicators };
  }

  private recalculateIndicators(): void {
    let humidity = 20;
    let temperature = 20;
    let biodiversity = 2;

    for (const el of this.elements) {
      switch (el.type) {
        case 'tree':
          humidity += 5;
          temperature -= 1.5;
          biodiversity += 8;
          break;
        case 'rock':
          temperature += 0.8;
          biodiversity += 1;
          break;
        case 'water':
          humidity += 18;
          temperature -= 2;
          biodiversity += 6;
          break;
        case 'smallAnimal':
          temperature += 0.5;
          biodiversity += 10;
          break;
        case 'largeAnimal':
          temperature += 1.5;
          biodiversity += 14;
          break;
        case 'weather':
          humidity += 8;
          temperature -= 3;
          biodiversity += 3;
          break;
      }
    }

    humidity = Math.max(5, Math.min(100, humidity));
    temperature = Math.max(-5, Math.min(40, temperature));
    biodiversity = Math.max(0, Math.min(100, biodiversity));

    this.targetIndicators = { humidity, temperature, biodiversity };
  }

  private updateWeatherMode(): void {
    const cloudCount = this.elements.filter(e => e.type === 'weather').length;
    const prevMode = this.weatherMode;

    if (cloudCount === 0) {
      this.weatherMode = 'none';
    } else if (cloudCount === 1) {
      this.weatherMode = 'rain';
    } else if (cloudCount === 2) {
      this.weatherMode = 'storm';
    } else {
      this.weatherMode = 'snow';
    }

    if (this.weatherMode !== prevMode && this.weatherParticles) {
      if (this.weatherMode === 'snow') {
        this.weatherParticles.material = this.weatherSnowMaterial!;
      } else {
        this.weatherParticles.material = this.weatherRainMaterial!;
      }
    }
  }

  public updateMouseLight(normalizedX: number, normalizedY: number): void {
    const x = (normalizedX - 0.5) * 4;
    const y = 1.5 + normalizedY * 2;
    const z = (0.5 - normalizedY) * 3;
    this.mouseLight.position.set(x, y, z);
  }

  public update(delta: number, time: number): void {
    const bottlePos = new THREE.Vector3();
    this.bottleGroup.getWorldPosition(bottlePos);

    const ctx: UpdateContext = {
      allElements: this.elements,
      bottleRadius: this.bottleRadius,
      mouseLightPos: this.mouseLight.position.clone(),
    };

    for (const el of this.elements) {
      if (el.update) {
        el.update(delta, time, ctx);
      }
    }

    this.indicators.humidity += (this.targetIndicators.humidity - this.indicators.humidity) * delta * 1.5;
    this.indicators.temperature += (this.targetIndicators.temperature - this.indicators.temperature) * delta * 1.5;
    this.indicators.biodiversity += (this.targetIndicators.biodiversity - this.indicators.biodiversity) * delta * 1.5;

    this.updateIndicatorLabels();
    this.updateWeatherParticles(delta, time);

    if (this.previewRing && this.previewVisible) {
      const s = 1 + Math.sin(time * 3) * 0.1;
      this.previewRing.scale.set(s, s, 1);
    }
  }

  private updateWeatherParticles(delta: number, time: number): void {
    if (!this.weatherParticles || !this.weatherParticleData) return;

    const { positions, velocities, types, rotations, rotSpeed } = this.weatherParticleData;
    const activeCount = this.weatherMode === 'none' ? 0 : this.weatherMode === 'snow' ? 500 : 700;

    if (this.weatherSnowMaterial) {
      this.weatherSnowMaterial.uniforms.uTime.value = time;
    }

    for (let i = 0; i < activeCount; i++) {
      let px = positions[i * 3];
      let py = positions[i * 3 + 1];
      let pz = positions[i * 3 + 2];

      if (py < -this.bottleRadius + 0.05 || types[i] === 0) {
        px = (Math.random() - 0.5) * this.bottleRadius * 1.7;
        py = this.bottleRadius * 0.75 + Math.random() * 0.3;
        pz = (Math.random() - 0.5) * this.bottleRadius * 1.7;
        types[i] = 1;
        velocities[i * 3] = (Math.random() - 0.5) * 0.15;
        velocities[i * 3 + 1] = -(0.6 + Math.random() * 0.6);
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      }

      if (this.weatherMode === 'snow') {
        py += velocities[i * 3 + 1] * delta * 0.35;
        px += (Math.sin(time * 1.2 + i * 0.37) * 0.15 + velocities[i * 3]) * delta;
        pz += (Math.cos(time * 0.9 + i * 0.53) * 0.12 + velocities[i * 3 + 2]) * delta;
        rotations[i] += rotSpeed[i] * delta;
      } else {
        py += velocities[i * 3 + 1] * delta * 2.2;
        px += velocities[i * 3] * delta * 0.5;
        pz += velocities[i * 3 + 2] * delta * 0.5;
      }

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
    }

    for (let i = activeCount; i < this.maxWeatherParticles; i++) {
      positions[i * 3 + 1] = -10;
      types[i] = 0;
    }

    this.weatherParticles.geometry.attributes.position.needsUpdate = true;
    if (this.weatherParticles.geometry.attributes.aRotation) {
      this.weatherParticles.geometry.attributes.aRotation.needsUpdate = true;
    }

    if (this.weatherMode === 'storm') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 1.8 + Math.random() * 2.5) {
        this.triggerLightning();
        this.lightningTimer = 0;
      }
    }

    for (let i = this.lightningLines.length - 1; i >= 0; i--) {
      const line = this.lightningLines[i];
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity -= delta * 5;
      if (mat.opacity <= 0) {
        this.lightningGroup!.remove(line);
        line.geometry.dispose();
        mat.dispose();
        this.lightningLines.splice(i, 1);
      }
    }

    if (this.lightningLight) {
      this.lightningLight.intensity = Math.max(0, this.lightningLight.intensity - delta * 15);
    }
  }

  private triggerLightning(): void {
    if (!this.lightningGroup) return;

    const baseX = (Math.random() - 0.5) * this.bottleRadius * 1.3;
    const baseZ = (Math.random() - 0.5) * this.bottleRadius * 1.3;

    const buildBolt = (startX: number, startY: number, startZ: number, endY: number): THREE.Vector3[] => {
      const points: THREE.Vector3[] = [];
      let x = startX, y = startY, z = startZ;
      const segments = 14;
      for (let i = 0; i < segments; i++) {
        points.push(new THREE.Vector3(x, y, z));
        y -= (startY - endY) / segments;
        x += (Math.random() - 0.5) * 0.5;
        z += (Math.random() - 0.5) * 0.5;
      }
      points.push(new THREE.Vector3(x, endY, z));
      return points;
    };

    const mainPoints = buildBolt(baseX, this.bottleRadius * 0.7, baseZ, -this.bottleRadius * 0.85);
    const mainGeo = new THREE.BufferGeometry().setFromPoints(mainPoints);
    const mainMat = new THREE.LineBasicMaterial({
      color: 0xe8f2ff,
      transparent: true,
      opacity: 1,
    });
    const mainLine = new THREE.Line(mainGeo, mainMat);
    this.lightningGroup.add(mainLine);
    this.lightningLines.push(mainLine);

    const glowGeo = new THREE.BufferGeometry().setFromPoints(mainPoints);
    const glowMat = new THREE.LineBasicMaterial({
      color: 0x8ab4ff,
      transparent: true,
      opacity: 0.7,
      linewidth: 4,
    });
    const glowLine = new THREE.Line(glowGeo, glowMat);
    this.lightningGroup.add(glowLine);
    this.lightningLines.push(glowLine);

    const branchCount = 1 + Math.floor(Math.random() * 2);
    for (let b = 0; b < branchCount; b++) {
      const startIdx = 4 + Math.floor(Math.random() * 5);
      const startPt = mainPoints[startIdx];
      if (!startPt) continue;
      const branchEndY = startPt.y - 0.5 - Math.random() * 0.5;
      const branchPoints = buildBolt(startPt.x, startPt.y, startPt.z, branchEndY);
      const bGeo = new THREE.BufferGeometry().setFromPoints(branchPoints);
      const bMat = new THREE.LineBasicMaterial({
        color: 0xccddff,
        transparent: true,
        opacity: 0.85,
      });
      const bLine = new THREE.Line(bGeo, bMat);
      this.lightningGroup.add(bLine);
      this.lightningLines.push(bLine);
    }

    if (this.lightningLight) {
      this.lightningLight.position.set(
        baseX,
        this.bottleRadius * 0.2,
        baseZ
      );
      this.lightningLight.intensity = 8;
    }

    this.lightningActive = true;

    if (this.flashOverlay) {
      this.flashOverlay.style.transition = 'none';
      this.flashOverlay.style.opacity = '0.55';
      requestAnimationFrame(() => {
        if (this.flashOverlay) {
          this.flashOverlay.style.transition = 'opacity 0.15s ease-out';
          this.flashOverlay.style.opacity = '0';
        }
      });
      setTimeout(() => {
        if (this.flashOverlay) {
          this.flashOverlay.style.transition = 'none';
          this.flashOverlay.style.opacity = '0.3';
          requestAnimationFrame(() => {
            if (this.flashOverlay) {
              this.flashOverlay.style.transition = 'opacity 0.1s ease-out';
              this.flashOverlay.style.opacity = '0';
            }
          });
        }
      }, 70);
    }
  }

  public getBottleWorldPosition(): THREE.Vector3 {
    const v = new THREE.Vector3();
    this.bottleGroup.getWorldPosition(v);
    return v;
  }

  public getBottleRadius(): number {
    return this.bottleRadius;
  }

  public getBottleGroup(): THREE.Group {
    return this.bottleGroup;
  }

  public dispose(): void {
    for (const el of [...this.elements]) {
      this.factory.removeElement(el);
    }
    this.elements = [];
    if (this.flashOverlay) {
      this.flashOverlay.remove();
    }
  }
}
