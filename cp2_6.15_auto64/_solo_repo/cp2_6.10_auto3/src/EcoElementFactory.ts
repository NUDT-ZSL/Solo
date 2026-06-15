import * as THREE from 'three';

export type EcoElementType = 'tree' | 'rock' | 'water' | 'smallAnimal' | 'largeAnimal' | 'weather';

export interface EcoElementData {
  id: string;
  type: EcoElementType;
  group: THREE.Group;
  position: THREE.Vector3;
  update?: (delta: number, time: number, context: UpdateContext) => void;
  onPlaced?: () => void;
}

export interface UpdateContext {
  allElements: EcoElementData[];
  bottleRadius: number;
  mouseLightPos: THREE.Vector3;
}

export class EcoElementFactory {
  private scene: THREE.Scene;
  private bottleRadius: number;
  private particleCount = 0;
  private maxParticles = 2000;

  constructor(scene: THREE.Scene, bottleRadius: number) {
    this.scene = scene;
    this.bottleRadius = bottleRadius;
  }

  private genId(): string {
    return 'el_' + Math.random().toString(36).slice(2, 10);
  }

  public createElement(type: EcoElementType, position: THREE.Vector3): EcoElementData {
    const id = this.genId();
    const group = new THREE.Group();
    group.position.copy(position);

    let data: EcoElementData = { id, type, group, position: group.position };

    switch (type) {
      case 'tree':
        data = { ...data, ...this.buildTree(group) };
        break;
      case 'rock':
        data = { ...data, ...this.buildRock(group) };
        break;
      case 'water':
        data = { ...data, ...this.buildWater(group) };
        break;
      case 'smallAnimal':
        data = { ...data, ...this.buildSmallAnimal(group) };
        break;
      case 'largeAnimal':
        data = { ...data, ...this.buildLargeAnimal(group) };
        break;
      case 'weather':
        data = { ...data, ...this.buildWeatherCloud(group) };
        break;
    }

    this.scene.add(group);
    return data;
  }

  public removeElement(data: EcoElementData): void {
    this.scene.remove(data.group);
    data.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
  }

  private buildTree(group: THREE.Group): Partial<EcoElementData> {
    const trunkHeight = 0.6 + Math.random() * 0.3;
    const trunkRadius = 0.06 + Math.random() * 0.03;

    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2 - 0.02;
    trunk.castShadow = true;

    const branchCount = 3 + Math.floor(Math.random() * 2);
    const branches = new THREE.Group();

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const branchLen = 0.25 + Math.random() * 0.2;
      const branchGeo = new THREE.CylinderGeometry(0.025, 0.04, branchLen, 5);
      const branchMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1c });
      const branch = new THREE.Mesh(branchGeo, branchMat);

      const upAngle = 0.4 + Math.random() * 0.4;
      branch.position.set(
        Math.cos(angle) * 0.05,
        trunkHeight * (0.6 + Math.random() * 0.3),
        Math.sin(angle) * 0.05
      );
      branch.rotation.z = -upAngle;
      branch.rotation.y = angle;

      const leafCount = 12 + Math.floor(Math.random() * 8);
      const leafGeo = new THREE.BufferGeometry();
      const leafPositions = new Float32Array(leafCount * 3);
      const leafSizes = new Float32Array(leafCount);

      for (let j = 0; j < leafCount; j++) {
        const rx = (Math.random() - 0.5) * 0.2;
        const ry = (Math.random() - 0.5) * 0.15;
        const rz = (Math.random() - 0.5) * 0.2;
        leafPositions[j * 3] = rx + branchLen * 0.4;
        leafPositions[j * 3 + 1] = ry;
        leafPositions[j * 3 + 2] = rz;
        leafSizes[j] = 0.04 + Math.random() * 0.04;
      }
      leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPositions, 3));
      leafGeo.setAttribute('size', new THREE.BufferAttribute(leafSizes, 1));

      const leafMat = new THREE.PointsMaterial({
        color: 0x4caf50,
        size: 0.06,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const leaves = new THREE.Points(leafGeo, leafMat);
      leaves.userData = { type: 'leaves', phase: Math.random() * Math.PI * 2 };
      branch.add(leaves);

      branches.add(branch);
    }

    group.add(trunk, branches);

    group.scale.set(0, 0, 0);
    let growProgress = 0;
    const growDuration = 1.0;
    let isGrowing = true;

    const roots: {
      line: THREE.Line;
      flowParticles: THREE.Points;
      basePoints: THREE.Vector3[];
      targetWaterId: string;
      growth: number;
      flowOffset: number;
    }[] = [];

    const bezierPoint = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 => {
      const mt = 1 - t;
      return new THREE.Vector3(
        mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
      );
    };

    const createRootsToWater = (waterWorldPos: THREE.Vector3, waterId: string) => {
      const treeWorldPos = new THREE.Vector3();
      group.getWorldPosition(treeWorldPos);
      const waterLocal = waterWorldPos.clone().sub(treeWorldPos);

      for (let r = 0; r < 3; r++) {
        const startLocal = new THREE.Vector3(
          (Math.random() - 0.5) * 0.12,
          -0.01,
          (Math.random() - 0.5) * 0.12
        );

        const midControl = new THREE.Vector3(
          (startLocal.x + waterLocal.x) / 2 + (Math.random() - 0.5) * 0.4,
          Math.min(startLocal.y, waterLocal.y) - 0.15 - Math.random() * 0.2,
          (startLocal.z + waterLocal.z) / 2 + (Math.random() - 0.5) * 0.4
        );

        const steps = 32;
        const rootPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          rootPoints.push(bezierPoint(startLocal, midControl, waterLocal, t));
        }

        const rootGeo = new THREE.BufferGeometry().setFromPoints(rootPoints);
        const rootMat = new THREE.LineBasicMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0,
          linewidth: 2,
        });
        const line = new THREE.Line(rootGeo, rootMat);
        group.add(line);

        const flowParticleCount = 5;
        const flowGeo = new THREE.BufferGeometry();
        const flowPositions = new Float32Array(flowParticleCount * 3);
        const flowSizes = new Float32Array(flowParticleCount);
        for (let i = 0; i < flowParticleCount; i++) {
          flowPositions[i * 3] = startLocal.x;
          flowPositions[i * 3 + 1] = startLocal.y;
          flowPositions[i * 3 + 2] = startLocal.z;
          flowSizes[i] = 0.025 + Math.random() * 0.02;
        }
        flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3));
        flowGeo.setAttribute('size', new THREE.BufferAttribute(flowSizes, 1));
        const flowMat = new THREE.PointsMaterial({
          color: 0x81d4fa,
          size: 0.04,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });
        const flowParticles = new THREE.Points(flowGeo, flowMat);
        group.add(flowParticles);

        roots.push({
          line,
          flowParticles,
          basePoints: rootPoints,
          targetWaterId: waterId,
          growth: 0,
          flowOffset: r * 0.2,
        });
      }
    };

    let lastWaterCheck = 0;
    let hasRoots = false;

    const update = (delta: number, time: number, ctx: UpdateContext) => {
      if (isGrowing) {
        growProgress += delta / growDuration;
        if (growProgress >= 1) {
          growProgress = 1;
          isGrowing = false;
        }
        const s = growProgress;
        group.scale.set(s, s, s);
      }

      group.traverse((obj) => {
        if (obj instanceof THREE.Points && obj.userData.type === 'leaves') {
          const mat = obj.material as THREE.PointsMaterial;
          const phase = obj.userData.phase || 0;
          const pulse = 0.7 + 0.3 * Math.sin(time * 2 + phase);
          mat.opacity = 0.7 * pulse;
        }
      });

      if (!isGrowing) {
        lastWaterCheck += delta;
        if (lastWaterCheck > 0.5) {
          lastWaterCheck = 0;

          const existingWaterIds = new Set(roots.map(r => r.targetWaterId));

          for (const el of ctx.allElements) {
            if (el.type === 'water' && !existingWaterIds.has(el.id)) {
              const treeWorldPos = new THREE.Vector3();
              group.getWorldPosition(treeWorldPos);
              const waterWorldPos = new THREE.Vector3();
              el.group.getWorldPosition(waterWorldPos);
              const dist = treeWorldPos.distanceTo(waterWorldPos);
              if (dist < 2.0) {
                createRootsToWater(waterWorldPos, el.id);
                hasRoots = true;
              }
            }
          }
        }
      }

      for (let ri = 0; ri < roots.length; ri++) {
        const root = roots[ri];

        if (root.growth < 1) {
          root.growth += delta * 0.35;
          if (root.growth > 1) root.growth = 1;

          const showCount = Math.floor(root.basePoints.length * root.growth);
          root.line.geometry.setDrawRange(0, showCount);
          const lineMat = root.line.material as THREE.LineBasicMaterial;
          lineMat.opacity = 0.75 * root.growth;

          const flowMat = root.flowParticles.material as THREE.PointsMaterial;
          flowMat.opacity = 0.9 * root.growth;
        }

        if (root.growth >= 1) {
          const positions = root.line.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < root.basePoints.length; i++) {
            const wave = Math.sin(time * 2 + i * 0.15 + ri) * (i / root.basePoints.length) * 0.015;
            positions[i * 3] = root.basePoints[i].x + wave * 0.5;
            positions[i * 3 + 1] = root.basePoints[i].y + wave;
            positions[i * 3 + 2] = root.basePoints[i].z + wave * 0.5;
          }
          root.line.geometry.attributes.position.needsUpdate = true;

          const flowCount = 5;
          const flowPos = root.flowParticles.geometry.attributes.position.array as Float32Array;
          for (let fi = 0; fi < flowCount; fi++) {
            let t = (time * 0.4 + root.flowOffset + fi * 0.18) % 1;
            const pt = root.basePoints[Math.floor(t * (root.basePoints.length - 1))];
            if (pt) {
              flowPos[fi * 3] = pt.x + (Math.random() - 0.5) * 0.01;
              flowPos[fi * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.01;
              flowPos[fi * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.01;
            }
          }
          root.flowParticles.geometry.attributes.position.needsUpdate = true;
        }
      }
    };

    return { update };
  }

  private buildRock(group: THREE.Group): Partial<EcoElementData> {
    const radius = 0.15 + Math.random() * 0.15;
    const detail = 0;
    const rockGeo = new THREE.DodecahedronGeometry(radius, detail);

    const positions = rockGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const jitter = 0.85 + Math.random() * 0.3;
      positions[i] *= jitter;
      positions[i + 1] *= jitter * (0.7 + Math.random() * 0.3);
      positions[i + 2] *= jitter;
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = radius * 0.3;
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.rotation.z = (Math.random() - 0.5) * 0.3;
    rock.castShadow = true;

    group.add(rock);

    const update = (delta: number, time: number) => {
      rock.rotation.y += delta * 0.05;
    };

    return { update };
  }

  private buildWater(group: THREE.Group): Partial<EcoElementData> {
    const radius = 0.25 + Math.random() * 0.15;
    const height = 0.12 + Math.random() * 0.08;

    const waterGeo = new THREE.CylinderGeometry(radius, radius * 1.1, height, 24);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.3,
      clearcoat: 1,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = height / 2;
    water.receiveShadow = true;

    const rippleCount = 3;
    const ripples: THREE.Mesh[] = [];
    for (let i = 0; i < rippleCount; i++) {
      const rGeo = new THREE.RingGeometry(radius * 0.3 + i * 0.04, radius * 0.32 + i * 0.04, 24);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ripple = new THREE.Mesh(rGeo, rMat);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = height * 0.6 + i * 0.005;
      ripple.userData = { phase: (i / rippleCount) * Math.PI * 2 };
      ripples.push(ripple);
      group.add(ripple);
    }

    const glowGeo = new THREE.RingGeometry(radius * 0.9, radius * 1.15, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;

    group.add(water, glow);

    const update = (delta: number, time: number) => {
      water.scale.y = 1 + Math.sin(time * 1.5) * 0.05;
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        const phase = r.userData.phase;
        const s = 0.8 + 0.4 * Math.sin(time * 0.8 + phase);
        r.scale.set(s, s, 1);
        const mat = r.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 * (1 - Math.abs(Math.sin(time * 0.8 + phase)));
      }
    };

    return { update };
  }

  private buildSmallAnimal(group: THREE.Group): Partial<EcoElementData> {
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 0]);
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xffd54f,
      size: 0.13,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particle = new THREE.Points(particleGeo, particleMat);
    particle.position.y = 0;
    group.add(particle);

    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(20 * 3);
    for (let i = 0; i < 20; i++) {
      trailPositions[i * 3 + 1] = -10;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

    const trailMat = new THREE.PointsMaterial({
      color: 0xffd54f,
      size: 0.045,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    group.add(trail);

    let baseTargetX = (Math.random() - 0.5) * this.bottleRadius * 1.2;
    let baseTargetY = 0;
    let baseTargetZ = (Math.random() - 0.5) * this.bottleRadius * 1.2;
    let moveTimer = 0;
    const moveInterval = 2.0;
    let nearWaterTimer = 0;
    let isNearWater = false;
    let nearWaterRemaining = 0;
    let jumpPhase = 0;

    const trailHistory: THREE.Vector3[] = [];
    for (let i = 0; i < 20; i++) trailHistory.push(new THREE.Vector3(0, -10, 0));

    const clampToBottle = (x: number, z: number) => {
      const dist = Math.sqrt(x * x + z * z);
      const maxD = this.bottleRadius * 0.85;
      if (dist > maxD) {
        const s = maxD / dist;
        return { x: x * s, z: z * s };
      }
      return { x, z };
    };

    const update = (delta: number, time: number, ctx: UpdateContext) => {
      moveTimer += delta;
      if (moveTimer >= moveInterval) {
        moveTimer = 0;
        let nearestTarget: EcoElementData | null = null;
        let nearestDist = Infinity;
        for (const el of ctx.allElements) {
          if (el.type === 'tree' || el.type === 'water') {
            const d = el.position.distanceTo(group.position);
            if (d < nearestDist) {
              nearestDist = d;
              nearestTarget = el;
            }
          }
        }

        if (nearestTarget && Math.random() < 0.7) {
          const dir = nearestTarget.position.clone().sub(group.position).normalize();
          const dist = Math.min(nearestDist * 0.6, 0.9);
          baseTargetX = group.position.x + dir.x * dist + (Math.random() - 0.5) * 0.3;
          baseTargetZ = group.position.z + dir.z * dist + (Math.random() - 0.5) * 0.3;
          baseTargetY = 0;
        } else {
          baseTargetX = (Math.random() - 0.5) * this.bottleRadius * 1.2;
          baseTargetZ = (Math.random() - 0.5) * this.bottleRadius * 1.2;
          baseTargetY = 0;
        }

        const clamped = clampToBottle(baseTargetX, baseTargetZ);
        baseTargetX = clamped.x;
        baseTargetZ = clamped.z;
      }

      let nearWater = false;
      for (const el of ctx.allElements) {
        if (el.type === 'water') {
          const d = el.position.distanceTo(group.position);
          if (d < 0.55) {
            nearWater = true;
            break;
          }
        }
      }

      if (nearWater) {
        nearWaterTimer += delta;
        if (nearWaterTimer > 0.25) {
          isNearWater = true;
          nearWaterRemaining = 3.0;
        }
      } else {
        nearWaterTimer = 0;
      }

      if (nearWaterRemaining > 0) {
        nearWaterRemaining -= delta;
        if (nearWaterRemaining <= 0) {
          isNearWater = false;
        }
      }

      const targetColor = isNearWater ? 0x4fc3f7 : 0xffd54f;
      const pMat = particle.material as THREE.PointsMaterial;
      const tMat = trail.material as THREE.PointsMaterial;
      const currentColor = pMat.color.getHex();
      if (currentColor !== targetColor) {
        pMat.color.lerp(new THREE.Color(targetColor), delta * 6);
        tMat.color.lerp(new THREE.Color(targetColor), delta * 6);
      }

      const moveSpeed = isNearWater ? 1.2 : 0.85;
      group.position.x += (baseTargetX - group.position.x) * delta * moveSpeed;
      group.position.z += (baseTargetZ - group.position.z) * delta * moveSpeed;

      let baseY = 0;
      if (isNearWater) {
        jumpPhase += delta * 9;
        baseY = Math.abs(Math.sin(jumpPhase)) * 0.22;
        pMat.size = 0.13 + Math.sin(jumpPhase * 2) * 0.02;
      } else {
        jumpPhase = 0;
        pMat.size = 0.13;
      }
      particle.position.y = baseY;

      const worldParticlePos = new THREE.Vector3();
      particle.getWorldPosition(worldParticlePos);
      trailHistory.unshift(worldParticlePos.clone());
      if (trailHistory.length > 20) trailHistory.pop();

      const tp = trail.geometry.attributes.position.array as Float32Array;
      const groupWorldPos = new THREE.Vector3();
      group.getWorldPosition(groupWorldPos);
      for (let i = 0; i < 20; i++) {
        const local = trailHistory[i].clone().sub(groupWorldPos);
        tp[i * 3] = local.x;
        tp[i * 3 + 1] = local.y;
        tp[i * 3 + 2] = local.z;
      }
      trail.geometry.attributes.position.needsUpdate = true;
    };

    return { update };
  }

  private buildLargeAnimal(group: THREE.Group): Partial<EcoElementData> {
    const bodyGeo = new THREE.SphereGeometry(0.18, 12, 8);
    bodyGeo.scale(1, 0.6, 1.5);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.14;
    body.castShadow = true;

    const headGeo = new THREE.SphereGeometry(0.1, 10, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.19, 0.21);
    head.castShadow = true;

    const eyeGeo = new THREE.SphereGeometry(0.015, 6, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.035, 0.2, 0.28);
    eyeR.position.set(0.035, 0.2, 0.28);
    head.add(eyeL, eyeR);

    group.add(body, head);

    let currentAngle = Math.random() * Math.PI * 2;
    let targetAngle = currentAngle;
    const basePatrolRadius = this.bottleRadius * 0.62;
    let currentPatrolRadius = basePatrolRadius;
    let targetPatrolRadius = basePatrolRadius;
    let moveSpeed = 0.22;
    let avoidCooldown = 0;
    let patrolPhase = Math.random() * Math.PI * 2;

    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) trailPos[i * 3 + 1] = -10;
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));

    const trailMat = new THREE.PointsMaterial({
      color: 0xb17c54,
      size: 0.025,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    group.add(trail);

    const trailHistory: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) trailHistory.push(new THREE.Vector3(0, -10, 0));

    const getRockRadius = (rock: EcoElementData): number => {
      return 0.3;
    };

    const update = (delta: number, time: number, ctx: UpdateContext) => {
      avoidCooldown -= delta;
      patrolPhase += delta * 0.5;

      const rocks = ctx.allElements.filter(e => e.type === 'rock');

      let targetX = Math.cos(currentAngle) * currentPatrolRadius;
      let targetZ = Math.sin(currentAngle) * currentPatrolRadius;
      const currentPos = new THREE.Vector2(group.position.x, group.position.z);

      let collidingRock: EcoElementData | null = null;
      let minRockDist = Infinity;
      for (const rock of rocks) {
        const rockPos = new THREE.Vector2(rock.position.x, rock.position.z);
        const rockR = getRockRadius(rock);
        const dist = currentPos.distanceTo(rockPos);
        if (dist < rockR + 0.35 && dist < minRockDist) {
          minRockDist = dist;
          collidingRock = rock;
        }
      }

      if (collidingRock && avoidCooldown <= 0) {
        avoidCooldown = 0.8;
        const rockPos = new THREE.Vector2(collidingRock.position.x, collidingRock.position.z);
        const awayVec = currentPos.clone().sub(rockPos);
        if (awayVec.lengthSq() < 0.001) {
          awayVec.set(Math.random() - 0.5, Math.random() - 0.5).normalize();
        }
        awayVec.normalize();

        const toCenter = new THREE.Vector2(-group.position.x, -group.position.z).normalize();
        const tangent = new THREE.Vector2(-toCenter.y, toCenter.x);
        const crossDir = awayVec.dot(tangent) > 0 ? tangent : tangent.negate();

        targetX = group.position.x + (awayVec.x * 0.5 + crossDir.x * 0.5) * 0.6;
        targetZ = group.position.z + (awayVec.y * 0.5 + crossDir.y * 0.5) * 0.6;

        const targetDist = Math.sqrt(targetX * targetX + targetZ * targetZ);
        const maxD = this.bottleRadius * 0.82;
        if (targetDist > maxD) {
          const s = maxD / targetDist;
          targetX *= s;
          targetZ *= s;
        }
        targetAngle = Math.atan2(targetZ, targetX);
        targetPatrolRadius = Math.min(basePatrolRadius * 1.05, targetDist);
        moveSpeed = 0.5;
      } else if (avoidCooldown <= 0) {
        targetAngle += delta * 0.22;
        targetPatrolRadius = basePatrolRadius + Math.sin(patrolPhase) * 0.25;
        moveSpeed = 0.28;
        targetX = Math.cos(targetAngle) * targetPatrolRadius;
        targetZ = Math.sin(targetAngle) * targetPatrolRadius;
      }

      const angleDiff = targetAngle - currentAngle;
      let normalizedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      currentAngle += normalizedAngleDiff * delta * 3;
      currentPatrolRadius += (targetPatrolRadius - currentPatrolRadius) * delta * 2;

      const lerpFactor = Math.min(1, delta * moveSpeed);
      group.position.x += (targetX - group.position.x) * lerpFactor;
      group.position.z += (targetZ - group.position.z) * lerpFactor;

      const bodyBob = Math.sin(time * 3) * 0.015;
      body.position.y = 0.14 + bodyBob;
      head.position.y = 0.19 + bodyBob * 1.2;

      const facingAngle = currentAngle + Math.PI / 2;
      group.rotation.y = facingAngle;

      const worldFeetPos = new THREE.Vector3();
      const groupWorldPos = new THREE.Vector3();
      group.getWorldPosition(groupWorldPos);
      worldFeetPos.set(groupWorldPos.x, groupWorldPos.y, groupWorldPos.z);

      trailHistory.unshift(worldFeetPos.clone());
      if (trailHistory.length > 40) trailHistory.pop();

      const tp = trail.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 40; i++) {
        const local = trailHistory[i].clone().sub(groupWorldPos);
        tp[i * 3] = local.x + (Math.random() - 0.5) * 0.005;
        tp[i * 3 + 1] = local.y - 0.08 - i * 0.001;
        tp[i * 3 + 2] = local.z + (Math.random() - 0.5) * 0.005;
      }
      trail.geometry.attributes.position.needsUpdate = true;

      const trailFade = Math.min(1, delta * 10);
      trailMat.opacity = 0.35 * trailFade + 0.2 * (1 - trailFade);
    };

    return { update };
  }

  private buildWeatherCloud(group: THREE.Group): Partial<EcoElementData> {
    const cloudGroup = new THREE.Group();

    const puffCount = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < puffCount; i++) {
      const r = 0.12 + Math.random() * 0.08;
      const puffGeo = new THREE.SphereGeometry(r, 10, 8);
      const puffMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);
      puff.position.set(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      );
      cloudGroup.add(puff);
    }

    group.add(cloudGroup);
    group.position.y = this.bottleRadius * 0.5;

    let floatPhase = Math.random() * Math.PI * 2;

    const update = (delta: number, time: number) => {
      floatPhase += delta * 0.4;
      group.position.y = this.bottleRadius * 0.5 + Math.sin(floatPhase) * 0.05;
      cloudGroup.rotation.y += delta * 0.05;
    };

    return { update };
  }

  public getParticleBudget(): { used: number; max: number } {
    return { used: this.particleCount, max: this.maxParticles };
  }
}
