import * as THREE from 'three';
import {
  glowVertexShader,
  glowFragmentShader,
  trailVertexShader,
  trailFragmentShader,
  shockwaveVertexShader,
  shockwaveFragmentShader,
} from '../shaders/glowShader';

interface StarTrackData {
  curve: THREE.CatmullRomCurve3;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  particleOffset: number;
  particleCount: number;
  pulseTime: number;
  shockwaveInfluence: number;
  basePositions: Float32Array;
}

interface ShockwaveEffect {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  progress: number;
  startTime: number;
  duration: number;
}

export class StarField {
  private scene: THREE.Scene;
  private group: THREE.Group;

  private tracks: StarTrackData[] = [];

  private particleCount = 0;
  private particlesPerTrack = 80;
  private trackCount = 120;

  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private particlePoints: THREE.Points | null = null;

  private trailGeometry: THREE.BufferGeometry | null = null;
  private trailMaterial: THREE.ShaderMaterial | null = null;
  private trailLines: THREE.LineSegments | null = null;

  private dustGeometry: THREE.BufferGeometry | null = null;
  private dustMaterial: THREE.PointsMaterial | null = null;
  private dustPoints: THREE.Points | null = null;
  private dustCount = 2000;

  private shockwaves: ShockwaveEffect[] = [];

  private flowSpeed = 1.0;
  private showTrajectoryLines = false;
  private targetDensity = 120;

  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.generateTracks();
    this.createParticleSystem();
    this.createTrailLines();
    this.createDust();
  }

  private generateColorPair(): { start: THREE.Color; end: THREE.Color } {
    const t = Math.random();
    const start = new THREE.Color();
    const end = new THREE.Color();

    if (t < 0.5) {
      start.setHSL(0.08 + Math.random() * 0.05, 0.9, 0.65);
      end.setHSL(0.72 + Math.random() * 0.08, 0.7, 0.55);
    } else {
      start.setHSL(0.05 + Math.random() * 0.1, 0.85, 0.6);
      end.setHSL(0.75 + Math.random() * 0.1, 0.75, 0.5);
    }

    return { start, end };
  }

  private generateTrackCurve(): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];
    const segments = 6 + Math.floor(Math.random() * 4);

    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);

    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
      Math.cos(theta)
    );

    const length = 15 + Math.random() * 35;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const r = t * length;

      const wobbleX = Math.sin(t * Math.PI * 2 + Math.random() * 3) * (2 + Math.random() * 4);
      const wobbleY = Math.cos(t * Math.PI * 1.5 + Math.random() * 3) * (2 + Math.random() * 4);
      const wobbleZ = Math.sin(t * Math.PI * 2.5 + Math.random() * 3) * (2 + Math.random() * 4);

      const pos = dir.clone().multiplyScalar(r);
      pos.x += wobbleX * t;
      pos.y += wobbleY * t;
      pos.z += wobbleZ * t;

      points.push(pos);
    }

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  private generateTracks(): void {
    this.tracks = [];

    for (let i = 0; i < this.trackCount; i++) {
      const curve = this.generateTrackCurve();
      const colors = this.generateColorPair();
      const particleCount = this.particlesPerTrack;

      const basePositions = new Float32Array(particleCount * 3);
      for (let j = 0; j < particleCount; j++) {
        const t = j / particleCount;
        const point = curve.getPoint(t);
        basePositions[j * 3] = point.x;
        basePositions[j * 3 + 1] = point.y;
        basePositions[j * 3 + 2] = point.z;
      }

      this.tracks.push({
        curve,
        colorStart: colors.start,
        colorEnd: colors.end,
        particleOffset: 0,
        particleCount,
        pulseTime: 0,
        shockwaveInfluence: 0,
        basePositions,
      });
    }

    this.particleCount = this.tracks.reduce((sum, t) => sum + t.particleCount, 0);

    let offset = 0;
    for (const track of this.tracks) {
      track.particleOffset = offset;
      offset += track.particleCount;
    }
  }

  private createParticleSystem(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const alphas = new Float32Array(this.particleCount);

    for (const track of this.tracks) {
      for (let i = 0; i < track.particleCount; i++) {
        const idx = (track.particleOffset + i) * 3;
        const t = i / track.particleCount;

        positions[idx] = track.basePositions[i * 3];
        positions[idx + 1] = track.basePositions[i * 3 + 1];
        positions[idx + 2] = track.basePositions[i * 3 + 2];

        const color = new THREE.Color().lerpColors(track.colorStart, track.colorEnd, t);
        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;

        sizes[track.particleOffset + i] = 3.0 + Math.random() * 5.0;
        alphas[track.particleOffset + i] = 0.8 + Math.random() * 0.2;
      }
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uScale: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particlePoints);
  }

  private createTrailLines(): void {
    const linePoints: number[] = [];
    const lineColors: number[] = [];
    const lineAlphas: number[] = [];
    const segmentsPerTrack = 50;

    for (const track of this.tracks) {
      for (let i = 0; i < segmentsPerTrack; i++) {
        const t1 = i / segmentsPerTrack;
        const t2 = (i + 1) / segmentsPerTrack;

        const p1 = track.curve.getPoint(t1);
        const p2 = track.curve.getPoint(t2);

        linePoints.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);

        const c1 = new THREE.Color().lerpColors(track.colorStart, track.colorEnd, t1);
        const c2 = new THREE.Color().lerpColors(track.colorStart, track.colorEnd, t2);

        lineColors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        lineAlphas.push(t1 * 0.5 + 0.1, t2 * 0.5 + 0.1);
      }
    }

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
    this.trailGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(lineColors, 3));
    this.trailGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(lineAlphas, 1));

    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailLines.visible = this.showTrajectoryLines;
    this.group.add(this.trailLines);
  }

  private createDust(): void {
    const positions = new Float32Array(this.dustCount * 3);
    const colors = new Float32Array(this.dustCount * 3);

    for (let i = 0; i < this.dustCount; i++) {
      const r = 5 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const hue = 0.6 + Math.random() * 0.3;
      const color = new THREE.Color().setHSL(hue, 0.3, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.dustMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.dustPoints = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.group.add(this.dustPoints);
  }

  update(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.updateParticles(elapsed, delta);
    this.updateDust(elapsed);
    this.updateShockwaves(delta);
    this.updateTrackPulses(delta);
  }

  private updateParticles(elapsed: number, _delta: number): void {
    if (!this.particleGeometry) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;

    for (const track of this.tracks) {
      const speedMultiplier = 1 + track.pulseTime * 3 + track.shockwaveInfluence * 2;

      for (let i = 0; i < track.particleCount; i++) {
        const idx = (track.particleOffset + i) * 3;
        const baseT = i / track.particleCount;

        let t = (baseT + elapsed * 0.03 * this.flowSpeed * speedMultiplier) % 1;
        if (t < 0) t += 1;

        const point = track.curve.getPoint(t);

        positions[idx] = point.x;
        positions[idx + 1] = point.y;
        positions[idx + 2] = point.z;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
  }

  private updateDust(elapsed: number): void {
    if (!this.dustGeometry) return;

    const positions = this.dustGeometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.dustCount; i++) {
      const idx = i * 3;
      positions[idx] += Math.sin(elapsed * 0.1 + i) * 0.002;
      positions[idx + 1] += Math.cos(elapsed * 0.08 + i * 0.7) * 0.002;
      positions[idx + 2] += Math.sin(elapsed * 0.12 + i * 1.3) * 0.002;
    }

    this.dustGeometry.attributes.position.needsUpdate = true;
  }

  private updateShockwaves(delta: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.progress += delta / sw.duration;

      (sw.mesh.material as THREE.ShaderMaterial).uniforms.uProgress.value = sw.progress;

      const scale = 1 + sw.progress * 40;
      sw.mesh.scale.set(scale, scale, scale);

      if (sw.progress >= 1) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.ShaderMaterial).dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    for (const track of this.tracks) {
      if (track.shockwaveInfluence > 0) {
        track.shockwaveInfluence *= 0.96;
        if (track.shockwaveInfluence < 0.01) track.shockwaveInfluence = 0;
      }
    }
  }

  private updateTrackPulses(delta: number): void {
    for (const track of this.tracks) {
      if (track.pulseTime > 0) {
        track.pulseTime -= delta * 0.8;
        if (track.pulseTime < 0) track.pulseTime = 0;
      }
    }
  }

  triggerPulse(trackIndex: number): void {
    if (trackIndex >= 0 && trackIndex < this.tracks.length) {
      this.tracks[trackIndex].pulseTime = 1.0;
    }
  }

  createShockwave(origin: THREE.Vector3): void {
    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const material = new THREE.ShaderMaterial({
      vertexShader: shockwaveVertexShader,
      fragmentShader: shockwaveFragmentShader,
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0.6, 0.3, 1.0) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(origin);
    mesh.lookAt(origin.clone().add(new THREE.Vector3(0, 0, 1)));

    const effect: ShockwaveEffect = {
      mesh,
      origin: origin.clone(),
      progress: 0,
      startTime: performance.now(),
      duration: 3.0,
    };

    this.shockwaves.push(effect);
    this.scene.add(mesh);

    for (const track of this.tracks) {
      const midPoint = track.curve.getPoint(0.5);
      const dist = midPoint.distanceTo(origin);
      if (dist < 30) {
        track.shockwaveInfluence = Math.max(track.shockwaveInfluence, 1 - dist / 30);
      }
    }
  }

  getTrackAtMouse(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): number {
    this.raycaster.setFromCamera(mouse, camera);
    this.raycaster.params.Points = { threshold: 2 };

    if (!this.particlePoints) return -1;

    const intersects = this.raycaster.intersectObject(this.particlePoints);
    if (intersects.length === 0) return -1;

    const idx = intersects[0].index!;

    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      if (idx >= track.particleOffset && idx < track.particleOffset + track.particleCount) {
        return i;
      }
    }

    return -1;
  }

  setFlowSpeed(speed: number): void {
    this.flowSpeed = speed;
  }

  setShowTrajectoryLines(show: boolean): void {
    this.showTrajectoryLines = show;
    if (this.trailLines) {
      this.trailLines.visible = show;
    }
  }

  setTrackDensity(density: number): void {
    this.targetDensity = density;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();
    this.trailGeometry?.dispose();
    this.trailMaterial?.dispose();
    this.dustGeometry?.dispose();
    this.dustMaterial?.dispose();

    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      (sw.mesh.material as THREE.ShaderMaterial).dispose();
    }

    this.scene.remove(this.group);
  }
}
