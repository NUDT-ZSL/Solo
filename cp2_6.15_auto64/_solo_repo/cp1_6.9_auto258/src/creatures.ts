import * as THREE from 'three';

interface CreatureParticle {
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  size: number;
  color: THREE.Color;
}

interface TrailParticle {
  position: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  color: THREE.Color;
}

enum CreatureState {
  IDLE,
  FLYING_TO_LIGHTHOUSE,
  CIRCLING,
  FLYING_BACK
}

export interface Creature {
  particles: CreatureParticle[];
  homePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  color: THREE.Color;
  pulsePhase: number;
  pulseSpeed: number;
  state: CreatureState;
  stateTime: number;
  triggered: boolean;
  brightBoost: number;
  bezierStart: THREE.Vector3;
  bezierEnd: THREE.Vector3;
  bezierControl: THREE.Vector3;
  circleAngle: number;
  circleRadius: number;
  circleCenter: THREE.Vector3;
  trail: TrailParticle[];
  trailTimer: number;
  index: number;
}

export class CreatureSystem {
  public group: THREE.Group;
  public creatures: Creature[] = [];
  public creatureMesh!: THREE.InstancedMesh;
  public trailMesh!: THREE.InstancedMesh;
  public totalCreatures: number;
  public maxCreatureParticles = 5;
  public baseTrailCount = 20;
  public reducedTrailCount = 10;
  public currentTrailCount = 20;
  private dummy = new THREE.Object3D();
  private tmpColor = new THREE.Color();

  constructor(totalCreatures = 100) {
    this.totalCreatures = totalCreatures;
    this.group = new THREE.Group();
    this.createCreatures();
    this.createMeshes();
  }

  private getCreatureColor(): THREE.Color {
    const palette = [
      { h: 0.65, s: 0.9, l: 0.6 },
      { h: 0.55, s: 0.85, l: 0.65 },
      { h: 0.92, s: 0.8, l: 0.65 },
      { h: 0.78, s: 0.85, l: 0.6 },
      { h: 0.5, s: 0.9, l: 0.6 }
    ];
    const p = palette[Math.floor(Math.random() * palette.length)];
    return new THREE.Color().setHSL(p.h, p.s, p.l);
  }

  private randomInCylinder(radius: number, height: number): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const y = (Math.random() - 0.5) * height;
    return new THREE.Vector3(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r
    );
  }

  private createCreatures() {
    for (let i = 0; i < this.totalCreatures; i++) {
      const home = this.randomInCylinder(8, 6);
      const color = this.getCreatureColor();
      const particleCount = 3 + Math.floor(Math.random() * 3);
      const particles: CreatureParticle[] = [];

      for (let j = 0; j < particleCount; j++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15
        );
        particles.push({
          position: home.clone().add(offset),
          basePosition: offset.clone(),
          size: THREE.MathUtils.lerp(0.04, 0.08, Math.random()),
          color: color.clone()
        });
      }

      this.creatures.push({
        particles,
        homePosition: home.clone(),
        currentPosition: home.clone(),
        color,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: THREE.MathUtils.lerp(1 / 3, 1, Math.random()),
        state: CreatureState.IDLE,
        stateTime: 0,
        triggered: false,
        brightBoost: 0,
        bezierStart: new THREE.Vector3(),
        bezierEnd: new THREE.Vector3(),
        bezierControl: new THREE.Vector3(),
        circleAngle: 0,
        circleRadius: 1.5,
        circleCenter: new THREE.Vector3(),
        trail: [],
        trailTimer: 0,
        index: i
      });
    }
  }

  private createMeshes() {
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const totalParticles = this.totalCreatures * this.maxCreatureParticles;
    this.creatureMesh = new THREE.InstancedMesh(geo, mat, totalParticles);
    this.creatureMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if ((this.creatureMesh as any).instanceColor) {
      (this.creatureMesh as any).instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.group.add(this.creatureMesh);

    const maxTrails = this.totalCreatures * this.baseTrailCount;
    const trailMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.trailMesh = new THREE.InstancedMesh(geo, trailMat, maxTrails);
    this.trailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.trailMesh);
  }

  public setBeamHitCreature(creature: Creature, lighthouseCenter: THREE.Vector3) {
    if (creature.state !== CreatureState.IDLE) return;

    creature.state = CreatureState.FLYING_TO_LIGHTHOUSE;
    creature.stateTime = 0;
    creature.triggered = true;
    creature.brightBoost = 1;

    creature.bezierStart.copy(creature.currentPosition);
    creature.circleCenter.copy(lighthouseCenter);
    creature.circleCenter.y = creature.currentPosition.y * 0.5 + lighthouseCenter.y * 0.5;

    const startAngle = Math.atan2(
      creature.currentPosition.z - creature.circleCenter.z,
      creature.currentPosition.x - creature.circleCenter.x
    );
    creature.circleAngle = startAngle;
    creature.circleRadius = 1.5;

    creature.bezierEnd.copy(creature.circleCenter).add(new THREE.Vector3(
      Math.cos(startAngle) * creature.circleRadius,
      0,
      Math.sin(startAngle) * creature.circleRadius
    ));

    creature.bezierControl.copy(creature.bezierStart).lerp(creature.bezierEnd, 0.5);
    const toCenter = creature.circleCenter.clone().sub(creature.bezierControl);
    creature.bezierControl.add(toCenter.normalize().multiplyScalar(2));

    for (let i = 0; i < creature.trail.length; i++) {
      creature.trail[i].age = 0.6;
    }
  }

  private bezierPoint(t: number, start: THREE.Vector3, ctrl: THREE.Vector3, end: THREE.Vector3): THREE.Vector3 {
    const mt = 1 - t;
    return new THREE.Vector3(
      mt * mt * start.x + 2 * mt * t * ctrl.x + t * t * end.x,
      mt * mt * start.y + 2 * mt * t * ctrl.y + t * t * end.y,
      mt * mt * start.z + 2 * mt * t * ctrl.z + t * t * end.z
    );
  }

  public update(delta: number, elapsed: number, beamInRangeCount: number) {
    this.currentTrailCount = beamInRangeCount > 50 ? this.reducedTrailCount : this.baseTrailCount;

    let instIndex = 0;
    let trailInstIndex = 0;

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      c.pulsePhase += delta * c.pulseSpeed * Math.PI * 2;

      if (c.brightBoost > 0 && c.state === CreatureState.IDLE) {
        c.brightBoost = Math.max(0, c.brightBoost - delta * 1.5);
      }

      switch (c.state) {
        case CreatureState.IDLE:
          c.currentPosition.lerp(c.homePosition, 0.02);
          c.currentPosition.x += Math.sin(elapsed * 0.5 + c.pulsePhase) * 0.003;
          c.currentPosition.z += Math.cos(elapsed * 0.4 + c.pulsePhase) * 0.003;
          break;

        case CreatureState.FLYING_TO_LIGHTHOUSE:
          c.stateTime += delta;
          const t1 = Math.min(1, c.stateTime / 0.8);
          c.currentPosition.copy(this.bezierPoint(t1, c.bezierStart, c.bezierControl, c.bezierEnd));
          if (t1 >= 1) {
            c.state = CreatureState.CIRCLING;
            c.stateTime = 0;
          }
          break;

        case CreatureState.CIRCLING:
          c.stateTime += delta;
          const circT = c.stateTime / 1.5;
          c.circleAngle += (Math.PI * 2 / 1.5) * delta;
          c.currentPosition.x = c.circleCenter.x + Math.cos(c.circleAngle) * c.circleRadius;
          c.currentPosition.z = c.circleCenter.z + Math.sin(c.circleAngle) * c.circleRadius;
          if (circT >= 1) {
            c.state = CreatureState.FLYING_BACK;
            c.stateTime = 0;
            c.bezierStart.copy(c.currentPosition);
            c.bezierEnd.copy(c.homePosition);
            c.bezierControl.copy(c.bezierStart).lerp(c.bezierEnd, 0.5);
            const awayFromCenter = c.bezierControl.clone().sub(c.circleCenter).normalize();
            c.bezierControl.add(awayFromCenter.multiplyScalar(2));
          }
          break;

        case CreatureState.FLYING_BACK:
          c.stateTime += delta;
          const t3 = Math.min(1, c.stateTime / 0.8);
          c.currentPosition.copy(this.bezierPoint(t3, c.bezierStart, c.bezierControl, c.bezierEnd));
          if (t3 >= 1) {
            c.state = CreatureState.IDLE;
            c.triggered = false;
          }
          break;
      }

      const basePulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(c.pulsePhase));
      const pulse = Math.min(1.5, basePulse + c.brightBoost);

      if (c.state !== CreatureState.IDLE) {
        c.trailTimer += delta;
        if (c.trailTimer >= 0.03 && c.trail.length < this.currentTrailCount) {
          c.trailTimer = 0;
          c.trail.push({
            position: c.currentPosition.clone(),
            age: 0,
            life: 0.6,
            size: 0.06,
            color: c.color.clone()
          });
        }
      }

      for (let ti = c.trail.length - 1; ti >= 0; ti--) {
        const tp = c.trail[ti];
        tp.age += delta;
        if (tp.age >= tp.life || ti >= this.currentTrailCount) {
          c.trail.splice(ti, 1);
          continue;
        }
        const trailAlpha = 1 - tp.age / tp.life;
        const s = tp.size * trailAlpha * 0.7;
        this.dummy.position.copy(tp.position);
        this.dummy.scale.setScalar(s);
        this.dummy.updateMatrix();
        this.trailMesh.setMatrixAt(trailInstIndex, this.dummy.matrix);
        this.tmpColor.copy(tp.color).multiplyScalar(0.7 * trailAlpha + 0.3);
        this.trailMesh.setColorAt(trailInstIndex, this.tmpColor);
        trailInstIndex++;
      }

      for (let p = 0; p < c.particles.length; p++) {
        const part = c.particles[p];
        const bp = part.basePosition;
        const jitterX = Math.sin(elapsed * 3 + c.pulsePhase + p * 1.1) * 0.02;
        const jitterY = Math.cos(elapsed * 2.5 + c.pulsePhase + p * 0.8) * 0.02;
        const jitterZ = Math.sin(elapsed * 2 + c.pulsePhase + p * 1.4) * 0.02;

        this.dummy.position.set(
          c.currentPosition.x + bp.x + jitterX,
          c.currentPosition.y + bp.y + jitterY,
          c.currentPosition.z + bp.z + jitterZ
        );
        const scale = part.size * (0.8 + 0.4 * pulse);
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();

        this.creatureMesh.setMatrixAt(instIndex, this.dummy.matrix);
        const brightness = 0.4 + 0.6 * pulse;
        this.tmpColor.copy(part.color).multiplyScalar(brightness);
        this.creatureMesh.setColorAt(instIndex, this.tmpColor);
        instIndex++;
      }
    }

    for (let i = instIndex; i < this.totalCreatures * this.maxCreatureParticles; i++) {
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.creatureMesh.setMatrixAt(i, this.dummy.matrix);
    }
    for (let i = trailInstIndex; i < this.trailMesh.count; i++) {
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.trailMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.creatureMesh.instanceMatrix.needsUpdate = true;
    if (this.creatureMesh.instanceColor) this.creatureMesh.instanceColor.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true;
    if (this.trailMesh.instanceColor) this.trailMesh.instanceColor.needsUpdate = true;
  }

  public getBeamHit(
    beamOrigin: THREE.Vector3,
    beamDirection: THREE.Vector3,
    beamOpenAngle: number,
    beamLength: number
  ): { hitCreatures: Creature[]; inRangeCount: number } {
    const hitCreatures: Creature[] = [];
    let inRangeCount = 0;
    const cosHalf = Math.cos(beamOpenAngle / 2);

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      const toCreature = c.currentPosition.clone().sub(beamOrigin);
      const dist = toCreature.length();

      if (dist <= beamLength) {
        inRangeCount++;
        const dot = toCreature.normalize().dot(beamDirection);
        if (dot >= cosHalf) {
          hitCreatures.push(c);
        }
      }
    }

    return { hitCreatures, inRangeCount };
  }
}
