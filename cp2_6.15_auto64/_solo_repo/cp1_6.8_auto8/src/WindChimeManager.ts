import * as THREE from 'three';

interface WindChime {
  group: THREE.Group;
  mesh: THREE.Mesh;
  glowLight: THREE.PointLight;
  ring: THREE.Mesh;
  note: string;
  frequency: number;
  color: THREE.Color;
  basePosition: THREE.Vector3;
  resonanceCount: number;
  glowIntensity: number;
  targetGlowIntensity: number;
  vibrationPhase: number;
  vibrationAmplitude: number;
  ringScale: number;
  ringOpacity: number;
  ringActive: boolean;
  cooldown: number;
}

interface ResonanceWave {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  direction: THREE.Vector3;
}

const CHIME_DATA = [
  { note: 'C4', frequency: 261.63, color: 0xFFD700 },
  { note: 'D4', frequency: 293.66, color: 0xFF8C42 },
  { note: 'E4', frequency: 329.63, color: 0xFF6B6B },
  { note: 'G4', frequency: 392.00, color: 0xC084FC },
  { note: 'A4', frequency: 440.00, color: 0x60A5FA },
  { note: 'C5', frequency: 523.25, color: 0x34D399 },
  { note: 'D5', frequency: 587.33, color: 0xF472B6 },
];

const CHIME_POSITIONS = [
  new THREE.Vector3(-4, 4, -12),
  new THREE.Vector3(3, 5.5, -5),
  new THREE.Vector3(-2, 3.5, 0),
  new THREE.Vector3(5, 6, 6),
  new THREE.Vector3(-5, 4.5, 10),
  new THREE.Vector3(2, 5, 16),
  new THREE.Vector3(-1, 3, 22),
];

export class WindChimeManager {
  private chimes: WindChime[] = [];
  private waves: ResonanceWave[] = [];
  private scene: THREE.Scene;
  private audioContext: AudioContext | null = null;
  private raycaster = new THREE.Raycaster();
  private infoCard: HTMLDivElement | null = null;
  private infoCardTimeout: number | null = null;
  private sensitivity: number = 1.0;
  private resonanceStrength: number = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createInfoCard();

    for (let i = 0; i < CHIME_DATA.length; i++) {
      this.createChime(i, CHIME_DATA[i], CHIME_POSITIONS[i]);
    }
  }

  private createInfoCard(): void {
    this.infoCard = document.createElement('div');
    this.infoCard.className = 'chime-info-card';
    this.infoCard.innerHTML = `
      <div class="card-title">风铃</div>
      <div class="card-row"><span class="card-label">音高</span><span class="card-value" data-field="note">-</span></div>
      <div class="card-row"><span class="card-label">频率</span><span class="card-value" data-field="freq">-</span></div>
      <div class="card-row"><span class="card-label">共鸣次数</span><span class="card-value" data-field="count">-</span></div>
    `;
    document.getElementById('app')!.appendChild(this.infoCard);
  }

  private createChime(index: number, data: typeof CHIME_DATA[0], position: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(position);

    const meshGeo = new THREE.IcosahedronGeometry(0.6, 1);
    const meshMat = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.color,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.6,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(meshGeo, meshMat);
    group.add(mesh);

    const glowLight = new THREE.PointLight(data.color, 0.5, 8, 2);
    glowLight.position.set(0, 0, 0);
    group.add(glowLight);

    const ringGeo = new THREE.TorusGeometry(0.8, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    this.scene.add(group);

    this.chimes.push({
      group,
      mesh,
      glowLight,
      ring,
      note: data.note,
      frequency: data.frequency,
      color: new THREE.Color(data.color),
      basePosition: position.clone(),
      resonanceCount: 0,
      glowIntensity: 0.3,
      targetGlowIntensity: 0.3,
      vibrationPhase: 0,
      vibrationAmplitude: 0,
      ringScale: 1,
      ringOpacity: 0,
      ringActive: false,
      cooldown: 0,
    });
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(frequency: number, intensity: number, isResonance: boolean): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    const duration = isResonance ? 2.5 : 1.2;
    const volume = isResonance ? 0.15 * this.resonanceStrength : 0.08 * intensity;

    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(volume, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const harmonics = isResonance
      ? [
          { mult: 1, amp: 1.0, type: 'sine' as OscillatorType },
          { mult: 2, amp: 0.5, type: 'sine' as OscillatorType },
          { mult: 3, amp: 0.25, type: 'sine' as OscillatorType },
          { mult: 4.2, amp: 0.12, type: 'sine' as OscillatorType },
        ]
      : [
          { mult: 1, amp: 1.0, type: 'sine' as OscillatorType },
          { mult: 2.0, amp: 0.35, type: 'sine' as OscillatorType },
          { mult: 3.0, amp: 0.15, type: 'sine' as OscillatorType },
        ];

    for (const h of harmonics) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = h.type;
      osc.frequency.value = frequency * h.mult;
      oscGain.gain.value = h.amp;
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    }
  }

  triggerChime(index: number, intensity: number): void {
    if (index < 0 || index >= this.chimes.length) return;
    const chime = this.chimes[index];

    if (chime.cooldown > 0) return;
    chime.cooldown = 1.5 / this.sensitivity;

    chime.targetGlowIntensity = 0.3 + intensity * 0.7;
    chime.ringActive = true;
    chime.ringScale = 1.0;
    chime.ringOpacity = 0.8;

    this.playTone(chime.frequency, intensity, false);
  }

  triggerResonance(index: number, strength: number): void {
    if (index < 0 || index >= this.chimes.length) return;
    const chime = this.chimes[index];

    chime.resonanceCount++;
    chime.vibrationAmplitude = 0.15 * strength;
    chime.vibrationPhase = 0;
    chime.targetGlowIntensity = 1.5 * strength;
    chime.ringActive = true;
    chime.ringScale = 1.0;
    chime.ringOpacity = 1.0;

    this.createResonanceWave(chime);

    this.playTone(chime.frequency, 1.0, true);

    this.showInfoCard(index);
  }

  private createResonanceWave(chime: WindChime): void {
    const waveGeo = new THREE.RingGeometry(0.5, 0.7, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: chime.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.position.copy(chime.basePosition);
    waveMesh.rotation.x = -Math.PI / 2;
    this.scene.add(waveMesh);

    this.waves.push({
      mesh: waveMesh,
      age: 0,
      maxAge: 2.0,
      direction: new THREE.Vector3(0, 1, 0),
    });
  }

  private showInfoCard(index: number): void {
    if (!this.infoCard) return;
    const chime = this.chimes[index];

    const noteEl = this.infoCard.querySelector('[data-field="note"]');
    const freqEl = this.infoCard.querySelector('[data-field="freq"]');
    const countEl = this.infoCard.querySelector('[data-field="count"]');
    const titleEl = this.infoCard.querySelector('.card-title');

    if (noteEl) noteEl.textContent = chime.note;
    if (freqEl) freqEl.textContent = chime.frequency.toFixed(2) + ' Hz';
    if (countEl) countEl.textContent = chime.resonanceCount.toString();
    if (titleEl) titleEl.textContent = `风铃 · ${chime.note}`;

    this.infoCard.classList.add('visible');

    if (this.infoCardTimeout) clearTimeout(this.infoCardTimeout);
    this.infoCardTimeout = window.setTimeout(() => {
      if (this.infoCard) this.infoCard.classList.remove('visible');
    }, 3000);
  }

  updateInfoCardPosition(camera: THREE.PerspectiveCamera): void {
    if (!this.infoCard || !this.infoCard.classList.contains('visible')) return;

    const activeChime = this.chimes.find(c => c.vibrationAmplitude > 0.01);
    if (!activeChime) return;

    const pos = activeChime.basePosition.clone();
    pos.y += 2;
    pos.project(camera);

    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

    this.infoCard.style.left = `${Math.min(x + 20, window.innerWidth - 200)}px`;
    this.infoCard.style.top = `${Math.max(y - 60, 10)}px`;
  }

  handleClick(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): number | null {
    this.raycaster.setFromCamera(mouse, camera);

    const meshes = this.chimes.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const index = this.chimes.findIndex(c => c.mesh === hitMesh);
      if (index >= 0) return index;
    }

    const groupMeshes: THREE.Object3D[] = [];
    for (const chime of this.chimes) {
      chime.group.traverse(child => {
        if (child instanceof THREE.Mesh) groupMeshes.push(child);
      });
    }

    const intersects2 = this.raycaster.intersectObjects(groupMeshes, false);
    if (intersects2.length > 0) {
      const hitObj = intersects2[0].object;
      for (let i = 0; i < this.chimes.length; i++) {
        let found = false;
        this.chimes[i].group.traverse(child => {
          if (child === hitObj) found = true;
        });
        if (found) return i;
      }
    }

    return null;
  }

  getPositions(): THREE.Vector3[] {
    return this.chimes.map(c => c.basePosition.clone());
  }

  setSensitivity(val: number): void {
    this.sensitivity = val;
  }

  setResonanceStrength(val: number): void {
    this.resonanceStrength = val;
  }

  update(delta: number, camera: THREE.PerspectiveCamera): void {
    for (const chime of this.chimes) {
      if (chime.cooldown > 0) {
        chime.cooldown -= delta;
      }

      chime.glowIntensity += (chime.targetGlowIntensity - chime.glowIntensity) * delta * 4;
      chime.targetGlowIntensity += (0.3 - chime.targetGlowIntensity) * delta * 2;

      const mat = chime.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = chime.glowIntensity;

      chime.glowLight.intensity = chime.glowIntensity * 1.5;
      chime.glowLight.distance = 6 + chime.glowIntensity * 4;

      if (chime.vibrationAmplitude > 0.005) {
        chime.vibrationPhase += delta * 30;
        const offset = Math.sin(chime.vibrationPhase) * chime.vibrationAmplitude;
        chime.mesh.position.x = offset;
        chime.mesh.position.y = Math.cos(chime.vibrationPhase * 1.3) * chime.vibrationAmplitude * 0.5;
        chime.vibrationAmplitude *= (1 - delta * 3);
      } else {
        chime.vibrationAmplitude = 0;
        chime.mesh.position.x = 0;
        chime.mesh.position.y = 0;
      }

      if (chime.ringActive) {
        chime.ringScale += delta * 4;
        chime.ringOpacity -= delta * 2;

        if (chime.ringOpacity <= 0) {
          chime.ringActive = false;
          chime.ringOpacity = 0;
          chime.ringScale = 1;
        }

        chime.ring.scale.setScalar(chime.ringScale);
        const ringMat = chime.ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = Math.max(0, chime.ringOpacity);
      }

      chime.mesh.rotation.y += delta * 0.3;
    }

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.age += delta;

      const t = wave.age / wave.maxAge;
      const scale = 1 + t * 15 * this.resonanceStrength;
      wave.mesh.scale.setScalar(scale);

      const waveMat = wave.mesh.material as THREE.MeshBasicMaterial;
      waveMat.opacity = Math.max(0, 0.5 * (1 - t));

      if (wave.age >= wave.maxAge) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        waveMat.dispose();
        this.waves.splice(i, 1);
      }
    }

    this.updateInfoCardPosition(camera);
  }

  dispose(): void {
    for (const chime of this.chimes) {
      chime.mesh.geometry.dispose();
      (chime.mesh.material as THREE.Material).dispose();
      chime.ring.geometry.dispose();
      (chime.ring.material as THREE.Material).dispose();
    }
    for (const wave of this.waves) {
      this.scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      (wave.mesh.material as THREE.Material).dispose();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.infoCard && this.infoCard.parentNode) {
      this.infoCard.parentNode.removeChild(this.infoCard);
    }
  }
}
