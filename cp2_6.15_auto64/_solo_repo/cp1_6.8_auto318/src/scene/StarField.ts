import * as THREE from 'three';
import {
  starVertexShader,
  starFragmentShader,
} from '../shaders/glowShader';

const MAX_ORBITS = 300;
const PARTICLES_PER_ORBIT = 30;
const TRAIL_LENGTH = 5;
const STREAMS_PER_ORBIT = PARTICLES_PER_ORBIT / TRAIL_LENGTH;
const DUST_COUNT = 2000;
const MAX_SCATTER = 600;
const CURVE_SAMPLES = 120;

const WARM_GOLD = new THREE.Color(1.0, 0.84, 0.0);
const COOL_PURPLE = new THREE.Color(0.58, 0.0, 0.83);

interface OrbitData {
  sampledPositions: Float32Array;
  color: THREE.Color;
  speedMultiplier: number;
  displacement: THREE.Vector3;
  displacementVel: THREE.Vector3;
  curve: THREE.CatmullRomCurve3;
}

interface ShockwaveState {
  center: THREE.Vector3;
  radius: number;
  maxRadius: number;
  age: number;
  duration: number;
  ring: THREE.Mesh;
  active: boolean;
}

interface ScatterPart {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  col: THREE.Color;
  active: boolean;
}

export class StarField {
  readonly group: THREE.Group;

  private orbits: OrbitData[] = [];
  private activeCount = 150;

  private posArr!: Float32Array;
  private sizeArr!: Float32Array;
  private alphaArr!: Float32Array;
  private colorArr!: Float32Array;
  private trailArr!: Float32Array;
  private baseTs!: Float32Array;
  private orbitIdx!: Int16Array;
  private particleGeo!: THREE.BufferGeometry;
  private particleMat!: THREE.ShaderMaterial;
  private particlePts!: THREE.Points;

  private trajGroup: THREE.Group;
  private trajLines: THREE.Line[] = [];
  private showTrajLines = false;

  private dustGeo!: THREE.BufferGeometry;
  private dustVel!: Float32Array;
  private dustPts!: THREE.Points;

  private scatterGeo!: THREE.BufferGeometry;
  private scatterParts: ScatterPart[] = [];
  private scatterPosArr!: Float32Array;
  private scatterSizeArr!: Float32Array;
  private scatterAlphaArr!: Float32Array;
  private scatterColorArr!: Float32Array;
  private scatterPts!: THREE.Points;

  private shockwaves: ShockwaveState[] = [];

  flowSpeed = 1.0;
  orbitDensity = 1.0;
  private time = 0;

  constructor(private scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.trajGroup = new THREE.Group();
    this.trajGroup.visible = false;
    this.group.add(this.trajGroup);

    this.generateOrbits();
    this.buildParticles();
    this.buildDust();
    this.buildScatter();
    this.buildTrajLines();
    this.applyDensity();
  }

  private generateOrbits() {
    this.orbits = [];
    for (let i = 0; i < MAX_ORBITS; i++) {
      const phi = (i / MAX_ORBITS) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const theta = Math.acos(2 * Math.random() - 1);

      const pts: THREE.Vector3[] = [];
      const nPts = 5 + Math.floor(Math.random() * 3);
      const maxR = 15 + Math.random() * 35;

      for (let j = 0; j < nPts; j++) {
        const t = j / (nPts - 1);
        const r = t * maxR;
        const angOff = t * (Math.random() - 0.5) * Math.PI * 0.8;
        const elOff = t * (Math.random() - 0.5) * Math.PI * 0.5;
        const a = phi + angOff;
        const e = theta + elOff;

        pts.push(
          new THREE.Vector3(
            r * Math.sin(e) * Math.cos(a),
            r * Math.cos(e) * 0.6,
            r * Math.sin(e) * Math.sin(a),
          ),
        );
      }

      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      const sampled = new Float32Array(CURVE_SAMPLES * 3);
      for (let s = 0; s < CURVE_SAMPLES; s++) {
        const p = curve.getPoint(s / (CURVE_SAMPLES - 1));
        sampled[s * 3] = p.x;
        sampled[s * 3 + 1] = p.y;
        sampled[s * 3 + 2] = p.z;
      }

      const t01 = i / MAX_ORBITS + (Math.random() - 0.5) * 0.15;
      const col = new THREE.Color().copy(WARM_GOLD).lerp(COOL_PURPLE, Math.max(0, Math.min(1, t01)));

      this.orbits.push({
        sampledPositions: sampled,
        color: col,
        speedMultiplier: 1.0,
        displacement: new THREE.Vector3(),
        displacementVel: new THREE.Vector3(),
        curve,
      });
    }
  }

  private sampleCurve(orbit: OrbitData, t: number, out: THREE.Vector3) {
    const ct = ((t % 1) + 1) % 1;
    const fi = ct * (CURVE_SAMPLES - 1);
    const i0 = Math.floor(fi);
    const i1 = Math.min(i0 + 1, CURVE_SAMPLES - 1);
    const f = fi - i0;
    const s = orbit.sampledPositions;
    out.set(
      s[i0 * 3] + (s[i1 * 3] - s[i0 * 3]) * f,
      s[i0 * 3 + 1] + (s[i1 * 3 + 1] - s[i0 * 3 + 1]) * f,
      s[i0 * 3 + 2] + (s[i1 * 3 + 2] - s[i0 * 3 + 2]) * f,
    );
    out.add(orbit.displacement);
  }

  private buildParticles() {
    const total = MAX_ORBITS * PARTICLES_PER_ORBIT;
    this.posArr = new Float32Array(total * 3);
    this.sizeArr = new Float32Array(total);
    this.alphaArr = new Float32Array(total);
    this.colorArr = new Float32Array(total * 3);
    this.trailArr = new Float32Array(total);
    this.baseTs = new Float32Array(total);
    this.orbitIdx = new Int16Array(total);

    for (let oi = 0; oi < MAX_ORBITS; oi++) {
      const orbit = this.orbits[oi];
      const c = orbit.color;
      for (let si = 0; si < STREAMS_PER_ORBIT; si++) {
        for (let ti = 0; ti < TRAIL_LENGTH; ti++) {
          const idx = oi * PARTICLES_PER_ORBIT + si * TRAIL_LENGTH + ti;
          const baseT = si / STREAMS_PER_ORBIT;
          this.baseTs[idx] = baseT - ti * 0.012;
          this.orbitIdx[idx] = oi;

          const fade = 1.0 - (ti / TRAIL_LENGTH) * 0.85;
          this.alphaArr[idx] = fade;
          this.sizeArr[idx] = (1.5 - ti * 0.2) * (0.6 + Math.random() * 0.4);
          this.trailArr[idx] = ti / (TRAIL_LENGTH - 1);

          this.colorArr[idx * 3] = c.r;
          this.colorArr[idx * 3 + 1] = c.g;
          this.colorArr[idx * 3 + 2] = c.b;
        }
      }
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.particleGeo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArr, 1));
    this.particleGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaArr, 1));
    this.particleGeo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArr, 3));
    this.particleGeo.setAttribute('aTrailFactor', new THREE.BufferAttribute(this.trailArr, 1));

    this.particleMat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particlePts = new THREE.Points(this.particleGeo, this.particleMat);
    this.group.add(this.particlePts);
  }

  private buildDust() {
    const pos = new Float32Array(DUST_COUNT * 3);
    this.dustVel = new Float32Array(DUST_COUNT * 3);
    const sizes = new Float32Array(DUST_COUNT);
    const cols = new Float32Array(DUST_COUNT * 3);

    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;

      this.dustVel[i * 3] = (Math.random() - 0.5) * 0.3;
      this.dustVel[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      this.dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      sizes[i] = 0.15 + Math.random() * 0.25;

      const bri = 0.3 + Math.random() * 0.4;
      cols[i * 3] = bri * 0.9;
      cols[i * 3 + 1] = bri * 0.85;
      cols[i * 3 + 2] = bri;
    }

    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.dustGeo.setAttribute('aColor', new THREE.BufferAttribute(cols, 3));
    this.dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(DUST_COUNT).fill(0.25), 1));
    this.dustGeo.setAttribute('aTrailFactor', new THREE.BufferAttribute(new Float32Array(DUST_COUNT).fill(0), 1));

    const dustMat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.dustPts = new THREE.Points(this.dustGeo, dustMat);
    this.group.add(this.dustPts);
  }

  private buildScatter() {
    this.scatterPosArr = new Float32Array(MAX_SCATTER * 3);
    this.scatterSizeArr = new Float32Array(MAX_SCATTER);
    this.scatterAlphaArr = new Float32Array(MAX_SCATTER);
    this.scatterColorArr = new Float32Array(MAX_SCATTER * 3);

    this.scatterGeo = new THREE.BufferGeometry();
    this.scatterGeo.setAttribute('position', new THREE.BufferAttribute(this.scatterPosArr, 3));
    this.scatterGeo.setAttribute('aSize', new THREE.BufferAttribute(this.scatterSizeArr, 1));
    this.scatterGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.scatterAlphaArr, 1));
    this.scatterGeo.setAttribute('aColor', new THREE.BufferAttribute(this.scatterColorArr, 3));
    this.scatterGeo.setAttribute('aTrailFactor', new THREE.BufferAttribute(new Float32Array(MAX_SCATTER).fill(0.5), 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.scatterPts = new THREE.Points(this.scatterGeo, mat);
    this.group.add(this.scatterPts);

    for (let i = 0; i < MAX_SCATTER; i++) {
      this.scatterParts.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        col: new THREE.Color(),
        active: false,
      });
    }
  }

  private buildTrajLines() {
    this.trajLines = [];
    for (let i = 0; i < MAX_ORBITS; i++) {
      const orbit = this.orbits[i];
      const pts = orbit.curve.getPoints(60);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: orbit.color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      this.trajLines.push(line);
      this.trajGroup.add(line);
    }
  }

  private applyDensity() {
    this.activeCount = Math.round(MAX_ORBITS * Math.max(0.2, Math.min(1.0, this.orbitDensity)));
    const drawCount = this.activeCount * PARTICLES_PER_ORBIT;
    this.particleGeo.setDrawRange(0, drawCount);

    for (let i = 0; i < MAX_ORBITS; i++) {
      this.trajLines[i].visible = i < this.activeCount && this.showTrajLines;
    }
  }

  update(dt: number) {
    this.time += dt;
    this.updateParticles(dt);
    this.updateDust(dt);
    this.updateScatter(dt);
    this.updateShockwaves(dt);
    this.updateOrbitDisplacement(dt);

    this.group.rotation.y += dt * 0.02;

    this.particleMat.uniforms.uTime.value = this.time;
  }

  private updateParticles(_dt: number) {
    const posAttr = this.particleGeo.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = this.particleGeo.getAttribute('aAlpha') as THREE.BufferAttribute;

    const tmpVec = new THREE.Vector3();
    const drawCount = this.activeCount * PARTICLES_PER_ORBIT;

    for (let idx = 0; idx < drawCount; idx++) {
      const oi = this.orbitIdx[idx];
      if (oi >= this.activeCount) continue;

      const orbit = this.orbits[oi];
      const t = this.baseTs[idx] + this.time * this.flowSpeed * orbit.speedMultiplier * 0.08;
      this.sampleCurve(orbit, t, tmpVec);

      this.posArr[idx * 3] = tmpVec.x;
      this.posArr[idx * 3 + 1] = tmpVec.y;
      this.posArr[idx * 3 + 2] = tmpVec.z;

      const trailIdx = idx % TRAIL_LENGTH;
      const fade = 1.0 - (trailIdx / TRAIL_LENGTH) * 0.85;
      const pulseBoost = orbit.speedMultiplier > 1.2 ? (orbit.speedMultiplier - 1.0) * 0.3 : 0;
      this.alphaArr[idx] = fade + pulseBoost;
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  private updateDust(dt: number) {
    const posAttr = this.dustGeo.getAttribute('position') as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;

    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3] += this.dustVel[i * 3] * dt;
      pos[i * 3 + 1] += this.dustVel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.dustVel[i * 3 + 2] * dt;

      if (Math.abs(pos[i * 3]) > 60) this.dustVel[i * 3] *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 40) this.dustVel[i * 3 + 1] *= -1;
      if (Math.abs(pos[i * 3 + 2]) > 60) this.dustVel[i * 3 + 2] *= -1;
    }
    posAttr.needsUpdate = true;
  }

  private updateScatter(dt: number) {
    const posAttr = this.scatterGeo.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = this.scatterGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
    const sizeAttr = this.scatterGeo.getAttribute('aSize') as THREE.BufferAttribute;

    for (let i = 0; i < MAX_SCATTER; i++) {
      const sp = this.scatterParts[i];
      if (!sp.active) {
        this.scatterAlphaArr[i] = 0;
        this.scatterSizeArr[i] = 0;
        continue;
      }

      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        this.scatterAlphaArr[i] = 0;
        this.scatterSizeArr[i] = 0;
        continue;
      }

      const progress = sp.life / sp.maxLife;
      sp.pos.addScaledVector(sp.vel, dt);
      sp.vel.multiplyScalar(0.97);

      this.scatterPosArr[i * 3] = sp.pos.x;
      this.scatterPosArr[i * 3 + 1] = sp.pos.y;
      this.scatterPosArr[i * 3 + 2] = sp.pos.z;
      this.scatterAlphaArr[i] = (1.0 - progress) * 0.9;
      this.scatterSizeArr[i] = (1.0 - progress * 0.5) * 1.2;
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private updateShockwaves(dt: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      sw.radius = (sw.age / sw.duration) * sw.maxRadius;

      const progress = sw.age / sw.duration;
      (sw.ring.material as THREE.ShaderMaterial).uniforms.uProgress.value = progress;
      (sw.ring.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1.0 - progress;

      const scale = sw.radius;
      sw.ring.scale.set(scale, scale, scale);

      if (sw.age >= sw.duration) {
        this.group.remove(sw.ring);
        sw.ring.geometry.dispose();
        (sw.ring.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateOrbitDisplacement(dt: number) {
    for (let i = 0; i < this.activeCount; i++) {
      const orbit = this.orbits[i];

      orbit.displacement.addScaledVector(orbit.displacementVel, dt);
      orbit.displacementVel.addScaledVector(orbit.displacement, -2.0 * dt);
      orbit.displacementVel.multiplyScalar(1.0 - 1.5 * dt);
      orbit.displacement.multiplyScalar(1.0 - 0.8 * dt);

      if (orbit.speedMultiplier > 1.01) {
        orbit.speedMultiplier += (1.0 - orbit.speedMultiplier) * dt * 2.0;
        if (orbit.speedMultiplier < 1.02) orbit.speedMultiplier = 1.0;
      }
    }
  }

  triggerPulse(orbitIndex: number) {
    if (orbitIndex < 0 || orbitIndex >= this.activeCount) return;
    const orbit = this.orbits[orbitIndex];
    orbit.speedMultiplier = 5.0;

    const tmpVec = new THREE.Vector3();
    for (let s = 0; s < 25; s++) {
      const t = Math.random();
      this.sampleCurve(orbit, t, tmpVec);

      const dir = tmpVec.clone().normalize();
      if (dir.lengthSq() < 0.001) dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

      const sp = this.scatterParts.find((p) => !p.active);
      if (!sp) continue;

      sp.pos.copy(tmpVec);
      sp.vel.copy(dir).multiplyScalar(2.0 + Math.random() * 3.0);
      sp.vel.x += (Math.random() - 0.5) * 2;
      sp.vel.y += (Math.random() - 0.5) * 2;
      sp.vel.z += (Math.random() - 0.5) * 2;
      sp.life = 0;
      sp.maxLife = 1.0 + Math.random() * 1.0;
      sp.col.copy(orbit.color);
      sp.active = true;
    }

    for (let j = 0; j < MAX_SCATTER; j++) {
      if (this.scatterParts[j].active) {
        const c = this.scatterParts[j].col;
        this.scatterColorArr[j * 3] = c.r;
        this.scatterColorArr[j * 3 + 1] = c.g;
        this.scatterColorArr[j * 3 + 2] = c.b;
      }
    }
    (this.scatterGeo.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
  }

  triggerShockwave(worldPos: THREE.Vector3) {
    const geo = new THREE.RingGeometry(0.8, 1.0, 64);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float alpha = uOpacity * 0.6;
          vec3 col = mix(vec3(1.0, 0.84, 0.0), vec3(0.58, 0.0, 0.83), uProgress);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: {
        uProgress: { value: 0 },
        uOpacity: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(worldPos);
    ring.lookAt(worldPos.clone().add(new THREE.Vector3(0, 1, 0)));
    this.group.add(ring);

    this.shockwaves.push({
      center: worldPos.clone(),
      radius: 0,
      maxRadius: 40,
      age: 0,
      duration: 3.0,
      ring,
      active: true,
    });

    for (let i = 0; i < this.activeCount; i++) {
      const orbit = this.orbits[i];
      const mid = new THREE.Vector3();
      this.sampleCurve(orbit, 0.5, mid);
      const diff = mid.clone().sub(worldPos);
      const dist = diff.length();
      if (dist < 40) {
        const force = (1.0 - dist / 40) * 5.0;
        orbit.displacementVel.add(diff.normalize().multiplyScalar(force));
        orbit.speedMultiplier = Math.max(orbit.speedMultiplier, 1.0 + force * 0.5);
      }
    }
  }

  raycastOrbit(ndcX: number, ndcY: number, camera: THREE.Camera): number {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const ray = raycaster.ray;
    let bestDist = 2.0;
    let bestOrbit = -1;

    const tmpVec = new THREE.Vector3();
    const closestOnRay = new THREE.Vector3();

    for (let oi = 0; oi < this.activeCount; oi++) {
      const orbit = this.orbits[oi];
      for (let s = 0; s < CURVE_SAMPLES; s += 4) {
        tmpVec.set(
          orbit.sampledPositions[s * 3] + orbit.displacement.x,
          orbit.sampledPositions[s * 3 + 1] + orbit.displacement.y,
          orbit.sampledPositions[s * 3 + 2] + orbit.displacement.z,
        );
        ray.closestPointToPoint(tmpVec, closestOnRay);
        const d = tmpVec.distanceTo(closestOnRay);
        if (d < bestDist) {
          bestDist = d;
          bestOrbit = oi;
        }
      }
    }

    return bestOrbit;
  }

  setFlowSpeed(speed: number) {
    this.flowSpeed = speed;
  }

  setOrbitDensity(density: number) {
    this.orbitDensity = density;
    this.applyDensity();
  }

  setShowTrajectoryLines(show: boolean) {
    this.showTrajLines = show;
    this.trajGroup.visible = show;
    for (let i = 0; i < this.activeCount; i++) {
      this.trajLines[i].visible = show;
    }
  }

  getWorldPosition(ndcX: number, ndcY: number, camera: THREE.Camera): THREE.Vector3 {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const target = new THREE.Vector3();
    raycaster.ray.at(40, target);
    return target;
  }

  onResize(pixelRatio: number) {
    const pr = Math.min(pixelRatio, 2);
    this.particleMat.uniforms.uPixelRatio.value = pr;
    (this.dustPts.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pr;
    (this.scatterPts.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pr;
  }

  dispose() {
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.dustGeo.dispose();
    (this.dustPts.material as THREE.Material).dispose();
    this.scatterGeo.dispose();
    (this.scatterPts.material as THREE.Material).dispose();
    for (const sw of this.shockwaves) {
      sw.ring.geometry.dispose();
      (sw.ring.material as THREE.Material).dispose();
    }
    for (const line of this.trajLines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.scene.remove(this.group);
  }
}
