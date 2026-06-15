import * as THREE from 'three';
import { Rune } from './RuneSystem';
import { ParticleSystem } from './utils/Particles';

export type AltarCompleteCallback = () => void;

interface PulseWave {
  mesh: THREE.Mesh;
  speed: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export class AltarSystem {
  private scene: THREE.Scene;
  private altarGroup: THREE.Group;
  private rings: THREE.Mesh[] = [];
  private ringAngularSpeeds: number[] = [];
  private ringOscillationAmplitudes: number[] = [0.1, 0.15, 0.2];
  private ringBaseY: number[] = [0, 0.2, 0.4];
  private centerSphere!: THREE.Mesh;
  private centerGlow!: THREE.Mesh;
  private outerGlow!: THREE.Mesh;
  private runeRingGroup: THREE.Group;
  private collectedRunes: Rune[] = [];
  private runeRingRadius: number = 2;
  private runeRingHeight: number = 2;
  private runeRingAngularSpeed: number = 0.02;
  private runeRingRotation: number = 0;
  private pulseWaves: PulseWave[] = [];
  private particleSystem: ParticleSystem;
  private fireworksActive: boolean = false;
  private fireworksTimer: number = 0;
  private fireworksDuration: number = 3;
  private isComplete: boolean = false;
  private onComplete: AltarCompleteCallback | null = null;
  private time: number = 0;
  private totalRunes: number = 40;

  constructor(scene: THREE.Scene, totalRunes: number = 40) {
    this.scene = scene;
    this.totalRunes = totalRunes;
    this.altarGroup = new THREE.Group();
    this.runeRingGroup = new THREE.Group();
    this.altarGroup.add(this.runeRingGroup);

    this.createAltarModel();
    this.createGlowEffects();

    this.particleSystem = new ParticleSystem(scene, 1000, 3);

    this.scene.add(this.altarGroup);
  }

  setCompleteCallback(callback: AltarCompleteCallback): void {
    this.onComplete = callback;
  }

  private createAltarModel(): void {
    const ringRadii = [0.8, 1.2, 1.6];
    const ringColors = [0xaa66ff, 0x8844dd, 0x6622bb];

    for (let i = 0; i < 3; i++) {
      const geo = new THREE.TorusGeometry(ringRadii[i], 0.03, 16, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = this.ringBaseY[i];
      this.rings.push(ring);
      this.ringAngularSpeeds.push(0.3 + i * 0.15);
      this.altarGroup.add(ring);
    }

    const sphereGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });
    this.centerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.centerSphere.position.y = 1.2;
    this.altarGroup.add(this.centerSphere);

    const innerGlowGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0xccaaff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.y = 1.2;
    this.altarGroup.add(innerGlow);
  }

  private createGlowEffects(): void {
    const glowGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.centerGlow = new THREE.Mesh(glowGeo, glowMat);
    this.centerGlow.position.y = 1.2;
    this.altarGroup.add(this.centerGlow);

    const outerGlowGeo = new THREE.CircleGeometry(5, 64);
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(280 / 360, 0.8, 0.6),
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    this.outerGlow.rotation.x = -Math.PI / 2;
    this.outerGlow.position.y = 0.01;
    this.altarGroup.add(this.outerGlow);
  }

  addRune(rune: Rune): void {
    if (this.isComplete) return;

    this.collectedRunes.push(rune);

    this.scene.remove(rune.group);
    this.runeRingGroup.add(rune.group);

    this.updateRunePositions();

    this.runeRingAngularSpeed += 0.005;
    for (let i = 0; i < this.ringOscillationAmplitudes.length; i++) {
      this.ringOscillationAmplitudes[i] += 0.05;
    }

    for (const line of rune.lines) {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.copy(rune.baseColor);
      mat.linewidth = 2;
    }

    this.emitPulseWave();

    if (this.collectedRunes.length >= this.totalRunes) {
      this.triggerFireworks();
    }
  }

  private updateRunePositions(): void {
    const count = this.collectedRunes.length;
    for (let i = 0; i < count; i++) {
      const rune = this.collectedRunes[i];
      const angle = (i / count) * Math.PI * 2;
      const yOffset = Math.sin(i * 0.7) * 0.3;

      const targetPos = new THREE.Vector3(
        Math.cos(angle) * this.runeRingRadius,
        this.runeRingHeight + yOffset,
        Math.sin(angle) * this.runeRingRadius
      );

      rune.group.position.copy(targetPos);
      rune.group.lookAt(new THREE.Vector3(0, this.runeRingHeight, 0));
      rune.group.rotation.z += Math.PI / 2;
    }
  }

  private emitPulseWave(): void {
    const pulseGeo = new THREE.RingGeometry(0, 0.08, 64);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xccaaff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 1.2;
    this.altarGroup.add(pulse);

    this.pulseWaves.push({
      mesh: pulse,
      speed: 3,
      maxRadius: 8,
      life: 2.5,
      maxLife: 2.5
    });
  }

  private triggerFireworks(): void {
    this.fireworksActive = true;
    this.fireworksTimer = 0;

    const center = new THREE.Vector3(0, 1.2, 0);
    const localPos = this.altarGroup.localToWorld(center.clone());

    for (let burst = 0; burst < 8; burst++) {
      setTimeout(() => {
        if (!this.scene) return;
        for (let i = 0; i < 62; i++) {
          const pos = localPos.clone();
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const speed = 2 + Math.random() * 4;
          const velocity = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed,
            Math.sin(phi) * Math.sin(theta) * speed
          );

          const hue = Math.random();
          const color = new THREE.Color().setHSL(hue, 1, 0.6);

          this.particleSystem.emit(pos, 1, {
            velocityRange: new THREE.Vector3(velocity.x, velocity.y, velocity.z),
            color: color,
            life: 2 + Math.random() * 1.5,
            size: 4
          });
        }
      }, burst * 200);
    }

    setTimeout(() => {
      if (this.onComplete) {
        this.onComplete();
      }
    }, 3000);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      ring.rotation.z += this.ringAngularSpeeds[i] * deltaTime;
      ring.position.y = this.ringBaseY[i] + 
        Math.sin(this.time * (0.5 + i * 0.3)) * this.ringOscillationAmplitudes[i];
    }

    const pulse = 0.95 + Math.sin(this.time * 3) * 0.05;
    this.centerSphere.scale.setScalar(pulse);
    this.centerGlow.scale.setScalar(pulse * 1.2);

    const sphereMat = this.centerSphere.material as THREE.MeshBasicMaterial;
    const progress = this.collectedRunes.length / this.totalRunes;
    const hue = 280 + progress * 40;
    sphereMat.color.setHSL(hue / 360, 0.5, 0.9);

    this.runeRingRotation += this.runeRingAngularSpeed;
    this.runeRingGroup.rotation.y = this.runeRingRotation;

    for (let i = 0; i < this.collectedRunes.length; i++) {
      const rune = this.collectedRunes[i];
      const count = this.collectedRunes.length;
      const angle = (i / count) * Math.PI * 2;
      const baseY = this.runeRingHeight + Math.sin(i * 0.7 + this.time * 0.8) * 0.3;
      
      rune.group.position.set(
        Math.cos(angle) * this.runeRingRadius,
        baseY,
        Math.sin(angle) * this.runeRingRadius
      );
      rune.group.rotation.x += 0.02;
      rune.group.rotation.y += 0.03;
    }

    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const pw = this.pulseWaves[i];
      pw.life -= deltaTime;

      const t = 1 - pw.life / pw.maxLife;
      const currentRadius = t * pw.maxRadius;
      const opacity = Math.max(0, (1 - t) * 0.6);

      pw.mesh.scale.setScalar(currentRadius / 0.08);
      (pw.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      if (pw.life <= 0) {
        pw.mesh.geometry.dispose();
        (pw.mesh.material as THREE.Material).dispose();
        this.altarGroup.remove(pw.mesh);
        this.pulseWaves.splice(i, 1);
      }
    }

    this.particleSystem.update(deltaTime);

    if (this.fireworksActive) {
      this.fireworksTimer += deltaTime;
      const fadeT = Math.min(1, this.fireworksTimer / this.fireworksDuration);
      const scale = 1 + fadeT * 0.5;
      this.centerSphere.scale.setScalar(pulse * scale);

      if (this.fireworksTimer >= this.fireworksDuration) {
        this.fireworksActive = false;
        this.isComplete = true;
      }
    }
  }

  reduceParticleQuality(): void {
    this.particleSystem.setGlobalSize(2);
  }

  dispose(): void {
    this.particleSystem.dispose();

    for (const ring of this.rings) {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    this.centerSphere.geometry.dispose();
    (this.centerSphere.material as THREE.Material).dispose();
    this.centerGlow.geometry.dispose();
    (this.centerGlow.material as THREE.Material).dispose();
    this.outerGlow.geometry.dispose();
    (this.outerGlow.material as THREE.Material).dispose();

    for (const pw of this.pulseWaves) {
      pw.mesh.geometry.dispose();
      (pw.mesh.material as THREE.Material).dispose();
    }

    this.scene.remove(this.altarGroup);
  }
}
