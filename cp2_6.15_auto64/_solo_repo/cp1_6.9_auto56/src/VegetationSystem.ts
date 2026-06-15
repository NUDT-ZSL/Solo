import * as THREE from 'three';

export interface VegetationParams {
  density: number;
  heightRange: number;
  hueShift: number;
  growthSpeed: number;
  windStrength: number;
  seasonFactor: number;
  trunkColor: string;
  leafColor: string;
}

export interface PlantData {
  position: THREE.Vector3;
  targetHeight: number;
  currentHeight: number;
  baseRadius: number;
  rotation: number;
  hueOffset: number;
  growthDuration: number;
  growthStartTime: number;
  phaseOffset: number;
}

const AREA_RADIUS = 30;
const WIND_FREQUENCY = 0.2;

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: r + m, g: g + m, b: b + m };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.4, g: 0.2, b: 0.1 };
}

function lerpColor(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, t: number) {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t
  };
}

function generatePlantData(index: number, heightRange: number): PlantData {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * AREA_RADIUS;
  const height = 0.5 + Math.random() * heightRange;
  return {
    position: new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    ),
    targetHeight: height,
    currentHeight: 0.1,
    baseRadius: 0.15 + Math.random() * 0.3,
    rotation: Math.random() * Math.PI * 2,
    hueOffset: (Math.random() - 0.5) * 40,
    growthDuration: 3000 + Math.random() * 5000,
    growthStartTime: performance.now() + index * 20,
    phaseOffset: Math.random() * Math.PI * 2
  };
}

export class VegetationSystem {
  private trunkMesh: THREE.InstancedMesh;
  private leafMesh: THREE.InstancedMesh;
  private glowSprite: THREE.Sprite;
  private glowSprites: THREE.Sprite[] = [];
  private plants: PlantData[] = [];
  private params: VegetationParams;
  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();
  private currentDensity = 0;

  constructor(scene: THREE.Scene, params: VegetationParams) {
    this.params = { ...params };

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x6b4226,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1
    });
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, 5000);
    this.trunkMesh.castShadow = true;
    this.trunkMesh.receiveShadow = true;
    this.trunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.trunkMesh.instanceColor) {
      this.trunkMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    scene.add(this.trunkMesh);

    const leafGeo = new THREE.ConeGeometry(1.5, 2.5, 8);
    leafGeo.translate(0, 1.25, 0);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });
    this.leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, 5000);
    this.leafMesh.castShadow = true;
    this.leafMesh.receiveShadow = true;
    this.leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.leafMesh.instanceColor) {
      this.leafMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    scene.add(this.leafMesh);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(canvas);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.glowSprite = new THREE.Sprite(glowMat);

    this.rebuildPlants();
  }

  updateParams(params: VegetationParams) {
    const oldDensity = this.currentDensity;
    const oldHeight = this.params.heightRange;
    this.params = { ...params };

    if (Math.floor(params.density) !== oldDensity || Math.abs(params.heightRange - oldHeight) > 0.1) {
      this.rebuildPlants();
    }
  }

  private rebuildPlants() {
    const targetCount = Math.floor(this.params.density);
    this.plants = [];
    for (let i = 0; i < targetCount; i++) {
      this.plants.push(generatePlantData(i, this.params.heightRange));
    }
    this.currentDensity = targetCount;

    this.glowSprites.forEach(s => {
      (s.material as THREE.Material).dispose();
      s.parent?.remove(s);
    });
    this.glowSprites = [];

    const glowCount = Math.min(Math.floor(targetCount * 0.15), 200);
    for (let i = 0; i < glowCount; i++) {
      const sprite = this.glowSprite.clone();
      const scale = 0.5 + Math.random() * 1.5;
      sprite.scale.set(scale, scale, scale);
      this.glowSprites.push(sprite);
      this.trunkMesh.parent?.add(sprite);
    }
  }

  private computeSeasonColor(baseHue: number, hueShift: number, seasonFactor: number, plantIdx: number): { r: number; g: number; b: number } {
    const hue = baseHue + hueShift + this.plants[plantIdx].hueOffset;

    const springColor = hslToRgb(hue, 0.7, 0.6);
    const summerColor = hslToRgb(hue, 0.75, 0.4);
    const autumnColor = hslToRgb((hue + 30) % 360, 0.85, 0.55);
    const winterColor = hslToRgb(hue, 0.1, 0.65);

    if (seasonFactor <= 0.33) {
      const t = seasonFactor / 0.33;
      return lerpColor(springColor, summerColor, t);
    } else if (seasonFactor <= 0.66) {
      const t = (seasonFactor - 0.33) / 0.33;
      return lerpColor(summerColor, autumnColor, t);
    } else {
      const t = (seasonFactor - 0.66) / 0.34;
      return lerpColor(autumnColor, winterColor, t);
    }
  }

  update(time: number) {
    const count = this.plants.length;
    const now = performance.now();

    const baseLeafHex = this.params.leafColor;
    const baseLeafColor = hexToRgb(baseLeafHex);
    const baseLeafHue = THREE.MathUtils.radToDeg(Math.atan2(
      Math.sqrt(3) * (baseLeafColor.g - baseLeafColor.b),
      2 * baseLeafColor.r - baseLeafColor.g - baseLeafColor.b
    ));
    const leafHue = isNaN(baseLeafHue) ? 120 : baseLeafHue;

    const baseTrunkColor = hexToRgb(this.params.trunkColor);

    for (let i = 0; i < count; i++) {
      const plant = this.plants[i];

      const growthElapsed = (now - plant.growthStartTime) * this.params.growthSpeed;
      const growthProgress = Math.min(1, Math.max(0, growthElapsed / plant.growthDuration));
      plant.currentHeight = 0.1 + (plant.targetHeight - 0.1) * growthProgress;

      const windPhase = time * WIND_FREQUENCY * Math.PI * 2 + plant.phaseOffset;
      const windAmplitude = this.params.windStrength * 0.08;

      const trunkHeight = plant.currentHeight * 0.35;
      const leafHeight = plant.currentHeight * 0.7;

      this.dummy.position.copy(plant.position);
      this.dummy.rotation.y = plant.rotation;
      this.dummy.rotation.z = Math.sin(windPhase) * windAmplitude * 0.5;
      this.dummy.scale.set(
        plant.baseRadius * 0.6,
        trunkHeight,
        plant.baseRadius * 0.6
      );
      this.dummy.updateMatrix();
      this.trunkMesh.setMatrixAt(i, this.dummy.matrix);

      const trunkDim = lerpColor(baseTrunkColor, { r: 0, g: 0, b: 0 }, 0.5);
      this.tempColor.setRGB(trunkDim.r, trunkDim.g, trunkDim.b);
      this.trunkMesh.setColorAt?.(i, this.tempColor);

      const leafColor = this.computeSeasonColor(leafHue, this.params.hueShift, this.params.seasonFactor, i);
      const tipSwing = Math.sin(windPhase) * windAmplitude * plant.currentHeight;
      this.dummy.position.set(
        plant.position.x + tipSwing * 0.7,
        plant.position.y + trunkHeight * 0.85,
        plant.position.z + tipSwing * 0.3
      );
      this.dummy.rotation.y = plant.rotation + Math.sin(windPhase * 0.7) * 0.1;
      this.dummy.rotation.z = Math.sin(windPhase + 0.3) * windAmplitude;
      const leafScale = plant.baseRadius * 2.5 + plant.currentHeight * 0.1;
      this.dummy.scale.set(leafScale, leafHeight, leafScale);
      this.dummy.updateMatrix();
      this.leafMesh.setMatrixAt(i, this.dummy.matrix);

      const backColor = lerpColor(leafColor, { r: 0, g: 0, b: 0 }, 0.35);
      this.tempColor.setRGB(backColor.r, backColor.g, backColor.b);
      this.leafMesh.setColorAt?.(i, this.tempColor);
    }

    this.trunkMesh.count = count;
    this.leafMesh.count = count;
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.leafMesh.instanceMatrix.needsUpdate = true;
    if (this.trunkMesh.instanceColor) this.trunkMesh.instanceColor.needsUpdate = true;
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < this.glowSprites.length && i < count; i++) {
      const sprite = this.glowSprites[i];
      const idx = Math.floor((i / this.glowSprites.length) * count);
      const plant = this.plants[idx];
      const topX = plant.position.x + Math.sin(time * WIND_FREQUENCY * Math.PI * 2 + plant.phaseOffset) *
        this.params.windStrength * 0.08 * plant.currentHeight;
      const topZ = plant.position.z + Math.cos(time * WIND_FREQUENCY * Math.PI * 2 + plant.phaseOffset) *
        this.params.windStrength * 0.04 * plant.currentHeight;
      sprite.position.set(topX, plant.currentHeight * 1.1, topZ);
      const glowColor = this.computeSeasonColor(leafHue, this.params.hueShift, this.params.seasonFactor, idx);
      (sprite.material as THREE.SpriteMaterial).color.setRGB(glowColor.r, glowColor.g, glowColor.b);
      (sprite.material as THREE.SpriteMaterial).opacity = 0.4 + 0.3 * Math.sin(time * 2 + i);
    }
  }

  getMeshes(): THREE.Object3D[] {
    return [this.trunkMesh, this.leafMesh, ...this.glowSprites];
  }

  dispose(scene: THREE.Scene) {
    this.trunkMesh.geometry.dispose();
    (this.trunkMesh.material as THREE.Material).dispose();
    this.leafMesh.geometry.dispose();
    (this.leafMesh.material as THREE.Material).dispose();
    this.glowSprites.forEach(s => {
      (s.material as THREE.Material).dispose();
    });
    scene.remove(this.trunkMesh);
    scene.remove(this.leafMesh);
    this.glowSprites.forEach(s => scene.remove(s));
  }
}

export function updateVegetation(system: VegetationSystem, time: number): THREE.Object3D[] {
  system.update(time);
  return system.getMeshes();
}
