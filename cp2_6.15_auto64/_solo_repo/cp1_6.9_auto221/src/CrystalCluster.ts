import * as THREE from 'three';
import {
  ColorTheme,
  THEMES,
  getRippleTexture,
  lerpColor,
  getThemeGradient,
  TipEmitter
} from './effects';

export interface CrystalClusterConfig {
  position: THREE.Vector3;
  theme: ColorTheme;
  crystalCount: number;
}

interface HoverState {
  isHovered: boolean;
  targetScale: number;
  targetBrightness: number;
  currentScale: number;
  currentBrightness: number;
}

interface PulseFlash {
  active: boolean;
  totalFlashes: number;
  flashIndex: number;
  elapsed: number;
  flashDuration: number;
  flashColor: THREE.Color;
}

interface CrystalPillar {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  baseColor: THREE.Color;
  height: number;
  topRadius: number;
  baseOffset: THREE.Vector3;
  tipLocal: THREE.Vector3;
  light: THREE.PointLight;
  textureOffsetSpeed: number;
  textureBase: number;
}

export class CrystalCluster extends THREE.Group implements TipEmitter {
  private pillars: CrystalPillar[] = [];
  private theme: ColorTheme;
  private hoverState: HoverState;
  private pulseFlash: PulseFlash;
  private rotationSpeed: THREE.Vector3;
  private bobPhase: number;
  private bobAxis: THREE.Vector3;
  private flyInProgress: number = 0;
  private flyFrom: THREE.Vector3 = new THREE.Vector3();
  private flyTo: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3;
  private currentThemeColors: [THREE.Color, THREE.Color];
  private themeTransition: {
    active: boolean;
    from: [THREE.Color, THREE.Color];
    to: [THREE.Color, THREE.Color];
    elapsed: number;
    duration: number;
  } = { active: false, from: [new THREE.Color(), new THREE.Color()], to: [new THREE.Color(), new THREE.Color()], elapsed: 0, duration: 2 };
  private pulseAccent: THREE.Color = new THREE.Color();
  private hoveredState: boolean = false;

  constructor(config: CrystalClusterConfig) {
    super();
    this.theme = config.theme;
    this.targetPosition = config.position.clone();
    this.flyTo.copy(config.position);

    const palette = THEMES[this.theme];
    this.currentThemeColors = [palette.colors[0].clone(), palette.colors[1].clone()];

    this.hoverState = {
      isHovered: false,
      targetScale: 1,
      targetBrightness: 1,
      currentScale: 0.01,
      currentBrightness: 0.3
    };

    this.pulseFlash = {
      active: false,
      totalFlashes: 2,
      flashIndex: 0,
      elapsed: 0,
      flashDuration: 0.3,
      flashColor: new THREE.Color()
    };

    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.25 + 0.1,
      (Math.random() - 0.5) * 0.1
    );

    this.bobPhase = Math.random() * Math.PI * 2;
    this.bobAxis = new THREE.Vector3(
      (Math.random() - 0.5),
      Math.random() * 0.5 + 0.2,
      (Math.random() - 0.5)
    ).normalize();

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const flyDist = 14 + Math.random() * 6;
    this.flyFrom.set(
      this.flyTo.x + flyDist * Math.sin(phi) * Math.cos(theta),
      this.flyTo.y + flyDist * Math.sin(phi) * Math.sin(theta),
      this.flyTo.z + flyDist * Math.cos(phi)
    );
    this.flyInProgress = 0;

    this.position.copy(this.flyFrom);
    this.scale.setScalar(0.01);

    this.buildPillars(config.crystalCount);
  }

  private buildPillars(count: number): void {
    const rippleTex = getRippleTexture();
    const pillarCount = Math.max(3, Math.min(9, count));

    for (let i = 0; i < pillarCount; i++) {
      const t = i / Math.max(1, pillarCount - 1);
      const gradientColor = getThemeGradient(this.theme, 0.15 + t * 0.7 + (Math.random() - 0.5) * 0.2);

      const topR = 0.04 + Math.random() * 0.08;
      const botR = 0.08 + Math.random() * 0.14;
      const height = 0.5 + Math.random() * 1.4;
      const radialSeg = 5 + Math.floor(Math.random() * 3);
      const heightSeg = 3;

      const geo = new THREE.CylinderGeometry(topR, botR, height, radialSeg, heightSeg, false);
      const posAttr = geo.attributes.position;
      for (let v = 0; v < posAttr.count; v++) {
        const nx = posAttr.getX(v);
        const ny = posAttr.getY(v);
        const nz = posAttr.getZ(v);
        const heightNorm = (ny + height / 2) / height;
        const wobble = 1 + Math.sin(heightNorm * Math.PI * 2 + i * 0.7) * 0.06 + (Math.random() - 0.5) * 0.03;
        posAttr.setXYZ(v, nx * wobble, ny, nz * wobble);
      }
      geo.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        color: gradientColor.clone(),
        emissive: gradientColor.clone().multiplyScalar(0.6),
        emissiveMap: rippleTex,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.75 + Math.random() * 0.12,
        roughness: 0.12 + Math.random() * 0.1,
        metalness: 0.08 + Math.random() * 0.08,
        transmission: 0.25 + Math.random() * 0.15,
        thickness: 0.3 + Math.random() * 0.4,
        ior: 1.4,
        clearcoat: 0.3 + Math.random() * 0.5,
        clearcoatRoughness: 0.1 + Math.random() * 0.1,
        side: THREE.DoubleSide,
        depthWrite: true
      });

      const mesh = new THREE.Mesh(geo, mat);

      const angle = (i / pillarCount) * Math.PI * 2 + Math.random() * 0.8;
      const radius = 0.05 + Math.random() * 0.25;
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;
      const offsetY = (Math.random() - 0.5) * 0.3 - height * 0.05;

      mesh.position.set(offsetX, offsetY + height / 2, offsetZ);

      mesh.rotation.x = (Math.random() - 0.5) * 0.4;
      mesh.rotation.z = (Math.random() - 0.5) * 0.4;
      mesh.rotation.y = Math.random() * Math.PI;

      this.add(mesh);

      const lightColor = gradientColor.clone();
      const light = new THREE.PointLight(lightColor, 0.3 + Math.random() * 0.3, 3.0, 2.0);
      light.position.set(offsetX, offsetY + height * 0.85, offsetZ);
      this.add(light);

      const tipLocal = new THREE.Vector3(offsetX, offsetY + height, offsetZ);

      this.pillars.push({
        mesh,
        material: mat,
        baseColor: gradientColor.clone(),
        height,
        topRadius: topR,
        baseOffset: new THREE.Vector3(offsetX, offsetY, offsetZ),
        tipLocal,
        light,
        textureOffsetSpeed: 0.3 + Math.random() * 1.2,
        textureBase: Math.random() * 100
      });
    }
  }

  getThemeColors(): [THREE.Color, THREE.Color] {
    return [this.currentThemeColors[0], this.currentThemeColors[1]];
  }

  getEmissionRate(): number {
    return this.hoveredState ? 40 + this.pillars.length * 12 : 6 + this.pillars.length * 2;
  }

  isHovered(): boolean {
    return this.hoveredState;
  }

  getTipWorldPosition(target: THREE.Vector3): void {
    if (this.pillars.length === 0) {
      this.getWorldPosition(target);
      return;
    }
    const idx = Math.floor(Math.random() * this.pillars.length);
    const pillar = this.pillars[idx];
    target.copy(pillar.tipLocal);
    this.localToWorld(target);
  }

  getAllTipWorldPositions(): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
    for (const p of this.pillars) {
      const v = new THREE.Vector3();
      v.copy(p.tipLocal);
      this.localToWorld(v);
      result.push(v);
    }
    return result;
  }

  setHovered(hovered: boolean): void {
    this.hoverState.isHovered = hovered;
    this.hoveredState = hovered;
    this.hoverState.targetScale = hovered ? 1.35 : 1.0;
    this.hoverState.targetBrightness = hovered ? 1.6 : 1.0;
  }

  triggerPulse(pulseTheme: ColorTheme): void {
    const palette = THEMES[pulseTheme];
    this.pulseFlash.active = true;
    this.pulseFlash.flashIndex = 0;
    this.pulseFlash.elapsed = 0;
    this.pulseFlash.flashColor = palette.accent.clone();
  }

  setTheme(theme: ColorTheme): void {
    if (this.theme === theme && !this.themeTransition.active) return;
    const palette = THEMES[theme];
    this.themeTransition = {
      active: true,
      from: [this.currentThemeColors[0].clone(), this.currentThemeColors[1].clone()],
      to: [palette.colors[0].clone(), palette.colors[1].clone()],
      elapsed: 0,
      duration: 2.0
    };
    this.theme = theme;
  }

  setFlyTarget(target: THREE.Vector3): void {
    this.flyFrom.copy(this.position);
    this.flyTo.copy(target);
    this.targetPosition.copy(target);
    this.flyInProgress = 0;
  }

  startFlyIn(): void {
    this.flyInProgress = 0.001;
  }

  flyOut(): Promise<void> {
    return new Promise((resolve) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dist = 18;
      const outTarget = new THREE.Vector3(
        this.position.x + dist * Math.sin(phi) * Math.cos(theta),
        this.position.y + dist * Math.sin(phi) * Math.sin(theta),
        this.position.z + dist * Math.cos(phi)
      );
      this.flyFrom.copy(this.position);
      this.flyTo.copy(outTarget);
      const startT = performance.now();
      const duration = 900;
      const animateOut = () => {
        const t = Math.min((performance.now() - startT) / duration, 1);
        const eased = t * t;
        this.position.lerpVectors(this.flyFrom, this.flyTo, eased);
        const s = 1 - eased;
        this.scale.setScalar(Math.max(0.01, s * this.hoverState.currentScale));
        for (const p of this.pillars) {
          p.material.opacity = Math.max(0.01, (0.75 + 0.12) * s);
        }
        if (t < 1) {
          requestAnimationFrame(animateOut);
        } else {
          this.dispose();
          resolve();
        }
      };
      animateOut();
    });
  }

  update(delta: number, time: number, rippleSpeed: number, cameraDir?: THREE.Vector3): void {
    if (this.flyInProgress >= 0 && this.flyInProgress < 1) {
      this.flyInProgress += delta / 1.4;
      const t = Math.min(this.flyInProgress, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.position.lerpVectors(this.flyFrom, this.flyTo, eased);
    } else if (this.flyInProgress >= 1) {
      this.flyInProgress = 1;
      const bob = Math.sin(time * 0.8 + this.bobPhase) * 0.04;
      this.position.x = this.targetPosition.x + this.bobAxis.x * bob;
      this.position.y = this.targetPosition.y + this.bobAxis.y * bob;
      this.position.z = this.targetPosition.z + this.bobAxis.z * bob;

      this.rotation.x += this.rotationSpeed.x * delta;
      this.rotation.y += this.rotationSpeed.y * delta;
      this.rotation.z += this.rotationSpeed.z * delta;
    }

    const scaleLerp = Math.min(1, delta * 4);
    this.hoverState.currentScale = THREE.MathUtils.lerp(
      this.hoverState.currentScale,
      this.hoverState.targetScale,
      scaleLerp
    );
    this.hoverState.currentBrightness = THREE.MathUtils.lerp(
      this.hoverState.currentBrightness,
      this.hoverState.targetBrightness,
      scaleLerp
    );
    this.scale.setScalar(Math.max(0.01, this.hoverState.currentScale * Math.max(0.01, this.flyInProgress)));

    if (this.themeTransition.active) {
      this.themeTransition.elapsed += delta;
      const t = Math.min(this.themeTransition.elapsed / this.themeTransition.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.currentThemeColors[0].lerpColors(this.themeTransition.from[0], this.themeTransition.to[0], eased);
      this.currentThemeColors[1].lerpColors(this.themeTransition.from[1], this.themeTransition.to[1], eased);
      if (t >= 1) this.themeTransition.active = false;
    }

    if (this.pulseFlash.active) {
      this.pulseFlash.elapsed += delta;
      if (this.pulseFlash.elapsed >= this.pulseFlash.flashDuration) {
        this.pulseFlash.elapsed = 0;
        this.pulseFlash.flashIndex++;
        if (this.pulseFlash.flashIndex >= this.pulseFlash.totalFlashes * 2) {
          this.pulseFlash.active = false;
        }
      }
    }

    for (let i = 0; i < this.pillars.length; i++) {
      const pillar = this.pillars[i];
      const gradT = i / Math.max(1, this.pillars.length - 1);
      const pillarColor = lerpColor(this.currentThemeColors[0], this.currentThemeColors[1], 0.15 + gradT * 0.7);

      let finalColor = pillarColor;
      let emissiveMult = this.hoverState.currentBrightness * 0.7;
      let opacityBase = 0.78;

      if (this.pulseFlash.active) {
        const onPhase = this.pulseFlash.flashIndex % 2 === 0;
        const flashT = this.pulseFlash.elapsed / this.pulseFlash.flashDuration;
        const flashStrength = onPhase
          ? Math.sin(flashT * Math.PI)
          : 0;
        finalColor = lerpColor(pillarColor, this.pulseFlash.flashColor, flashStrength * 0.8);
        emissiveMult += flashStrength * 2.5;
        opacityBase += flashStrength * 0.18;
      }

      pillar.material.color.copy(finalColor);
      const emissiveCol = finalColor.clone().multiplyScalar(emissiveMult);
      pillar.material.emissive.copy(emissiveCol);
      pillar.material.opacity = opacityBase;

      if (pillar.material.emissiveMap) {
        const map = pillar.material.emissiveMap as THREE.Texture;
        let offsetX = time * 0.15 * rippleSpeed * pillar.textureOffsetSpeed + pillar.textureBase;
        let offsetY = -time * 0.25 * rippleSpeed * pillar.textureOffsetSpeed + pillar.textureBase * 0.5;

        if (cameraDir) {
          const parallaxX = cameraDir.x * 0.25;
          const parallaxY = cameraDir.y * 0.18;
          offsetX += parallaxX * (1 + gradT * 0.5);
          offsetY += parallaxY * (1 + gradT * 0.5);
        }

        map.offset.x = offsetX % 1;
        map.offset.y = offsetY % 1;
        map.repeat.set(1.2 + gradT * 0.6, 2 + Math.sin(time * 0.3 + i) * 0.3);
        map.rotation = pillar.mesh.rotation.y * 0.3 + Math.sin(time * 0.2 + i) * 0.1;
      }

      const lightIntensity = (0.35 + Math.sin(time * 2.0 + i + this.bobPhase) * 0.15) *
        this.hoverState.currentBrightness *
        Math.max(0.01, this.flyInProgress);
      pillar.light.intensity = lightIntensity;
      pillar.light.color.copy(finalColor).lerp(THEMES[this.theme].accent, 0.3);
    }
  }

  getClusterColor(): THREE.Color {
    return this.currentThemeColors[0].clone().lerp(this.currentThemeColors[1], 0.5);
  }

  dispose(): void {
    if (this.parent) this.parent.remove(this);
    for (const pillar of this.pillars) {
      pillar.light.dispose?.();
      (pillar.mesh.geometry as THREE.BufferGeometry).dispose();
      pillar.material.dispose();
      this.remove(pillar.mesh);
      this.remove(pillar.light);
    }
    this.pillars = [];
  }
}
