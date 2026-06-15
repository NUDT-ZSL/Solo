import * as THREE from 'three';
import { Maze } from './maze';

export interface Orb {
  mesh: THREE.Mesh;
  collected: boolean;
  collectProgress: number;
  color: THREE.Color;
  basePosition: THREE.Vector3;
}

export interface Trap {
  mesh: THREE.Mesh;
  path: { x: number; z: number }[];
  pathIndex: number;
  progress: number;
  speed: number;
  active: boolean;
  respawnTimer: number;
  originalPath: { x: number; z: number }[];
}

export interface ThrownOrb {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  color: THREE.Color;
}

export interface VictoryParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export type Rating = 'S' | 'A' | 'B' | 'C';

export interface GameState {
  orbsCollected: number;
  totalOrbs: number;
  elapsedTime: number;
  isVictory: boolean;
  isPaused: boolean;
}

const ORB_COLORS = [0xff4444, 0x44ff44, 0x4488ff, 0xffff44, 0xaa44ff];

export class Game {
  private scene: THREE.Scene;
  private maze: Maze;
  private orbs: Orb[] = [];
  private traps: Trap[] = [];
  private thrownOrbs: ThrownOrb[] = [];
  private victoryParticles: VictoryParticle[] = [];
  private elapsedTime: number = 0;
  private orbsCollected: number = 0;
  readonly totalOrbs: number = 10;
  private isVictory: boolean = false;
  private isPaused: boolean = false;
  private exitPosition: THREE.Vector3;
  private exitRing: THREE.Mesh;
  private audioContext: AudioContext | null = null;
  private onOrbCollected: (count: number) => void;
  private onTimeUpdated: (time: string) => void;
  private onDamage: () => void;
  private onVictory: (time: number, rating: Rating, comment: string) => void;
  private pickupCooldown: number = 0;

  constructor(
    scene: THREE.Scene,
    maze: Maze,
    callbacks: {
      onOrbCollected: (count: number) => void;
      onTimeUpdated: (time: string) => void;
      onDamage: () => void;
      onVictory: (time: number, rating: Rating, comment: string) => void;
    }
  ) {
    this.scene = scene;
    this.maze = maze;
    this.onOrbCollected = callbacks.onOrbCollected;
    this.onTimeUpdated = callbacks.onTimeUpdated;
    this.onDamage = callbacks.onDamage;
    this.onVictory = callbacks.onVictory;

    const exit = this.maze.cellToWorld(this.maze.size - 1, this.maze.size - 1);
    this.exitPosition = new THREE.Vector3(exit.x, 1.2, exit.z);
    this.exitRing = this.createExitRing();
    this.scene.add(this.exitRing);

    this.createOrbs();
    this.createTraps();
    this.initAudio();
  }

  private createExitRing(): THREE.Mesh {
    const geometry = new THREE.TorusGeometry(0.8, 0.15, 16, 48);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.exitPosition);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  private createOrbs(): void {
    const positions = this.maze.getRandomCorridorPositions(this.totalOrbs);

    for (let i = 0; i < positions.length; i++) {
      const color = new THREE.Color(ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)]);
      const geometry = new THREE.SphereGeometry(0.3, 24, 24);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(positions[i].x, 1.2, positions[i].z);

      const light = new THREE.PointLight(color, 0.6, 3);
      mesh.add(light);

      this.scene.add(mesh);
      this.orbs.push({
        mesh,
        collected: false,
        collectProgress: 0,
        color,
        basePosition: mesh.position.clone(),
      });
    }
  }

  private createTraps(): void {
    for (let i = 0; i < 3; i++) {
      const path = this.maze.getRandomPath(12);

      const geometry = new THREE.SphereGeometry(0.8, 24, 24);
      const material = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x330033,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(path[0].x, 1.2, path[0].z);

      const fog = new THREE.PointLight(0x660066, 0.4, 3);
      mesh.add(fog);

      this.scene.add(mesh);
      this.traps.push({
        mesh,
        path: [...path],
        originalPath: [...path],
        pathIndex: 0,
        progress: 0,
        speed: 1.5,
        active: true,
        respawnTimer: 0,
      });
    }
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.startAmbientSound();
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  private startAmbientSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55;
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.04;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 82.5;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.025;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.015;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;

    osc1.connect(gain1).connect(masterGain);
    osc2.connect(gain2).connect(masterGain);
    noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    noise.start();
  }

  playCollectSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playDamageSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playVictorySound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  update(deltaTime: number, playerPos: THREE.Vector3, playerForward: THREE.Vector3): boolean {
    if (this.isPaused || this.isVictory) return false;

    if (this.pickupCooldown > 0) this.pickupCooldown -= deltaTime;

    this.elapsedTime += deltaTime;
    this.onTimeUpdated(this.formatTime(this.elapsedTime));

    this.updateExitRing(deltaTime);
    this.updateOrbs(deltaTime, playerPos);
    this.updateTraps(deltaTime);
    this.updateThrownOrbs(deltaTime);
    this.updateVictoryParticles(deltaTime);

    const hitTrap = this.checkTrapCollision(playerPos);
    if (hitTrap) {
      this.handleTrapHit();
    }

    if (this.orbsCollected >= this.totalOrbs) {
      const dist = playerPos.distanceTo(this.exitPosition);
      if (dist < 1.2 && !this.isVictory) {
        this.triggerVictory();
      }
    }

    return hitTrap;
  }

  private updateExitRing(deltaTime: number): void {
    this.exitRing.rotation.z += deltaTime * 1.5;
    const scale = 1 + Math.sin(this.elapsedTime * 2) * 0.08;
    this.exitRing.scale.setScalar(scale);

    const allCollected = this.orbsCollected >= this.totalOrbs;
    const mat = this.exitRing.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = allCollected ? 2.5 + Math.sin(this.elapsedTime * 5) * 0.8 : 1.2;
  }

  private updateOrbs(deltaTime: number, playerPos: THREE.Vector3): void {
    for (const orb of this.orbs) {
      if (orb.collected) {
        orb.collectProgress += deltaTime * 3.3;
        const t = orb.collectProgress;
        orb.mesh.position.y = orb.basePosition.y + t * 2;
        orb.mesh.scale.setScalar(Math.max(0, 1 - t));
        const mat = orb.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, 1 - t);
        if (t >= 1) {
          this.scene.remove(orb.mesh);
        }
        continue;
      }

      orb.mesh.position.y = orb.basePosition.y + Math.sin(this.elapsedTime * 2 + orb.basePosition.x) * 0.15;
      orb.mesh.rotation.y += deltaTime * 2;

      const dist = playerPos.distanceTo(orb.mesh.position);
      if (dist < 0.7 && this.pickupCooldown <= 0) {
        orb.collected = true;
        orb.collectProgress = 0;
        this.orbsCollected++;
        this.onOrbCollected(this.orbsCollected);
        this.playCollectSound();
      }
    }
  }

  private updateTraps(deltaTime: number): void {
    for (const trap of this.traps) {
      if (!trap.active) {
        trap.respawnTimer -= deltaTime;
        if (trap.respawnTimer <= 0) {
          trap.active = true;
          trap.mesh.visible = true;
          trap.path = [...trap.originalPath];
          trap.pathIndex = 0;
          trap.progress = 0;
          trap.mesh.position.set(trap.path[0].x, 1.2, trap.path[0].z);
        }
        continue;
      }

      if (trap.path.length < 2) continue;

      const from = trap.path[trap.pathIndex];
      const to = trap.path[(trap.pathIndex + 1) % trap.path.length];

      const segDist = Math.sqrt(
        Math.pow(to.x - from.x, 2) + Math.pow(to.z - from.z, 2)
      );
      if (segDist === 0) {
        trap.pathIndex = (trap.pathIndex + 1) % trap.path.length;
        continue;
      }

      trap.progress += (trap.speed * deltaTime) / segDist;

      if (trap.progress >= 1) {
        trap.progress = 0;
        trap.pathIndex = (trap.pathIndex + 1) % trap.path.length;
      }

      const t = trap.progress;
      trap.mesh.position.x = from.x + (to.x - from.x) * t;
      trap.mesh.position.z = from.z + (to.z - from.z) * t;
      trap.mesh.position.y = 1.2 + Math.sin(this.elapsedTime * 3 + trap.pathIndex) * 0.1;
      trap.mesh.rotation.y += deltaTime * 1.5;

      const scale = 1 + Math.sin(this.elapsedTime * 4 + trap.pathIndex) * 0.05;
      trap.mesh.scale.setScalar(scale);
    }
  }

  private updateThrownOrbs(deltaTime: number): void {
    for (let i = this.thrownOrbs.length - 1; i >= 0; i--) {
      const thrown = this.thrownOrbs[i];
      thrown.velocity.y -= 9.8 * deltaTime;
      thrown.mesh.position.add(thrown.velocity.clone().multiplyScalar(deltaTime));
      thrown.life -= deltaTime;
      thrown.mesh.rotation.y += deltaTime * 5;

      let hitTrap = false;
      for (const trap of this.traps) {
        if (!trap.active) continue;
        const dist = thrown.mesh.position.distanceTo(trap.mesh.position);
        if (dist < 1.0) {
          trap.active = false;
          trap.respawnTimer = 3;
          trap.mesh.visible = false;
          hitTrap = true;
          break;
        }
      }

      const cell = this.maze.worldToCell(thrown.mesh.position.x, thrown.mesh.position.z);
      const mazeCell = this.maze.getCell(cell.x, cell.y);
      const hitWall = !mazeCell || thrown.mesh.position.y < 0.2;

      if (hitTrap || hitWall || thrown.life <= 0) {
        this.scene.remove(thrown.mesh);
        this.thrownOrbs.splice(i, 1);
      }
    }
  }

  private updateVictoryParticles(deltaTime: number): void {
    for (let i = this.victoryParticles.length - 1; i >= 0; i--) {
      const p = this.victoryParticles[i];
      p.velocity.y -= 4 * deltaTime;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.life -= deltaTime;

      const alpha = Math.max(0, p.life / p.maxLife);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = alpha;
      p.mesh.scale.setScalar(alpha * 0.3 + 0.05);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.victoryParticles.splice(i, 1);
      }
    }
  }

  private checkTrapCollision(playerPos: THREE.Vector3): boolean {
    for (const trap of this.traps) {
      if (!trap.active) continue;
      const dx = playerPos.x - trap.mesh.position.x;
      const dz = playerPos.z - trap.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.9) return true;
    }
    return false;
  }

  private handleTrapHit(): void {
    if (this.orbsCollected > 0) {
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        if (this.orbs[i].collected && this.orbs[i].collectProgress >= 1) continue;
        if (this.orbs[i].collected) continue;
        this.orbs[i].collected = true;
        this.orbs[i].collectProgress = 1;
        this.scene.remove(this.orbs[i].mesh);
        this.orbsCollected--;
        this.onOrbCollected(this.orbsCollected);
        break;
      }
    }
    this.onDamage();
    this.playDamageSound();
    this.pickupCooldown = 0.3;
  }

  throwOrb(position: THREE.Vector3, direction: THREE.Vector3): boolean {
    if (this.orbsCollected <= 0) return false;

    this.orbsCollected--;
    this.onOrbCollected(this.orbsCollected);

    const color = new THREE.Color(ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)]);
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = 1.5;

    const light = new THREE.PointLight(color, 0.5, 2);
    mesh.add(light);

    this.scene.add(mesh);
    this.thrownOrbs.push({
      mesh,
      velocity: direction.clone().multiplyScalar(12).add(new THREE.Vector3(0, 3, 0)),
      life: 2.5,
      color,
    });

    return true;
  }

  private triggerVictory(): void {
    this.isVictory = true;
    this.playVictorySound();
    this.spawnVictoryParticles();

    const rating = this.calculateRating();
    const comment = this.getComment(rating);

    setTimeout(() => {
      this.onVictory(this.elapsedTime, rating, comment);
    }, 500);
  }

  private spawnVictoryParticles(): void {
    const colors = [0xff4444, 0x44ff44, 0x4488ff, 0xffff44, 0xaa44ff, 0x22d3ee, 0xffd700];
    for (let i = 0; i < 50; i++) {
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      const geometry = new THREE.SphereGeometry(0.15, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(this.exitPosition);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 4;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 2,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.scene.add(mesh);
      this.victoryParticles.push({
        mesh,
        velocity,
        life: 2,
        maxLife: 2,
      });
    }
  }

  private calculateRating(): Rating {
    const t = this.elapsedTime;
    if (t < 60) return 'S';
    if (t < 90) return 'A';
    if (t < 120) return 'B';
    return 'C';
  }

  private getComment(rating: Rating): string {
    switch (rating) {
      case 'S': return '神速之姿！传说级探险家！';
      case 'A': return '出色表现！你是天生的探险家！';
      case 'B': return '不错的成绩，再接再厉！';
      case 'C': return '安全通关就是胜利！';
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  getState(): GameState {
    return {
      orbsCollected: this.orbsCollected,
      totalOrbs: this.totalOrbs,
      elapsedTime: this.elapsedTime,
      isVictory: this.isVictory,
      isPaused: this.isPaused,
    };
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  resumeAudio(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  dispose(): void {
    for (const orb of this.orbs) {
      this.scene.remove(orb.mesh);
      orb.mesh.geometry.dispose();
      (orb.mesh.material as THREE.Material).dispose();
    }
    for (const trap of this.traps) {
      this.scene.remove(trap.mesh);
      trap.mesh.geometry.dispose();
      (trap.mesh.material as THREE.Material).dispose();
    }
    for (const thrown of this.thrownOrbs) {
      this.scene.remove(thrown.mesh);
      thrown.mesh.geometry.dispose();
      (thrown.mesh.material as THREE.Material).dispose();
    }
    for (const p of this.victoryParticles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.exitRing);
    this.exitRing.geometry.dispose();
    (this.exitRing.material as THREE.Material).dispose();
  }
}
